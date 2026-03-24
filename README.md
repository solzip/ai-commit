# ai-commit

[한국어](./README.ko.md)

AI-powered git commit message generator CLI.

Analyzes your staged changes and suggests [Conventional Commit](https://www.conventionalcommits.org/) messages using Claude or OpenAI.

## Quick Start

No need to clone this repo. Just run these commands in **your own git project**:

```bash
# 1. Set up your API key (one-time)
npx aicommit config

# 2. Stage your changes as usual
git add .

# 3. Let AI generate your commit message
npx aicommit
```

## Demo

```
$ npx aicommit

🔍 Analyzing staged changes...

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
```

## Features

- **Multi-provider** — Claude API and OpenAI API, switchable anytime
- **Conventional Commits** — Follows the standard format (`feat`, `fix`, `refactor`, ...)
- **Multilingual** — English and Korean commit messages (`--lang ko`)
- **Interactive** — Select, edit, or regenerate suggestions
- **Zero config start** — Works with `npx`, no global install needed

## Install

This is an npm package. You can use it in any git repository without cloning this source code.

```bash
# Option 1: Use directly with npx (no install needed)
npx aicommit

# Option 2: Install globally for faster access
npm install -g aicommit
```

**Requirements:** Node.js >= 18

### For Contributors

If you want to contribute to this project:

```bash
git clone https://github.com/solzip/ai-commit.git
cd ai-commit
npm install
node bin/ai-commit.js --help
```

## Usage

```bash
aicommit                     # Default provider
aicommit--provider openai    # Use OpenAI
aicommit--lang ko            # Korean commit messages
aicommitconfig               # Set up API keys
```

## Configuration

Run `aicommit config` for interactive setup, or edit `~/.ai-commit.json` directly:

```json
{
  "provider": "claude",
  "language": "en",
  "conventionalCommit": true,
  "maxSuggestions": 3
}
```

API keys can also be set via environment variables (takes priority over config file):

```bash
export AI_COMMIT_CLAUDE_KEY=sk-ant-...
export AI_COMMIT_OPENAI_KEY=sk-...
```

## Supported Providers

| Provider | Model | Max Diff |
|----------|-------|----------|
| Claude | claude-sonnet-4-20250514 | ~15,000 chars |
| OpenAI | gpt-4o-mini | ~12,000 chars |

Adding a new provider? See [Provider Guide](#adding-a-provider).

## Adding a Provider

1. Create `src/providers/your-provider.js` extending `AIProvider`
2. Implement `generateCommitMessages(prompt, options)`
3. Register in `src/providers/registry.js`

```js
import { AIProvider } from './AIProvider.js';

export class GeminiProvider extends AIProvider {
  constructor(apiKey) {
    super('gemini', apiKey, 12000);
  }

  async generateCommitMessages(prompt, options) {
    // Your API call here
  }
}
```

## How It Works

```
git diff --staged → buildPrompt() → AI Provider → Select/Edit → git commit
```

1. Reads staged changes via `git diff --staged`
2. Builds a prompt with language and format preferences
3. Sends to the selected AI provider
4. Presents suggestions for selection, editing, or regeneration
5. Commits with the chosen message

## License

MIT
