# Plan: ai-commit

## Executive Summary

| Perspective | Description |
|---|---|
| **Problem** | 커밋 메시지 작성이 비효율적이고, 품질이 일관되지 않으며, 한국어/멀티 프로바이더를 지원하는 도구가 없다 |
| **Solution** | git diff를 AI가 분석하여 Conventional Commit 메시지를 자동 생성하는 CLI 도구 |
| **Function UX Effect** | `git add` → `npx ai-commit` 두 단계로 고품질 커밋 메시지 완성 |
| **Core Value** | 인터페이스 기반 모듈화로 AI 프로바이더 교체/추가가 자유로운 확장 가능한 구조 |

---

## 1. User Intent Discovery

### Core Problem
1. 매번 적절한 Conventional Commit 메시지를 고민하는 시간 낭비
2. 팀/개인의 커밋 메시지 품질과 일관성 부족
3. 한국어 커밋 메시지를 지원하는 도구 부재
4. AI 프로바이더 선택지 부족 (기존 도구는 OpenAI only)

### Target Users
- git을 사용하는 모든 개발자

### Success Criteria
- `npx ai-commit`으로 즉시 사용 가능
- 3개의 Conventional Commit 메시지 제안 → 선택/수정/재생성
- Claude, OpenAI 등 프로바이더를 인터페이스로 교체 가능
- 한국어/영어 커밋 메시지 지원

---

## 2. Alternatives Explored

| | A: Lightweight CLI | B: AI SDK 기반 | C: Plugin 확장형 ✅ |
|---|---|---|---|
| 구조 | 자체 HTTP 호출 | 공식 SDK 사용 | 인터페이스 기반 모듈화 |
| 장점 | 최소 의존성, 빠른 개발 | 타입 안전, 스트리밍 | 프로바이더 추가 용이, 확장성 |
| 단점 | API 변경 직접 대응 | 패키지 크기 증가 | 초기 설계 비용 |
| 적합 | 단기 MVP | 장기 유지보수 | 멀티 프로바이더 지원 |

**선택: C (Plugin 확장형)** — 인터페이스 기반 모듈화로 프로바이더 교체/추가가 자유로운 구조

---

## 3. Architecture

```
┌─────────────────────────────────────────────┐
│  bin/ai-commit.js  (CLI Entrypoint)         │
│  - Commander: 명령어 파싱                     │
│  - Inquirer: 사용자 인터랙션                   │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│  src/core/                                  │
│  - git.js       : diff 읽기, commit 실행      │
│  - prompt.js    : 프롬프트 템플릿 (lang 지원)   │
│  - config.js    : ~/.ai-commit.json 관리      │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│  src/providers/                              │
│  - AIProvider    : 인터페이스 (공통 계약)       │
│  - registry.js   : 프로바이더 등록/조회         │
│  - claude.js     : Claude 구현체              │
│  - openai.js     : OpenAI 구현체              │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│  (향후: gemini.js, ollama.js 등 추가 가능)     │
└─────────────────────────────────────────────┘
```

### AI Provider Interface

```js
/**
 * @interface AIProvider
 * 모든 AI 프로바이더가 구현해야 하는 공통 인터페이스
 */
class AIProvider {
  name;           // "claude" | "openai" | ...

  /**
   * @param {string} apiKey
   */
  constructor(apiKey) {}

  /**
   * diff를 분석하여 커밋 메시지를 생성한다
   * @param {string} diff - git diff 결과
   * @param {object} options - { language, conventionalCommit, maxSuggestions }
   * @returns {Promise<string[]>} 커밋 메시지 배열
   */
  async generateCommitMessages(diff, options) {}
}
```

새 프로바이더 추가 시:
1. `src/providers/`에 구현체 파일 생성
2. `AIProvider` 인터페이스의 `generateCommitMessages()` 구현
3. `registry.js`에 등록

### Data Flow

```
git diff --staged
    → diff text
    → prompt.js (diff + lang + conventionalCommit 조합)
    → registry.getProvider(name)
    → provider.generateCommitMessages(diff, options)
    → string[] (3개 메시지)
    → Inquirer (선택 / 수정 / 재생성)
    → git commit -m "selected message"
```

---

## 4. YAGNI Review

### v1.0 In Scope
- [x] git diff --staged 읽기 + git commit 실행
- [x] AI Provider 인터페이스 + Claude/OpenAI 구현체
- [x] Provider Registry (등록/조회)
- [x] Conventional Commit 프롬프트 템플릿
- [x] CLI 인터랙션 (선택/수정/재생성)
- [x] `--lang` 옵션 (ko/en)
- [x] `--provider` 옵션
- [x] `config` 명령어 (API 키 대화형 설정)
- [x] 에러 핸들링 (no staged files, API 에러, no git repo)

### Out of Scope (v2+)
- Gemini, Ollama 등 추가 프로바이더
- 커스텀 프롬프트 템플릿
- git hook 자동 설치
- monorepo scope 감지
- 스트리밍 출력
- 커밋 메시지 히스토리/학습

---

## 5. Directory Structure

```
ai-commit/
├── bin/
│   └── ai-commit.js              # CLI entrypoint
├── src/
│   ├── core/
│   │   ├── git.js                 # git diff, git commit
│   │   ├── prompt.js              # prompt templates (i18n)
│   │   └── config.js              # ~/.ai-commit.json management
│   └── providers/
│       ├── AIProvider.js          # interface (base class)
│       ├── registry.js            # provider registry
│       ├── claude.js              # Claude implementation
│       └── openai.js              # OpenAI implementation
├── package.json
├── README.md
├── LICENSE
└── .gitignore
```

---

## 6. Tech Stack

| Category | Choice | Reason |
|---|---|---|
| Runtime | Node.js (ESM) | npx 배포, 넓은 사용자 기반 |
| CLI Framework | Commander | 표준적, 가벼움 |
| Interaction | Inquirer v9 | 선택/수정 UX, ESM 지원 |
| Styling | chalk v5 + ora v8 | 터미널 UX (색상, 스피너) |
| AI (Claude) | HTTP fetch (직접) | SDK 의존성 없이 가벼움 |
| AI (OpenAI) | HTTP fetch (직접) | 동일한 패턴으로 통일 |
| Lint | ESLint v9 | 코드 품질 |

---

## 7. Commands

```bash
ai-commit                        # 기본 실행 (설정된 프로바이더 사용)
ai-commit --provider openai      # 프로바이더 지정
ai-commit --lang ko              # 한국어 커밋 메시지
ai-commit config                 # 대화형 설정 (API 키, 기본 프로바이더)
```

---

## 8. Config Schema (`~/.ai-commit.json`)

```json
{
  "provider": "claude",
  "claudeApiKey": "sk-ant-...",
  "openaiApiKey": "sk-...",
  "language": "en",
  "conventionalCommit": true,
  "maxSuggestions": 3
}
```

---

## 9. Brainstorming Log

| Phase | Decision |
|---|---|
| Intent | 1~4번 문제 모두 해결 대상. 타겟은 모든 개발자 |
| Approach | C (Plugin 확장형) 선택 — 인터페이스 기반 모듈화로 확장성 확보 |
| YAGNI | 4개 기능 모두 v1.0 포함. Gemini/Ollama/streaming 등은 v2+ |
| Architecture | core + providers 분리 확정. AIProvider 인터페이스 기반 |
| Data Flow | 선형 파이프라인 확정 (diff → prompt → provider → select → commit) |
