import { readFileSync, writeFileSync, chmodSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import inquirer from 'inquirer';
import chalk from 'chalk';

const CONFIG_PATH = join(homedir(), '.ai-commit.json');

const DEFAULT_CONFIG = {
  provider: 'claude',
  language: 'en',
  conventionalCommit: true,
  gitmoji: false,
  maxSuggestions: 3,
  claudeModel: 'claude-sonnet-5',
  openaiModel: 'gpt-4o-mini',
  timeout: 30000,
};

function readFileConfig() {
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function readEnvKeys() {
  const keys = {};
  if (process.env.AI_COMMIT_CLAUDE_KEY) {
    keys.claudeApiKey = process.env.AI_COMMIT_CLAUDE_KEY;
  }
  if (process.env.AI_COMMIT_OPENAI_KEY) {
    keys.openaiApiKey = process.env.AI_COMMIT_OPENAI_KEY;
  }
  return keys;
}

/**
 * 실행에 사용할 설정. 환경변수 키가 파일 설정을 덮어쓴다.
 * 이 결과는 절대 saveConfig()로 넘기지 않는다 — 환경변수 키가 디스크에 남는다.
 */
export function loadConfig() {
  return { ...DEFAULT_CONFIG, ...readFileConfig(), ...readEnvKeys() };
}

export function saveConfig(config) {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  try {
    chmodSync(CONFIG_PATH, 0o600);
  } catch {
    // Windows에서는 chmod가 제한적일 수 있음
  }
}

function maskKey(key) {
  if (!key || key.length < 8) return '***';
  return key.slice(0, 6) + '***...' + key.slice(-3);
}

export async function runConfigWizard() {
  // 환경변수 키는 의도적으로 제외한다. loadConfig()를 쓰면 환경변수로만
  // 주입한 키가 answers에 섞여 들어가 설정 파일에 평문으로 기록된다.
  const current = { ...DEFAULT_CONFIG, ...readFileConfig() };

  const envKeys = readEnvKeys();
  for (const field of Object.keys(envKeys)) {
    const envVar = field === 'claudeApiKey' ? 'AI_COMMIT_CLAUDE_KEY' : 'AI_COMMIT_OPENAI_KEY';
    console.log(
      chalk.dim(`ℹ️  ${envVar} is set — it overrides the config file and will not be saved to disk.`)
    );
  }

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'provider',
      message: 'Default AI provider:',
      choices: ['claude', 'openai'],
      default: current.provider,
    },
    {
      type: 'password',
      name: 'claudeApiKey',
      message: current.claudeApiKey
        ? `Claude API key (current: ${maskKey(current.claudeApiKey)}, press Enter to keep):`
        : 'Claude API key (press Enter to skip):',
      when: (ans) => ans.provider === 'claude' || current.claudeApiKey,
    },
    {
      type: 'password',
      name: 'openaiApiKey',
      message: current.openaiApiKey
        ? `OpenAI API key (current: ${maskKey(current.openaiApiKey)}, press Enter to keep):`
        : 'OpenAI API key (press Enter to skip):',
      when: (ans) => ans.provider === 'openai' || current.openaiApiKey,
    },
    {
      type: 'list',
      name: 'language',
      message: 'Default language:',
      choices: [
        { name: 'English', value: 'en' },
        { name: '한국어', value: 'ko' },
      ],
      default: current.language,
    },
    {
      type: 'confirm',
      name: 'conventionalCommit',
      message: 'Use Conventional Commits?',
      default: current.conventionalCommit,
    },
    {
      type: 'confirm',
      name: 'gitmoji',
      message: 'Use Gitmoji? (✨ 🐛 ♻️ ...)',
      default: current.gitmoji,
    },
  ]);

  // 빈 값이면 기존 키 유지
  if (!answers.claudeApiKey && current.claudeApiKey) {
    answers.claudeApiKey = current.claudeApiKey;
  }
  if (!answers.openaiApiKey && current.openaiApiKey) {
    answers.openaiApiKey = current.openaiApiKey;
  }
  // 빈 문자열 키는 저장하지 않음
  if (!answers.claudeApiKey) delete answers.claudeApiKey;
  if (!answers.openaiApiKey) delete answers.openaiApiKey;

  // 선택한 provider의 키가 없으면 경고
  const selectedKey = `${answers.provider}ApiKey`;
  if (!answers[selectedKey]) {
    console.log(chalk.yellow(`\n⚠️  No API key set for ${answers.provider}. You'll need to set one before using aicommit.`));
  }

  const newConfig = {
    ...current,
    ...answers,
  };

  saveConfig(newConfig);
  console.log(chalk.green(`\n✅ Config saved to ${CONFIG_PATH}`));
}
