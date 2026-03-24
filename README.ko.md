# ai-commit

AI 기반 git 커밋 메시지 자동 생성 CLI 도구.

스테이징된 변경사항을 분석하여 [Conventional Commit](https://www.conventionalcommits.org/) 메시지를 Claude 또는 OpenAI로 생성합니다.

## 빠른 시작

```bash
npx ai-commit config    # API 키 설정
git add .
npx ai-commit           # 커밋 메시지 생성
```

## 데모

```
$ npx ai-commit

🔍 Analyzing staged changes...

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
```

## 주요 기능

- **멀티 프로바이더** — Claude API와 OpenAI API를 자유롭게 전환
- **Conventional Commits** — 표준 포맷 준수 (`feat`, `fix`, `refactor`, ...)
- **다국어 지원** — 영어 및 한국어 커밋 메시지 (`--lang ko`)
- **인터랙티브** — 메시지 선택, 수정, 재생성
- **설치 불필요** — `npx`로 바로 사용 가능

## 설치

```bash
# npx로 바로 사용 (설치 불필요)
npx ai-commit

# 또는 전역 설치
npm install -g ai-commit
```

**요구사항:** Node.js >= 18

## 사용법

```bash
ai-commit                      # 기본 프로바이더 사용
ai-commit --provider openai    # OpenAI 사용
ai-commit --lang ko            # 한국어 커밋 메시지
ai-commit config               # API 키 설정
```

## 설정

`ai-commit config`으로 대화형 설정을 하거나, `~/.ai-commit.json`을 직접 편집할 수 있습니다:

```json
{
  "provider": "claude",
  "language": "en",
  "conventionalCommit": true,
  "maxSuggestions": 3
}
```

환경변수로도 API 키를 설정할 수 있습니다 (config 파일보다 우선):

```bash
export AI_COMMIT_CLAUDE_KEY=sk-ant-...
export AI_COMMIT_OPENAI_KEY=sk-...
```

## 지원 프로바이더

| 프로바이더 | 모델 | 최대 Diff |
|----------|-------|----------|
| Claude | claude-sonnet-4-20250514 | ~15,000자 |
| OpenAI | gpt-4o-mini | ~12,000자 |

새 프로바이더를 추가하고 싶다면 [프로바이더 추가 가이드](#프로바이더-추가)를 참고하세요.

## 프로바이더 추가

1. `src/providers/`에 `AIProvider`를 상속하는 파일 생성
2. `generateCommitMessages(prompt, options)` 구현
3. `src/providers/registry.js`에 등록

```js
import { AIProvider } from './AIProvider.js';

export class GeminiProvider extends AIProvider {
  constructor(apiKey) {
    super('gemini', apiKey, 12000);
  }

  async generateCommitMessages(prompt, options) {
    // API 호출 구현
  }
}
```

## 동작 원리

```
git diff --staged → buildPrompt() → AI Provider → 선택/수정 → git commit
```

1. `git diff --staged`로 스테이징된 변경사항 읽기
2. 언어 및 포맷 설정에 맞춰 프롬프트 생성
3. 선택된 AI 프로바이더에 전송
4. 제안된 메시지를 선택, 수정 또는 재생성
5. 선택한 메시지로 커밋 실행

## 라이선스

MIT
