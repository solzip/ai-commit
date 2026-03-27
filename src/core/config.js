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
  claudeModel: 'claude-sonnet-4-20250514',
  openaiModel: 'gpt-4o-mini',
  timeout: 30000,
};

export function loadConfig() {
  // 환경변수 우선
  const envOverrides = {};
  if (process.env.AI_COMMIT_CLAUDE_KEY) {
    envOverrides.claudeApiKey = process.env.AI_COMMIT_CLAUDE_KEY;
  }
  if (process.env.AI_COMMIT_OPENAI_KEY) {
    envOverrides.openaiApiKey = process.env.AI_COMMIT_OPENAI_KEY;
  }

  try {
    const raw = readFileSync(CONFIG_PATH, 'utf-8');
    const fileConfig = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...fileConfig, ...envOverrides };
  } catch {
    return { ...DEFAULT_CONFIG, ...envOverrides };
  }
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
  const current = loadConfig();

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
