# Design: ai-commit

## Context Anchor

| Key | Value |
|---|---|
| **WHY** | 커밋 메시지 작성 비효율 + 품질 불일치 + 한국어/멀티 프로바이더 부재 해결 |
| **WHO** | git을 사용하는 모든 개발자 |
| **RISK** | API 키 노출 → 환경변수 우선+chmod 600 / AI 응답 파싱 실패 → JSON 강제+3단계 fallback / diff 토큰 초과 → 프로바이더별 동적 제한+stat summary |
| **SUCCESS** | npx 즉시 사용, 3개 메시지 제안, 프로바이더 교체 자유, ko/en 지원, gitmoji 지원 |
| **SCOPE** | v1.0 — 핵심 기능 + plugin system + --lang + --gitmoji + configurable model/timeout |

---

## 1. Overview

Plan에서 선택한 **Option C: Pragmatic Balance** 아키텍처 기반 상세 설계.
core(git/prompt/config) + providers(인터페이스 기반 AI 모듈) 분리 구조.

### Architecture Decision

| | Option A: Minimal | Option B: Clean | **Option C: Pragmatic ✅** |
|---|---|---|---|
| 파일 수 | 6 | 11 | 9 |
| 확장성 | 낮음 | 높음 | 높음 |
| 복잡도 | 낮음 | 높음 | 중간 |
| 선택 이유 | — | — | Plan과 동일 구조, CLI 불필요 분리 없음 |

---

## 2. Directory Structure

```
ai-commit/
├── bin/
│   └── ai-commit.js              # CLI entrypoint + interaction
├── src/
│   ├── core/
│   │   ├── git.js                 # git diff, git commit
│   │   ├── prompt.js              # prompt template (i18n)
│   │   └── config.js              # ~/.ai-commit.json management
│   └── providers/
│       ├── AIProvider.js          # abstract base class (interface)
│       ├── registry.js            # provider registry (register/get)
│       ├── parse.js               # AI response parser (3-stage fallback)
│       ├── claude.js              # Claude API implementation
│       └── openai.js              # OpenAI API implementation
├── package.json
├── .gitignore
├── LICENSE
└── README.md
```

---

## 3. Module Design

### 3.1 `bin/ai-commit.js` — CLI Entrypoint

Commander로 명령어 파싱, Inquirer로 사용자 인터랙션 처리.

```js
#!/usr/bin/env node

// Commands:
//   ai-commit                  → run() — 기본 실행
//   ai-commit config           → configCommand() — 대화형 설정
//
// Options:
//   --provider <name>          → 프로바이더 지정 (claude|openai)
//   --lang <code>              → 언어 지정 (en|ko)
//   --gitmoji                  → Gitmoji 접두사 추가

// run() 흐름:
// 1. isGitRepo() — git repo 아니면 에러
// 2. getStagedDiff() — 없으면 에러
// 2-1. getStagedFiles() — staged 파일 목록 표시
// 3. loadConfig()
// 4. API 키 없으면 → 대화형 config wizard 자동 안내
// 5. getProvider(name, apiKey, config) — config 전달로 model/timeout 설정
// 6. truncateDiff() → buildPrompt(diff, options)
// 7. provider.generateCommitMessages(prompt, options)
// 8. while loop: Inquirer 선택 / 수정 / 재생성 (재귀 대신 반복문)
// 9. execCommit(selectedMessage) + undo/amend 힌트 표시
```

**Inquirer 인터랙션:**

```
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
```

### 3.2 `src/core/git.js` — Git Operations

```js
import { execSync } from 'child_process';

/**
 * 스테이징된 변경사항의 diff를 가져온다
 * @returns {string} diff text (빈 문자열이면 staged changes 없음)
 */
export function getStagedDiff() {}

/**
 * 스테이징된 변경사항의 stat summary를 가져온다
 * @returns {string} stat text
 */
export function getStagedDiffStat() {}

/**
 * 스테이징된 파일 목록을 가져온다 (--name-only)
 * @returns {string} 줄바꿈으로 구분된 파일 경로
 */
export function getStagedFiles() {}

/**
 * 커밋을 실행한다
 * @param {string} message - 커밋 메시지
 * @throws {Error} 커밋 실패 시
 */
export function execCommit(message) {}

/**
 * 현재 디렉토리가 git repo인지 확인
 * @returns {boolean}
 */
export function isGitRepo() {}
```

**에러 처리:**
| 상황 | 에러 메시지 |
|---|---|
| git repo 아님 | `❌ Not a git repository` |
| staged changes 없음 | `❌ No staged changes. Run 'git add' first` |
| git diff 읽기 실패 | `❌ Failed to read git diff` |
| commit 실패 | `❌ Commit failed: {error}` |

### 3.3 `src/core/prompt.js` — Prompt Template

```js
/**
 * AI에게 보낼 프롬프트를 생성한다
 * @param {string} diff - git diff 결과
 * @param {object} options
 * @param {string} options.language - "en" | "ko"
 * @param {boolean} options.conventionalCommit - true/false
 * @param {boolean} options.gitmoji - gitmoji 접두사 사용 여부
 * @param {number} options.maxSuggestions - 제안 수 (default: 3)
 * @returns {string} 완성된 프롬프트
 */
export function buildPrompt(diff, options) {}

/**
 * diff가 maxLength를 초과하면 stat + partial diff로 truncate
 * @param {string} diff - 원본 diff
 * @param {number} maxLength - 프로바이더별 최대 길이
 * @returns {{ diff: string, truncated: boolean }}
 */
export function truncateDiff(diff, maxLength) {}
```

**프롬프트 포맷 분기 (4가지 모드):**

| gitmoji | conventionalCommit | 포맷 |
|---|---|---|
| true | true | `<emoji> <type>(<scope>): <description>` |
| true | false | `<emoji> <description>` |
| false | true | `<type>(<scope>): <description>` |
| false | false | 자유 형식 |

**Gitmoji 매핑:**
`✨=feat, 🐛=fix, ♻️=refactor, 📝=docs, 💄=style, ✅=test, 🔧=chore, ⚡=perf, 👷=ci, 📦=build, 🔥=remove, 🚀=deploy, 🔒=security, ⬆️=upgrade, 🎨=format`

**diff 크기 제한:** 프로바이더별 `maxDiffLength`에 따라 동적 제한.
- `truncateDiff()` 함수가 별도 export로 처리
- 초과 시: `[Diff Stats]` + stat summary + `[Partial Diff]` + 앞에서부터 잘린 diff
- `⚠️ Diff truncated` 경고 표시

**응답 파싱 전략 (3단계 fallback, `parse.js`):**
1. JSON 배열 파싱: 정규식으로 `[...]` 추출 → `JSON.parse()`
2. 줄바꿈 분리 fallback: `split('\n')` → 번호/불릿 제거 → 100자 이하 필터
3. 실패 시 null 반환: caller가 1회 재시도

### 3.4 `src/core/config.js` — Configuration

```js
// Config path: ~/.ai-commit.json

/**
 * @typedef {Object} Config
 * @property {string} provider - "claude" | "openai"
 * @property {string} [claudeApiKey]
 * @property {string} [openaiApiKey]
 * @property {string} language - "en" | "ko"
 * @property {boolean} conventionalCommit
 * @property {boolean} gitmoji - gitmoji 접두사 사용
 * @property {number} maxSuggestions
 * @property {string} claudeModel - Claude 모델명 (default: claude-sonnet-4-20250514)
 * @property {string} openaiModel - OpenAI 모델명 (default: gpt-4o-mini)
 * @property {number} timeout - API 요청 타임아웃 ms (default: 30000)
 */

/** 설정 파일 로드 (없으면 default 반환) */
export function loadConfig() {}

/** 설정 파일 저장 */
export function saveConfig(config) {}

/** 대화형 설정 (Inquirer) */
export async function runConfigWizard() {}
```

**Default Config:**

```json
{
  "provider": "claude",
  "language": "en",
  "conventionalCommit": true,
  "gitmoji": false,
  "maxSuggestions": 3,
  "claudeModel": "claude-sonnet-4-20250514",
  "openaiModel": "gpt-4o-mini",
  "timeout": 30000
}
```

**Config Wizard 흐름:**

```
? Default AI provider: (claude / openai)
? Claude API key (press Enter to skip): sk-ant-***
? OpenAI API key (press Enter to skip): (enter to skip or keep)
? Default language: (en / ko)
? Use Conventional Commits: (Y/n)
? Use Gitmoji? (✨ 🐛 ♻️ ...): (y/N)
✅ Config saved to ~/.ai-commit.json
```

- 선택한 provider의 키 + 기존에 설정된 다른 provider 키도 표시
- 기존 키가 있으면 Enter로 유지 가능 (마스킹 표시)
- 선택한 provider에 키가 없으면 경고 메시지 표시

### 3.5 `src/providers/AIProvider.js` — Interface (Base Class)

```js
/**
 * 모든 AI 프로바이더가 상속해야 하는 추상 베이스 클래스.
 * 새 프로바이더 추가 시 이 클래스를 extends하고 generateCommitMessages()를 구현한다.
 */
export class AIProvider {
  /** @type {number} 프로바이더별 diff 최대 길이 (chars) */
  maxDiffLength;

  constructor(name, apiKey, maxDiffLength) {
    if (new.target === AIProvider) {
      throw new Error('AIProvider is abstract and cannot be instantiated directly');
    }
    this.name = name;
    this.apiKey = apiKey;
    this.maxDiffLength = maxDiffLength;
  }

  /**
   * @param {string} prompt - buildPrompt()로 생성된 프롬프트
   * @param {object} options - { language, conventionalCommit, maxSuggestions }
   * @returns {Promise<string[]>} 커밋 메시지 배열
   */
  async generateCommitMessages(prompt, options) {
    throw new Error('generateCommitMessages() must be implemented');
  }
}
```

### 3.6 `src/providers/registry.js` — Provider Registry

```js
/**
 * 프로바이더 등록/조회 레지스트리.
 * 앱 시작 시 built-in 프로바이더를 자동 등록한다.
 */

const providers = new Map();

/** 프로바이더 클래스 등록 */
export function registerProvider(name, ProviderClass) {}

/** 이름으로 프로바이더 인스턴스 생성 (config로 model/timeout 전달) */
export function getProvider(name, apiKey, config = {}) {}

/** 등록된 프로바이더 목록 반환 */
export function getAvailableProviders() {}

/** built-in 프로바이더 자동 등록 */
export function registerBuiltInProviders() {}
```

**Registry 동작:**

```js
// 앱 시작 시
registerBuiltInProviders();
// → registerProvider('claude', ClaudeProvider)
// → registerProvider('openai', OpenAIProvider)

// 사용 시
const provider = getProvider('claude', apiKey, config);
const messages = await provider.generateCommitMessages(prompt, options);
```

### 3.7 `src/providers/claude.js` — Claude Implementation

```js
import { AIProvider } from './AIProvider.js';

export class ClaudeProvider extends AIProvider {
  constructor(apiKey, config = {}) {
    super('claude', apiKey, 15000);  // Claude: ~15,000자
    this.model = config.claudeModel || 'claude-sonnet-4-20250514';
    this.timeout = config.timeout || 30000;
  }

  async generateCommitMessages(prompt, options) {
    // AbortController로 timeout 적용
    // POST https://api.anthropic.com/v1/messages
    // Headers: x-api-key, anthropic-version: 2023-06-01
    // Body: { model: this.model, max_tokens: 1024, messages: [...] }
    // signal: controller.signal
    // Parse response → parseAIResponse() → string[]
  }
}
```

### 3.8 `src/providers/openai.js` — OpenAI Implementation

```js
import { AIProvider } from './AIProvider.js';

export class OpenAIProvider extends AIProvider {
  constructor(apiKey, config = {}) {
    super('openai', apiKey, 12000);  // OpenAI gpt-4o-mini: ~12,000자
    this.model = config.openaiModel || 'gpt-4o-mini';
    this.timeout = config.timeout || 30000;
  }

  async generateCommitMessages(prompt, options) {
    // AbortController로 timeout 적용
    // POST https://api.openai.com/v1/chat/completions
    // Headers: Authorization: Bearer {apiKey}
    // Body: { model: this.model, messages: [...] }
    // signal: controller.signal
    // Parse response → parseAIResponse() → string[]
  }
}
```

---

## 4. Data Flow

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ git diff │───▶│ prompt.js│───▶│ provider │───▶│ Inquirer │
│ --staged │    │ build()  │    │ generate │    │ select/  │
│          │    │          │    │ Messages │    │ edit/    │
│          │    │          │    │          │    │ regen    │
└──────────┘    └──────────┘    └──────────┘    └────┬─────┘
                                                     │
                                                     ▼
                                                ┌──────────┐
                                                │ git      │
                                                │ commit   │
                                                └──────────┘
```

**Sequence:**

```
User                CLI              Core             Provider
 │                   │                │                  │
 │  npx ai-commit   │                │                  │
 │──────────────────▶│                │                  │
 │                   │  loadConfig()  │                  │
 │                   │───────────────▶│                  │
 │                   │  getStagedDiff()                  │
 │                   │───────────────▶│                  │
 │                   │  buildPrompt() │                  │
 │                   │───────────────▶│                  │
 │                   │  getProvider() │                  │
 │                   │────────────────┼─────────────────▶│
 │                   │                │  generateCommit  │
 │                   │                │  Messages()      │
 │                   │◀───────────────┼──────────────────│
 │   3 suggestions   │                │                  │
 │◀──────────────────│                │                  │
 │   select "1"      │                │                  │
 │──────────────────▶│  execCommit()  │                  │
 │                   │───────────────▶│                  │
 │   ✅ Committed    │                │                  │
 │◀──────────────────│                │                  │
```

---

## 5. Error Handling

| Error | Detection | User Message | Recovery |
|---|---|---|---|
| Not a git repo | `isGitRepo()` false | `❌ Not a git repository` | Exit with code 1 |
| No staged changes | `getStagedDiff()` empty | `❌ No staged changes. Run 'git add' first` | Exit with code 1 |
| No API key | config에 key 없음 | `⚠️ API key not configured for {provider}.` | 대화형 wizard 자동 안내 ("Run setup now?") |
| git diff 읽기 실패 | execSync throws | `❌ Failed to read git diff` | Exit with code 1 |
| Unknown provider | registry에 없음 | `❌ Unknown provider: {name}. Available: claude, openai` | Exit with code 1 |
| API error (401) | HTTP 401 | `❌ Invalid API key for {provider}` | Suggest `ai-commit config` |
| API error (429) | HTTP 429 | `❌ Rate limited. Please try again later` | Exit with code 1 |
| API error (500+) | HTTP 5xx | `❌ {provider} API error ({status}). Please try again` | Exit with code 1 |
| Network error | fetch throws | `❌ Network error. Check your connection` | Exit with code 1 |
| Request timeout | AbortController abort | `❌ Network error. Check your connection` | 30초 타임아웃, Exit with code 1 |
| Diff too large | diff > provider.maxDiffLength | `⚠️ Diff truncated (too large for AI context)` | stat summary 우선 포함 + truncate |
| Parse failure (1차) | JSON.parse 실패 | — | 줄바꿈 분리 fallback 시도 |
| Parse failure (2차) | 줄바꿈 분리도 실패 | — | API 재호출 1회 |
| Parse failure (3차) | 재시도도 실패 | `❌ Failed to parse AI response after retry` | Exit with code 1 |

---

## 6. package.json

```json
{
  "name": "aicommit",
  "version": "1.0.0",
  "description": "AI-powered git commit message generator CLI",
  "type": "module",
  "bin": {
    "aicommit": "./bin/ai-commit.js"
  },
  "files": [
    "bin/",
    "src/"
  ],
  "keywords": [
    "git", "commit", "ai", "cli", "conventional-commits",
    "claude", "openai", "commit-message"
  ],
  "license": "MIT",
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    "commander": "^12.0.0",
    "inquirer": "^9.0.0",
    "chalk": "^5.0.0",
    "ora": "^8.0.0"
  }
}
```

---

## 7. New Provider Addition Guide

새 AI 프로바이더(예: Gemini) 추가 시 3단계:

**Step 1.** `src/providers/gemini.js` 생성

```js
import { AIProvider } from './AIProvider.js';

export class GeminiProvider extends AIProvider {
  constructor(apiKey) {
    super('gemini', apiKey);
  }

  async generateCommitMessages(prompt, options) {
    // Gemini API 호출 구현
  }
}
```

**Step 2.** `src/providers/registry.js`에 등록

```js
import { GeminiProvider } from './gemini.js';
registerProvider('gemini', GeminiProvider);
```

**Step 3.** `src/core/config.js`에 `geminiApiKey` 필드 추가

---

## 8. Security

**API 키 보호 (3 레이어):**

1. **환경변수 우선**: `AI_COMMIT_CLAUDE_KEY`, `AI_COMMIT_OPENAI_KEY` — 환경변수가 config 파일보다 우선
2. **config 파일 권한**: `~/.ai-commit.json` 저장 시 `chmod 600` 자동 설정 (소유자만 읽기/쓰기)
3. **키 마스킹**: `ai-commit config` 실행 시 기존 키를 `sk-ant-***...***` 형태로 마스킹 표시

**기타:**
- diff 내용은 선택한 AI 프로바이더 API에만 전송
- config 파일은 홈 디렉토리에 저장되어 git 추적 대상이 아님

---

## 9. Dependencies

| Package | Version | Purpose | ESM |
|---|---|---|---|
| commander | ^12.0.0 | CLI 파싱 | ✅ |
| inquirer | ^9.0.0 | 대화형 UX | ✅ (ESM only) |
| chalk | ^5.0.0 | 터미널 색상 | ✅ (ESM only) |
| ora | ^8.0.0 | 스피너 | ✅ (ESM only) |

> Node.js >= 18 필수 (native fetch 사용, 별도 HTTP 라이브러리 불필요)

---

## 10. Testing Strategy

| 대상 | 방법 | 범위 |
|---|---|---|
| git.js | 실제 git repo에서 통합 테스트 | diff/commit 정상 동작 |
| prompt.js | 단위 테스트 | 프롬프트 출력 검증 |
| config.js | 단위 테스트 (temp dir) | load/save/default |
| providers | mock fetch + 단위 테스트 | API 호출/파싱/에러 |
| registry | 단위 테스트 | 등록/조회/중복 |
| CLI (e2e) | 수동 테스트 | npx 실행 흐름 전체 |

---

## 11. Implementation Guide

### 11.1 Implementation Order

| # | Module | File | Dependencies | Estimated |
|---|---|---|---|---|
| 1 | Project Init | package.json, .gitignore | — | ~10 lines |
| 2 | Config | src/core/config.js | — | ~60 lines |
| 3 | Git Operations | src/core/git.js | — | ~40 lines |
| 4 | Prompt Template | src/core/prompt.js | — | ~40 lines |
| 5 | AI Interface | src/providers/AIProvider.js | — | ~20 lines |
| 6 | Registry | src/providers/registry.js | AIProvider | ~30 lines |
| 7 | Claude Provider | src/providers/claude.js | AIProvider | ~40 lines |
| 8 | OpenAI Provider | src/providers/openai.js | AIProvider | ~40 lines |
| 9 | CLI Entrypoint | bin/ai-commit.js | all above | ~120 lines |

**Total: ~400 lines**

### 11.2 Dependency Graph

```
bin/ai-commit.js
 ├── src/core/config.js
 ├── src/core/git.js
 ├── src/core/prompt.js
 └── src/providers/registry.js
      ├── src/providers/AIProvider.js
      ├── src/providers/claude.js
      └── src/providers/openai.js
```

### 11.3 Session Guide

| Session | Modules | Scope Key | Description |
|---|---|---|---|
| Session 1 | #1~#4 | `core` | 프로젝트 초기화 + core 모듈 전체 |
| Session 2 | #5~#8 | `providers` | AI 인터페이스 + 프로바이더 구현 |
| Session 3 | #9 | `cli` | CLI 엔트리포인트 + 통합 테스트 |

```bash
# Session별 실행
/pdca do ai-commit --scope core
/pdca do ai-commit --scope providers
/pdca do ai-commit --scope cli
```
