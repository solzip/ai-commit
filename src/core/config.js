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
      message: 'Select AI provider:',
      choices: ['claude', 'openai'],
      default: current.provider,
    },
    {
      type: 'password',
      name: 'claudeApiKey',
      message: `Enter Claude API key${current.claudeApiKey ? ` (current: ${maskKey(current.claudeApiKey)})` : ''}:`,
      when: (ans) => ans.provider === 'claude',
      validate: (val) => val.length > 0 || 'API key is required',
    },
    {
      type: 'password',
      name: 'openaiApiKey',
      message: `Enter OpenAI API key${current.openaiApiKey ? ` (current: ${maskKey(current.openaiApiKey)})` : ''}:`,
      when: (ans) => ans.provider === 'openai',
      validate: (val) => val.length > 0 || 'API key is required',
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

  const newConfig = {
    ...current,
    ...answers,
  };

  saveConfig(newConfig);
  console.log(chalk.green(`\n✅ Config saved to ${CONFIG_PATH}`));
}
