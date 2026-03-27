# aicommit

[한국어](./README.ko.md)

AI-powered git commit message generator CLI.

Analyzes your staged changes and suggests [Conventional Commit](https://www.conventionalcommits.org/) messages using Claude or OpenAI. Supports [Gitmoji](https://gitmoji.dev/), multiple languages, and interactive selection.

## Quick Start

No need to clone this repo. Just run these commands in **your own git project**:

```bash
# 1. Stage your changes
git add .

# 2. Let AI generate your commit message
npx aicommit
```

On first run, you'll be prompted to set up your API key automatically.

## Demo

```
$ npx aicommit

Staged files:
  src/auth/login.js
  src/auth/token.js

✔ Analysis complete

📝 Suggested commit messages:

  1. feat(auth): add JWT token refresh endpoint
  2. feat: implement token refresh logic with Redis cache
  3. feat(auth): add automatic JWT refresh with 7-day expiry

? Select a message: (Use arrow keys)
❯ 1. feat(auth): add JWT token refresh endpoint
  2. feat: implement token refresh logic with Redis cache
  3. feat(auth): add automatic JWT refresh with 7-day expiry
  ──────────────
  ✏️  Edit message
  🔄 Regenerate
  ❌ Cancel

✅ Committed: feat(auth): add JWT token refresh endpoint
   Undo: git reset --soft HEAD~1 | Amend: git commit --amend
```

With `--gitmoji`:

```
📝 Suggested commit messages:

  1. ✨ feat(auth): add JWT token refresh endpoint
  2. 🐛 fix(api): resolve timeout issue on token refresh
  3. ♻️ refactor: simplify auth middleware chain
```

## Features

- **Multi-provider** — Claude and OpenAI, switchable via `--provider` or config
- **Conventional Commits** — Standard format (`feat`, `fix`, `refactor`, ...) enabled by default
- **Gitmoji** — Optional emoji prefixes (`--gitmoji`) for ✨ 🐛 ♻️ and more
- **Multilingual** — English and Korean commit messages (`--lang ko`)
- **Interactive** — Select, edit, or regenerate suggestions in a loop
- **Zero config start** — Works with `npx`, auto-prompts setup on first run
- **Staged file preview** — Shows which files will be committed before AI analysis
- **Configurable models** — Change AI models without touching code
- **Request timeout** — 30-second fetch timeout prevents hanging on slow networks
- **Safe commit UX** — Shows undo/amend commands after every commit

## Install

```bash
# Option 1: Use directly with npx (no install needed)
npx aicommit

# Option 2: Install globally for faster access
npm install -g aicommit
```

**Requirements:** Node.js >= 18

### For Contributors

```bash
git clone https://github.com/solzip/ai-commit.git
cd ai-commit
npm install
node bin/ai-commit.js --help
```

## Usage

### Basic Commands

```bash
aicommit                      # Generate commit messages (default provider)
aicommit --provider openai    # Use OpenAI instead of Claude
aicommit --lang ko            # Korean commit messages
aicommit --gitmoji            # Add gitmoji prefixes (✨ 🐛 ♻️)
aicommit config               # Interactive setup (API keys, preferences)
```

### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--provider <name>` | AI provider (`claude` or `openai`) | `claude` |
| `--lang <code>` | Commit message language (`en` or `ko`) | `en` |
| `--gitmoji` | Add gitmoji emoji prefixes | `false` |
| `-V, --version` | Show version number | — |
| `-h, --help` | Show help | — |

### Commit Message Formats

The format depends on your `conventionalCommit` and `gitmoji` settings:

| conventionalCommit | gitmoji | Format | Example |
|:------------------:|:-------:|--------|---------|
| true | false | `<type>(<scope>): <description>` | `feat(auth): add login endpoint` |
| true | true | `<emoji> <type>(<scope>): <description>` | `✨ feat(auth): add login endpoint` |
| false | true | `<emoji> <description>` | `✨ add login endpoint` |
| false | false | Free-form | `add login endpoint` |

### Gitmoji Reference

| Emoji | Type | Meaning |
|:-----:|------|---------|
| ✨ | feat | New feature |
| 🐛 | fix | Bug fix |
| ♻️ | refactor | Refactor |
| 📝 | docs | Documentation |
| 💄 | style | UI/style |
| ✅ | test | Tests |
| 🔧 | chore | Config/tooling |
| ⚡ | perf | Performance |
| 👷 | ci | CI/CD |
| 📦 | build | Build system |
| 🔥 | remove | Remove code/files |
| 🚀 | deploy | Deploy |
| 🔒 | security | Security fix |
| ⬆️ | upgrade | Upgrade dependency |
| 🎨 | format | Code formatting |

## Configuration

### Interactive Setup

```bash
aicommit config
```

Walks you through:
1. Default AI provider (Claude / OpenAI)
2. API key for the selected provider (Enter to keep existing key)
3. Default language (English / Korean)
4. Conventional Commits on/off
5. Gitmoji on/off

### Config File

All settings are stored in `~/.ai-commit.json`:

```json
{
  "provider": "claude",
  "claudeApiKey": "sk-ant-...",
  "openaiApiKey": "sk-...",
  "language": "en",
  "conventionalCommit": true,
  "gitmoji": false,
  "maxSuggestions": 3,
  "claudeModel": "claude-sonnet-4-20250514",
  "openaiModel": "gpt-4o-mini",
  "timeout": 30000
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `provider` | string | `"claude"` | Default AI provider |
| `claudeApiKey` | string | — | Claude API key |
| `openaiApiKey` | string | — | OpenAI API key |
| `language` | string | `"en"` | Commit message language (`en`, `ko`) |
| `conventionalCommit` | boolean | `true` | Use Conventional Commits format |
| `gitmoji` | boolean | `false` | Add gitmoji prefixes |
| `maxSuggestions` | number | `3` | Number of suggestions to generate |
| `claudeModel` | string | `"claude-sonnet-4-20250514"` | Claude model to use |
| `openaiModel` | string | `"gpt-4o-mini"` | OpenAI model to use |
| `timeout` | number | `30000` | API request timeout in milliseconds |

### Environment Variables

API keys can be set via environment variables (takes priority over config file):

```bash
export AI_COMMIT_CLAUDE_KEY=sk-ant-...
export AI_COMMIT_OPENAI_KEY=sk-...
```

This is useful for CI/CD environments or shared machines where you don't want a config file.

### Config Priority

```
CLI options (--provider, --lang, --gitmoji)
  ↓ overrides
Environment variables (AI_COMMIT_CLAUDE_KEY, AI_COMMIT_OPENAI_KEY)
  ↓ overrides
Config file (~/.ai-commit.json)
  ↓ overrides
Default values
```

## Supported Providers

| Provider | Default Model | Max Diff | API |
|----------|---------------|----------|-----|
| Claude | claude-sonnet-4-20250514 | ~15,000 chars | [Anthropic Messages API](https://docs.anthropic.com/en/docs/about-claude/models) |
| OpenAI | gpt-4o-mini | ~12,000 chars | [OpenAI Chat Completions](https://platform.openai.com/docs/models) |

Models can be changed in `~/.ai-commit.json` via `claudeModel` and `openaiModel` without modifying any code.

## Adding a Provider

Adding a new AI provider (e.g., Gemini) requires 3 steps:

**Step 1.** Create `src/providers/gemini.js`:

```js
import { AIProvider } from './AIProvider.js';
import { parseAIResponse } from './parse.js';

export class GeminiProvider extends AIProvider {
  constructor(apiKey, config = {}) {
    super('gemini', apiKey, 12000);
    this.model = config.geminiModel || 'gemini-pro';
    this.timeout = config.timeout || 30000;
  }

  async generateCommitMessages(prompt, options) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch('https://generativelanguage.googleapis.com/...', {
        // ... your API call
        signal: controller.signal,
      });
      // ... parse response
      return parseAIResponse(text, options.maxSuggestions);
    } finally {
      clearTimeout(timer);
    }
  }
}
```

**Step 2.** Register in `src/providers/registry.js`:

```js
import { GeminiProvider } from './gemini.js';
registerProvider('gemini', GeminiProvider);
```

**Step 3.** Add `geminiApiKey` in config wizard (`src/core/config.js`)

## How It Works

```
git diff --staged
    → Show staged file list
    → truncateDiff() (if too large)
    → buildPrompt(diff, {lang, format, gitmoji})
    → provider.generateCommitMessages(prompt)
    → parseAIResponse() (JSON → newline fallback → retry)
    → Inquirer (select / edit / regenerate loop)
    → git commit -m "selected message"
    → Show undo/amend hint
```

### Detailed Flow

1. **Check environment** — Verify git repo, read staged diff, show staged file list
2. **Load config** — Merge defaults < config file < env vars < CLI options
3. **Auto setup** — If API key missing, prompt to run config wizard immediately
4. **Truncate diff** — If diff exceeds provider's limit, include stat summary + partial diff
5. **Build prompt** — Combine diff with language, format (conventional/gitmoji), and suggestion count
6. **Call AI** — Send to provider with 30s timeout. On parse failure, auto-retry once
7. **Interactive selection** — Choose a message, edit it, or regenerate (loop until commit or cancel)
8. **Commit** — Run `git commit -m "message"` and show undo commands

### Error Handling

| Error | Message | Recovery |
|-------|---------|----------|
| Not a git repo | `Not a git repository` | Exit |
| No staged changes | `No staged changes. Run 'git add' first` | Exit |
| No API key | `API key not configured for {provider}` | Auto-prompt config wizard |
| Unknown provider | `Unknown provider: {name}. Available: claude, openai` | Exit |
| Invalid API key (401) | `Invalid API key for {provider}` | Suggest `aicommit config` |
| Rate limited (429) | `Rate limited. Please try again later` | Exit |
| Server error (5xx) | `{provider} API error ({status})` | Exit |
| Network/timeout | `Network error. Check your connection` | Exit (30s timeout) |
| Diff too large | `Diff truncated (too large for AI context)` | Auto-truncate with stat summary |
| Parse failure | — | Auto-retry once, then exit |

### Security

- **API keys** are stored in `~/.ai-commit.json` with `chmod 600` (owner-only read/write)
- **Environment variables** (`AI_COMMIT_CLAUDE_KEY`, `AI_COMMIT_OPENAI_KEY`) take priority over config file
- **Key masking** — Existing keys shown as `sk-ant-***...***` in config wizard
- **Diff privacy** — Staged diff is sent only to the selected AI provider's API
- **Home directory storage** — Config file lives in `~/`, never tracked by git

## Project Structure

```
ai-commit/
├── bin/
│   └── ai-commit.js              # CLI entrypoint + interaction (211 lines)
├── src/
│   ├── core/
│   │   ├── config.js              # Config load/save/wizard (128 lines)
│   │   ├── git.js                 # Git operations (29 lines)
│   │   └── prompt.js              # Prompt builder + diff truncate (62 lines)
│   └── providers/
│       ├── AIProvider.js          # Abstract base class (14 lines)
│       ├── registry.js            # Provider registry (26 lines)
│       ├── parse.js               # AI response parser, 3-stage fallback (33 lines)
│       ├── claude.js              # Claude API implementation (49 lines)
│       └── openai.js              # OpenAI API implementation (48 lines)
├── package.json
├── README.md
├── README.ko.md
└── .gitignore
```

**Total: ~600 lines** across 9 source files, 4 dependencies.

## Tech Stack

| Category | Choice | Reason |
|----------|--------|--------|
| Runtime | Node.js >= 18 (ESM) | Native `fetch`, wide adoption, `npx` distribution |
| CLI | [Commander](https://www.npmjs.com/package/commander) v12 | Lightweight, standard CLI parsing |
| Interaction | [Inquirer](https://www.npmjs.com/package/inquirer) v9 | Rich interactive prompts (list, password, confirm) |
| Styling | [chalk](https://www.npmjs.com/package/chalk) v5 + [ora](https://www.npmjs.com/package/ora) v8 | Terminal colors + spinner |
| AI APIs | Native `fetch` (no SDK) | Zero extra dependencies, consistent pattern across providers |

## License

MIT
