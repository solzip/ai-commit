#!/usr/bin/env node

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig, runConfigWizard } from '../src/core/config.js';
import { isGitRepo, getStagedDiff, getStagedFiles, execCommit } from '../src/core/git.js';
import { buildPrompt, truncateDiff } from '../src/core/prompt.js';
import {
  registerBuiltInProviders,
  getProvider,
  getAvailableProviders,
} from '../src/providers/registry.js';

registerBuiltInProviders();

// package.json을 단일 출처로 삼는다 (버전 문자열 이중 관리 방지)
const pkg = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json'), 'utf-8')
);

const LANGUAGES = ['en', 'ko'];

/** 프롬프트를 띄울 수 있는 환경인가 (CI, 파이프, 훅에서는 불가) */
function isInteractive() {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

function failNonInteractive(reason, hints) {
  console.error(chalk.red(`❌ ${reason}`));
  console.error(chalk.dim('   Not running in an interactive terminal, so aicommit cannot prompt.'));
  for (const hint of hints) console.error(chalk.dim(`   ${hint}`));
  process.exit(1);
}

const program = new Command();

program
  .name('aicommit')
  .description('AI-powered git commit message generator')
  .version(pkg.version)
  .option('--provider <name>', `AI provider (${getAvailableProviders().join(', ')})`)
  .option('--lang <code>', `Language (${LANGUAGES.join(', ')})`)
  .option('--gitmoji', 'Add gitmoji to commit messages')
  .option('--no-gitmoji', 'Disable gitmoji even if enabled in config')
  .option('-y, --yes', 'Commit the first suggestion without prompting')
  .action(run);

program
  .command('config')
  .description('Configure API keys and preferences')
  .action(() => {
    if (!isInteractive()) {
      failNonInteractive('Cannot run the setup wizard.', [
        'Set AI_COMMIT_CLAUDE_KEY or AI_COMMIT_OPENAI_KEY instead.',
      ]);
    }
    return runConfigWizard();
  });

program.parse();

async function run(opts) {
  // 1. git repo 확인
  if (!isGitRepo()) {
    console.error(chalk.red('❌ Not a git repository'));
    process.exit(1);
  }

  // 2. config 로드 + 옵션 검증 (API 호출이나 프롬프트보다 먼저)
  const config = loadConfig();
  const providerName = opts.provider || config.provider;
  const language = opts.lang || config.language;

  if (!getAvailableProviders().includes(providerName)) {
    console.error(
      chalk.red(
        `❌ Unknown provider: ${providerName}. Available: ${getAvailableProviders().join(', ')}`
      )
    );
    process.exit(1);
  }

  if (!LANGUAGES.includes(language)) {
    console.error(chalk.red(`❌ Unknown language: ${language}. Available: ${LANGUAGES.join(', ')}`));
    process.exit(1);
  }

  // 3. staged changes 확인
  let diff;
  try {
    diff = getStagedDiff();
  } catch (err) {
    console.error(chalk.red('❌ Failed to read git diff'));
    console.error(chalk.dim(`   ${err.message}`));
    process.exit(1);
  }

  if (!diff) {
    console.error(chalk.red("❌ No staged changes. Run 'git add' first"));
    process.exit(1);
  }

  // 3-1. staged 파일 목록 표시
  const stagedFiles = getStagedFiles();
  console.log(chalk.dim(`\nStaged files:\n${stagedFiles.split('\n').map(f => `  ${f}`).join('\n')}\n`));

  // 4. API 키 확인
  const apiKey = config[`${providerName}ApiKey`];

  if (!apiKey) {
    const envVar = `AI_COMMIT_${providerName.toUpperCase()}_KEY`;
    if (!isInteractive()) {
      failNonInteractive(`API key not configured for ${providerName}.`, [
        `Set ${envVar}, or run 'aicommit config' in a terminal.`,
      ]);
    }
    console.log(chalk.yellow(`\n⚠️  API key not configured for ${providerName}.`));
    const { runSetup } = await inquirer.prompt([
      { type: 'confirm', name: 'runSetup', message: 'Run setup now?', default: true },
    ]);
    if (!runSetup) process.exit(1);
    await runConfigWizard();

    // 마법사를 마쳤는데도 키가 없으면 재귀가 무한히 돈다.
    if (!loadConfig()[`${providerName}ApiKey`]) {
      console.error(chalk.red(`❌ Still no API key for ${providerName}. Aborting`));
      process.exit(1);
    }
    return run(opts);
  }

  // 5. provider 인스턴스 생성
  const provider = getProvider(providerName, apiKey, config);

  // 6. diff truncate
  const { diff: processedDiff, truncated } = truncateDiff(diff, provider.maxDiffLength);
  if (truncated) {
    console.log(chalk.yellow('⚠️  Diff truncated (too large for AI context)'));
  }

  // 7. 프롬프트 생성 + AI 호출
  const options = {
    language,
    conventionalCommit: config.conventionalCommit,
    // --gitmoji / --no-gitmoji 를 주지 않으면 undefined 이므로 config로 넘어간다.
    // ||를 쓰면 --no-gitmoji(false)가 config 값에 덮여 무시된다.
    gitmoji: opts.gitmoji ?? config.gitmoji ?? false,
    maxSuggestions: config.maxSuggestions,
  };

  await generateAndSelect(provider, processedDiff, options, opts.yes);
}

async function generateAndSelect(provider, diff, options, autoAccept) {
  let messages = await callAI(provider, diff, options);
  if (!messages) return;

  // --yes 또는 비대화형: 첫 제안을 그대로 커밋한다.
  if (autoAccept || !isInteractive()) {
    if (!autoAccept) {
      console.log(chalk.dim('Non-interactive terminal — using the first suggestion (--yes).'));
    }
    console.log(chalk.bold('\n📝 Suggested commit messages:\n'));
    messages.forEach((msg, i) => console.log(`  ${chalk.cyan(i + 1 + '.')} ${msg}`));
    console.log();
    await doCommit(messages[0]);
    return;
  }

  while (true) {
    const result = await promptUser(messages);
    if (result === '__regen__') {
      messages = await callAI(provider, diff, options);
      if (!messages) return;
      continue;
    }
    break;
  }
}

async function callAI(provider, diff, options) {
  const spinner = ora('Analyzing staged changes...').start();

  try {
    const prompt = buildPrompt(diff, options);
    const messages = await provider.generateCommitMessages(prompt, options);

    // 파싱 실패는 모델이 형식을 어긴 경우라 한 번은 다시 물어볼 가치가 있다.
    if (!messages) {
      spinner.text = 'Retrying...';
      const retryMessages = await provider.generateCommitMessages(prompt, options);
      if (retryMessages) {
        spinner.succeed('Analysis complete');
        return retryMessages;
      }
      spinner.fail('Failed to parse AI response after retry');
      process.exit(1);
    }

    spinner.succeed('Analysis complete');
    return messages;
  } catch (err) {
    const msg = err.message;
    if (msg.includes('Network') || msg.includes('fetch') || msg.includes('timed out')) {
      spinner.fail('❌ Network error. Check your connection');
    } else {
      spinner.fail(msg.startsWith('❌') ? msg : `❌ ${msg}`);
    }
    if (msg.includes('Invalid API key')) {
      console.log(chalk.yellow(`\n💡 Run 'aicommit config' to update your API key`));
    }
    process.exit(1);
  }
}

async function promptUser(messages) {
  console.log(chalk.bold('\n📝 Suggested commit messages:\n'));
  messages.forEach((msg, i) => {
    console.log(`  ${chalk.cyan(i + 1 + '.')} ${msg}`);
  });
  console.log();

  const choices = [
    ...messages.map((msg, i) => ({ name: `${i + 1}. ${msg}`, value: msg })),
    new inquirer.Separator(),
    { name: '✏️  Edit message', value: '__edit__' },
    { name: '🔄 Regenerate', value: '__regen__' },
    { name: '❌ Cancel', value: '__cancel__' },
  ];

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Select a message:',
      choices,
    },
  ]);

  if (action === '__cancel__') {
    console.log(chalk.gray('Cancelled'));
    return;
  }

  if (action === '__regen__') {
    return '__regen__';
  }

  if (action === '__edit__') {
    const { edited } = await inquirer.prompt([
      {
        type: 'input',
        name: 'edited',
        message: 'Enter commit message:',
        default: messages[0],
      },
    ]);
    await doCommit(edited);
    return;
  }

  await doCommit(action);
}

async function doCommit(message) {
  try {
    execCommit(message);
    console.log(chalk.green(`\n✅ Committed: ${message}`));
    console.log(chalk.dim(`   Undo: git reset --soft HEAD~1 | Amend: git commit --amend`));
  } catch (err) {
    console.error(chalk.red(`❌ Commit failed: ${err.message}`));
    process.exit(1);
  }
}
