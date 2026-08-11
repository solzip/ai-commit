# aicommit

[![CI](https://github.com/solzip/ai-commit/actions/workflows/ci.yml/badge.svg)](https://github.com/solzip/ai-commit/actions/workflows/ci.yml)

[English](./README.md)

AI 기반 git 커밋 메시지 자동 생성 CLI 도구.

스테이징된 변경사항을 분석하여 [Conventional Commit](https://www.conventionalcommits.org/) 메시지를 Claude 또는 OpenAI로 생성합니다. [Gitmoji](https://gitmoji.dev/), 다국어, 대화형 선택을 지원합니다.

## 현재 상태

2026년 3월에 직접 쓰려고 만들었고, 한동안 실제로 썼습니다. 지금도 동작합니다 — 테스트가 있고 CI가 Linux/Windows에서 Node 20·22·24로 돌아갑니다.

지금은 쓰지 않는데, 그 이유가 기록해둘 만합니다.

제 작업 방식이 에이전트 중심으로 옮겨갔습니다. 에이전트가 코드를 짜면 커밋 메시지도 같이 쓰는데, 그게 이 도구보다 낫습니다. 모델이 더 좋아서가 아니라 **가진 정보가 다르기 때문**입니다.

> **aicommit은 diff를 읽고 의도를 추측합니다. 코드를 짠 에이전트는 의도를 이미 알고 있습니다.**

커밋 메시지의 가치는 대부분 *왜*에 있는데, 그 *왜*는 diff에 남지 않습니다. `feat:` / `fix:` / `refactor:` 구분조차 변경분만으로는 복원되지 않을 때가 많습니다 — 같은 수정이 무엇을 하려던 것이었느냐에 따라 셋 다 될 수 있으니까요. 작업의 하류에 선 도구는, 상류의 작성자가 애초에 추측할 필요조차 없던 것을 추측하고 있는 셈입니다.

이건 품질 격차가 아니라 **구조적 열세**라서, 프롬프트를 아무리 다듬어도 좁혀지지 않습니다. 이 분야가 계속 작았던 이유이기도 합니다 — 가장 많이 쓰이는 도구가 주간 6천 다운로드 수준인데, 그게 얹히는 git 훅 인프라(husky, lint-staged)는 수천만입니다.

**그래도 맞는 자리:** 손으로 직접 짠 코드, 코딩 에이전트를 쓸 수 없거나 쓰지 않는 환경, 그리고 지난 커밋 메시지를 정리할 때.

**남길 만한 것:** 프로바이더 추상화([프로바이더 추가](#프로바이더-추가))는 잘 버텼습니다 — 세 번째 프로바이더를 붙이는 데 파일 하나와 한 줄이면 됩니다. 파싱 fallback 체인과 설정 우선순위 규칙도 다른 프로젝트로 가져갈 만한 부분입니다.

## 빠른 시작

> 소스에서 설치합니다 — npm에 발행되어 있지 않습니다.

```bash
# 1. 소스에서 설치
git clone https://github.com/solzip/ai-commit.git
cd ai-commit && npm install && npm link
```

그다음 **본인의 git 프로젝트**에서:

```bash
# 2. 변경사항 스테이징
git add .

# 3. AI가 커밋 메시지 생성
aicommit
```

처음 실행하면 API 키 설정을 자동으로 안내합니다.

## 데모

```
$ aicommit

Staged files:
  src/auth/login.js
  src/auth/token.js

✔ Analysis complete

📝 Suggested commit messages:

  1. feat(auth): JWT 토큰 갱신 엔드포인트 추가
  2. feat: Redis 캐시를 활용한 토큰 갱신 로직 구현
  3. feat(auth): 7일 만료 자동 JWT 갱신 추가

? Select a message: (Use arrow keys)
❯ 1. feat(auth): JWT 토큰 갱신 엔드포인트 추가
  2. feat: Redis 캐시를 활용한 토큰 갱신 로직 구현
  3. feat(auth): 7일 만료 자동 JWT 갱신 추가
  ──────────────
  ✏️  Edit message
  🔄 Regenerate
  ❌ Cancel

✅ Committed: feat(auth): JWT 토큰 갱신 엔드포인트 추가
   Undo: git reset --soft HEAD~1 | Amend: git commit --amend
```

`--gitmoji` 사용 시:

```
📝 Suggested commit messages:

  1. ✨ feat(auth): JWT 토큰 갱신 엔드포인트 추가
  2. 🐛 fix(api): 토큰 갱신 타임아웃 문제 해결
  3. ♻️ refactor: 인증 미들웨어 체인 단순화
```

## 주요 기능

- **멀티 프로바이더** — Claude와 OpenAI를 `--provider`나 config로 자유롭게 전환
- **Conventional Commits** — 표준 포맷 (`feat`, `fix`, `refactor`, ...) 기본 활성화
- **Gitmoji** — 이모지 접두사 지원 (`--gitmoji`) ✨ 🐛 ♻️ 등
- **다국어** — 영어/한국어 커밋 메시지 (`--lang ko`)
- **대화형** — 메시지 선택, 수정, 재생성을 반복 가능
- **설정 없이 시작** — 처음 실행 시 API 키 설정을 자동 안내
- **Staged 파일 미리보기** — AI 분석 전 어떤 파일이 커밋되는지 확인
- **모델 설정 가능** — 코드 수정 없이 AI 모델 변경
- **요청 타임아웃** — 30초 fetch 타임아웃으로 느린 네트워크 대응
- **안전한 커밋 UX** — 커밋 후 undo/amend 명령어 안내

## 설치

npm에 발행되어 있지 않습니다 — 소스에서 설치합니다:

```bash
git clone https://github.com/solzip/ai-commit.git
cd ai-commit
npm install
npm link              # `aicommit` 명령을 전역에서 사용 가능하게 함
```

제거할 때: `npm unlink -g aicommit`

**요구사항:** Node.js >= 20

### 기여자용

```bash
git clone https://github.com/solzip/ai-commit.git
cd ai-commit
npm install
node bin/ai-commit.js --help
```

## 사용법

### 기본 명령어

```bash
aicommit                      # 커밋 메시지 생성 (기본 프로바이더)
aicommit --provider openai    # OpenAI 사용
aicommit --lang ko            # 한국어 커밋 메시지
aicommit --gitmoji            # Gitmoji 접두사 추가 (✨ 🐛 ♻️)
aicommit config               # 대화형 설정 (API 키, 기본 설정)
```

### CLI 옵션

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--provider <name>` | AI 프로바이더 (`claude` 또는 `openai`) | `claude` |
| `--lang <code>` | 커밋 메시지 언어 (`en` 또는 `ko`) | `en` |
| `--gitmoji` | Gitmoji 이모지 접두사 추가 | `false` |
| `-V, --version` | 버전 표시 | — |
| `-h, --help` | 도움말 표시 | — |

### 커밋 메시지 포맷

`conventionalCommit`과 `gitmoji` 설정 조합에 따라 4가지 포맷을 지원합니다:

| conventionalCommit | gitmoji | 포맷 | 예시 |
|:------------------:|:-------:|------|------|
| true | false | `<type>(<scope>): <description>` | `feat(auth): 로그인 엔드포인트 추가` |
| true | true | `<emoji> <type>(<scope>): <description>` | `✨ feat(auth): 로그인 엔드포인트 추가` |
| false | true | `<emoji> <description>` | `✨ 로그인 엔드포인트 추가` |
| false | false | 자유 형식 | `로그인 엔드포인트 추가` |

### Gitmoji 참고

| 이모지 | 타입 | 의미 |
|:------:|------|------|
| ✨ | feat | 새 기능 |
| 🐛 | fix | 버그 수정 |
| ♻️ | refactor | 리팩토링 |
| 📝 | docs | 문서 |
| 💄 | style | UI/스타일 |
| ✅ | test | 테스트 |
| 🔧 | chore | 설정/도구 |
| ⚡ | perf | 성능 개선 |
| 👷 | ci | CI/CD |
| 📦 | build | 빌드 시스템 |
| 🔥 | remove | 코드/파일 삭제 |
| 🚀 | deploy | 배포 |
| 🔒 | security | 보안 수정 |
| ⬆️ | upgrade | 의존성 업그레이드 |
| 🎨 | format | 코드 포맷팅 |

## 설정

### 대화형 설정

```bash
aicommit config
```

설정 항목:
1. 기본 AI 프로바이더 (Claude / OpenAI)
2. 선택한 프로바이더의 API 키 (Enter로 기존 키 유지 가능)
3. 기본 언어 (English / 한국어)
4. Conventional Commits 사용 여부
5. Gitmoji 사용 여부

### 설정 파일

모든 설정은 `~/.ai-commit.json`에 저장됩니다:

```json
{
  "provider": "claude",
  "claudeApiKey": "sk-ant-...",
  "openaiApiKey": "sk-...",
  "language": "en",
  "conventionalCommit": true,
  "gitmoji": false,
  "maxSuggestions": 3,
  "claudeModel": "claude-sonnet-5",
  "openaiModel": "gpt-4o-mini",
  "timeout": 30000
}
```

| 필드 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `provider` | string | `"claude"` | 기본 AI 프로바이더 |
| `claudeApiKey` | string | — | Claude API 키 |
| `openaiApiKey` | string | — | OpenAI API 키 |
| `language` | string | `"en"` | 커밋 메시지 언어 (`en`, `ko`) |
| `conventionalCommit` | boolean | `true` | Conventional Commits 포맷 사용 |
| `gitmoji` | boolean | `false` | Gitmoji 접두사 추가 |
| `maxSuggestions` | number | `3` | 생성할 제안 수 |
| `claudeModel` | string | `"claude-sonnet-5"` | 사용할 Claude 모델 |
| `openaiModel` | string | `"gpt-4o-mini"` | 사용할 OpenAI 모델 |
| `timeout` | number | `30000` | API 요청 타임아웃 (밀리초) |

### 환경 변수

환경 변수로 API 키를 설정할 수 있습니다 (설정 파일보다 우선):

```bash
export AI_COMMIT_CLAUDE_KEY=sk-ant-...
export AI_COMMIT_OPENAI_KEY=sk-...
```

CI/CD 환경이나 공유 머신에서 설정 파일 없이 사용할 때 유용합니다.

### 설정 우선순위

```
CLI 옵션 (--provider, --lang, --gitmoji)
  ↓ 우선
환경 변수 (AI_COMMIT_CLAUDE_KEY, AI_COMMIT_OPENAI_KEY)
  ↓ 우선
설정 파일 (~/.ai-commit.json)
  ↓ 우선
기본값
```

## 지원 프로바이더

| 프로바이더 | 기본 모델 | 최대 Diff | API |
|----------|-----------|----------|-----|
| Claude | claude-sonnet-5 | ~15,000자 | [Anthropic Messages API](https://docs.anthropic.com/en/docs/about-claude/models) |
| OpenAI | gpt-4o-mini | ~12,000자 | [OpenAI Chat Completions](https://platform.openai.com/docs/models) |

모델은 `~/.ai-commit.json`의 `claudeModel`, `openaiModel`로 코드 수정 없이 변경 가능합니다.

## 프로바이더 추가

새 AI 프로바이더(예: Gemini) 추가는 3단계:

**Step 1.** `src/providers/gemini.js` 생성:

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
        // ... API 호출
        signal: controller.signal,
      });
      // ... 응답 파싱
      return parseAIResponse(text, options.maxSuggestions);
    } finally {
      clearTimeout(timer);
    }
  }
}
```

**Step 2.** `src/providers/registry.js`에 등록:

```js
import { GeminiProvider } from './gemini.js';
registerProvider('gemini', GeminiProvider);
```

**Step 3.** `src/core/config.js`에 `geminiApiKey` 필드 추가

## 동작 원리

```
git diff --staged
    → Staged 파일 목록 표시
    → truncateDiff() (너무 크면)
    → buildPrompt(diff, {lang, format, gitmoji})
    → provider.generateCommitMessages(prompt)
    → parseAIResponse() (JSON → 줄바꿈 fallback → 재시도)
    → Inquirer (선택 / 수정 / 재생성 반복)
    → git commit -m "선택한 메시지"
    → undo/amend 힌트 표시
```

### 상세 흐름

1. **환경 확인** — git repo 확인, staged diff 읽기, staged 파일 목록 표시
2. **설정 로드** — 기본값 < 설정 파일 < 환경 변수 < CLI 옵션 순으로 머지
3. **자동 설정** — API 키 없으면 config wizard 즉시 안내
4. **Diff 축소** — 프로바이더 제한 초과 시 stat summary + 부분 diff로 자동 축소
5. **프롬프트 생성** — diff + 언어 + 포맷(conventional/gitmoji) + 제안 수 조합
6. **AI 호출** — 30초 타임아웃으로 전송. 파싱 실패 시 1회 자동 재시도
7. **대화형 선택** — 메시지 선택, 수정, 또는 재생성 (커밋 또는 취소까지 반복)
8. **커밋** — `git commit -m "message"` 실행 후 undo 명령어 안내

### 에러 처리

| 에러 | 메시지 | 복구 |
|------|--------|------|
| git repo 아님 | `Not a git repository` | 종료 |
| staged changes 없음 | `No staged changes. Run 'git add' first` | 종료 |
| API 키 없음 | `API key not configured for {provider}` | config wizard 자동 안내 |
| 미지원 프로바이더 | `Unknown provider: {name}. Available: claude, openai` | 종료 |
| 잘못된 API 키 (401) | `Invalid API key for {provider}` | `aicommit config` 안내 |
| 요청 제한 (429) | `Rate limited. Please try again later` | 종료 |
| 서버 에러 (5xx) | `{provider} API error ({status})` | 종료 |
| 네트워크/타임아웃 | `Network error. Check your connection` | 종료 (30초 타임아웃) |
| Diff 너무 큼 | `Diff truncated (too large for AI context)` | stat summary로 자동 축소 |
| 파싱 실패 | — | 1회 자동 재시도 후 종료 |

### 보안

- **API 키**는 `~/.ai-commit.json`에 `chmod 600` (소유자만 읽기/쓰기)으로 저장
- **환경 변수** (`AI_COMMIT_CLAUDE_KEY`, `AI_COMMIT_OPENAI_KEY`)가 설정 파일보다 우선
- **키 마스킹** — config wizard에서 기존 키를 `sk-ant-***...***` 형태로 마스킹 표시
- **Diff 프라이버시** — staged diff는 선택한 AI 프로바이더 API에만 전송
- **홈 디렉토리 저장** — 설정 파일은 `~/`에 위치, git 추적 대상 아님

## 프로젝트 구조

```
ai-commit/
├── bin/
│   └── ai-commit.js              # CLI 엔트리포인트 + 인터랙션 (211줄)
├── src/
│   ├── core/
│   │   ├── config.js              # 설정 로드/저장/wizard (128줄)
│   │   ├── git.js                 # Git 작업 (29줄)
│   │   └── prompt.js              # 프롬프트 빌더 + diff 축소 (62줄)
│   └── providers/
│       ├── AIProvider.js          # 추상 베이스 클래스 (14줄)
│       ├── registry.js            # 프로바이더 레지스트리 (26줄)
│       ├── parse.js               # AI 응답 파서, 3단계 fallback (33줄)
│       ├── claude.js              # Claude API 구현 (49줄)
│       └── openai.js              # OpenAI API 구현 (48줄)
├── package.json
├── README.md
├── README.ko.md
├── test/
│   ├── parse.test.js              # 응답 파싱
│   ├── providers.test.js          # 프로바이더 계약 + 오류 경로
│   └── safety.test.js             # 셸 안전성, 대용량 diff, 키 격리
├── docs/archive/2026-03/           # PDCA 기록: plan → design → analysis → report
├── .github/workflows/ci.yml
└── .gitignore
```

**총 ~750줄**, 소스 파일 9개, 테스트 약 240줄. 런타임 의존성 4개.

## 테스트

```bash
npm test
```

24개 테스트, 테스트 프레임워크 없이 내장 `node --test`만 씁니다. CI가 Ubuntu·Windows에서 Node 20·22·24로 돌립니다.

커버리지를 채우기보다, **실제로 물렸던 실패 지점**에 의도적으로 무게를 뒀습니다.

| 테스트 | 막아둔 회귀 |
|--------|------------|
| 커밋 메시지가 셸에서 평가되지 않음 | `execSync` + JSON 이스케이프가 POSIX 셸에서 `$(...)`를 실행시켰음 |
| 1MB 초과 staged diff를 읽음 | 기본 `maxBuffer` 1MB가 lockfile 재생성 하나에 터졌음 |
| 환경변수 키가 디스크에 안 남음 | 설정 마법사가 환경변수 전용 키를 설정 파일에 되썼음 |
| 서문이 제안 목록에 안 들어감 | `Here are 3 commit messages:` 가 1번 제안이 됐음 |
| 빈/필터링된 API 응답 처리 | 무방비 `content[0].text` 가 정체불명 `TypeError`를 냈음 |

이 테스트들은 **실제 효과를 검증**합니다 — 셸 테스트는 임시 저장소에 페이로드를 커밋한 뒤 파일 시스템을 확인하고, diff 테스트는 실제로 1MB 넘는 diff를 만들어 돌립니다.

## 기술 스택

| 카테고리 | 선택 | 이유 |
|---------|------|------|
| 런타임 | Node.js >= 20 (ESM) | 네이티브 `fetch`, 빌드 단계 없음 |
| CLI | [Commander](https://www.npmjs.com/package/commander) v12 | 경량, 표준 CLI 파싱 |
| 인터랙션 | [Inquirer](https://www.npmjs.com/package/inquirer) v9 | 풍부한 대화형 프롬프트 (select, password, confirm) |
| 스타일링 | [chalk](https://www.npmjs.com/package/chalk) v5 + [ora](https://www.npmjs.com/package/ora) v8 | 터미널 색상 + 스피너 |
| AI API | 네이티브 `fetch` (SDK 없음) | 추가 의존성 제로, 프로바이더 간 일관된 패턴 |
| 테스트 | `node --test` (내장) | 테스트 프레임워크 의존성 없음 |

## 라이선스

MIT
