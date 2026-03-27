#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig, runConfigWizard } from '../src/core/config.js';
import { isGitRepo, getStagedDiff, getStagedFiles, execCommit } from '../src/core/git.js';
import { buildPrompt, truncateDiff } from '../src/core/prompt.js';
import { registerBuiltInProviders, getProvider } from '../src/providers/registry.js';

registerBuiltInProviders();

const program = new Command();

program
  .name('aicommit')
  .description('AI-powered git commit message generator')
  .version('1.0.0')
  .option('--provider <name>', 'AI provider (claude, openai)')
  .option('--lang <code>', 'Language (en, ko)')
  .option('--gitmoji', 'Add gitmoji to commit messages')
  .action(run);

program
  .command('config')
  .description('Configure API keys and preferences')
  .action(runConfigWizard);

program.parse();

async function run(opts) {
  // 1. git repo 확인
  if (!isGitRepo()) {
    console.error(chalk.red('❌ Not a git repository'));
    process.exit(1);
  }

  // 2. staged changes 확인
  let diff;
  try {
    diff = getStagedDiff();
  } catch {
    console.error(chalk.red('❌ Failed to read git diff'));
    process.exit(1);
  }

  if (!diff) {
    console.error(chalk.red("❌ No staged changes. Run 'git add' first"));
    process.exit(1);
  }

  // 2-1. staged 파일 목록 표시
  const stagedFiles = getStagedFiles();
  console.log(chalk.dim(`\nStaged files:\n${stagedFiles.split('\n').map(f => `  ${f}`).join('\n')}\n`));

  // 3. config 로드
  const config = loadConfig();
  const providerName = opts.provider || config.provider;
  const language = opts.lang || config.language;
  const apiKeyField = `${providerName}ApiKey`;
  const apiKey = config[apiKeyField];

  if (!apiKey) {
    console.log(chalk.yellow(`\n⚠️  API key not configured for ${providerName}.`));
    const { runSetup } = await inquirer.prompt([
      { type: 'confirm', name: 'runSetup', message: 'Run setup now?', default: true },
    ]);
    if (runSetup) {
      await runConfigWizard();
      return run(opts);
    }
    process.exit(1);
  }

  // 4. provider 가져오기
  let provider;
  try {
    provider = getProvider(providerName, apiKey, config);
  } catch (err) {
    console.error(chalk.red(`❌ ${err.message}`));
    process.exit(1);
  }

  // 5. diff truncate
  const { diff: processedDiff, truncated } = truncateDiff(diff, provider.maxDiffLength);
  if (truncated) {
    console.log(chalk.yellow('⚠️  Diff truncated (too large for AI context)'));
  }

  // 6. 프롬프트 생성 + AI 호출
  const options = {
    language,
    conventionalCommit: config.conventionalCommit,
    gitmoji: opts.gitmoji || config.gitmoji || false,
    maxSuggestions: config.maxSuggestions,
  };

  await generateAndSelect(provider, processedDiff, options);
}

async function generateAndSelect(provider, diff, options) {
  let messages = await callAI(provider, diff, options);
  if (!messages) return;

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

async function callAI(provider, diff, options, isRetry = false) {
  const spinner = ora('Analyzing staged changes...').start();

  try {
    const prompt = buildPrompt(diff, options);
    const messages = await provider.generateCommitMessages(prompt, options);

    if (!messages) {
      if (!isRetry) {
        spinner.text = 'Retrying...';
        const retryMessages = await provider.generateCommitMessages(prompt, options);
        if (retryMessages) {
          spinner.succeed('Analysis complete');
          return retryMessages;
        }
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
