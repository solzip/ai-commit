# Report: ai-commit

## Executive Summary

### 1.1 Overview

| Item | Value |
|---|---|
| Feature | ai-commit CLI |
| Started | 2026-03-27 |
| Completed | 2026-03-27 |
| Duration | 1 session |
| Match Rate | 92% |
| Iterations | 0 (no code fix needed) |
| Total Files | 9 source files |
| Total Lines | ~600 lines |

### 1.2 Results

| Metric | Value |
|---|---|
| Plan Success Criteria | 4/4 (100%) |
| Design Match Rate | 92% |
| Critical Issues | 0 |
| Important Gaps | 6 (all "exceeds design" direction) |
| Minor Gaps | 10 |

### 1.3 Value Delivered

| Perspective | Description |
|---|---|
| **Problem** | 커밋 메시지 작성의 비효율성과 품질 불일치 해결. 한국어/멀티 프로바이더 지원 도구 부재를 채움 |
| **Solution** | git diff를 AI가 분석하여 Conventional Commit + Gitmoji 메시지를 자동 생성하는 Zero-config CLI |
| **Function UX Effect** | `git add` + `npx aicommit` 두 단계로 고품질 커밋 메시지 완성. staged 파일 확인, 메시지 선택/수정/재생성, undo 힌트까지 원스톱 |
| **Core Value** | AIProvider 인터페이스 기반 플러그인 구조로 새 프로바이더 3단계 추가. 모델/타임아웃 config 분리로 코드 수정 없이 설정 변경 가능 |

---

## 2. PDCA Cycle Summary

```
[Plan] ✅ → [Design] ✅ → [Do] ✅ → [Check] ✅ 92% → [Report] ✅
```

| Phase | Status | Key Output |
|---|---|---|
| Plan | Completed | Plugin 확장형 (Option C) 아키텍처 선택. 9개 모듈, 4개 Success Criteria 정의 |
| Design | Completed | Pragmatic Balance 설계안. core/providers 분리, AIProvider 인터페이스, 3단계 파싱 fallback |
| Do | Completed | 600줄, 9개 파일 구현. 설계 대비 11개 추가 기능 (gitmoji, timeout, UX 개선) |
| Check | 92% | 구현 누락 0건. Gap 16건 중 Critical 0, Important 6 (모두 설계 초과), Minor 10 |
| Act | Skipped | 92% >= 90% 기준 충족. 설계 문서 동기화로 해결 |

---

## 3. Key Decisions & Outcomes

| # | Decision | Source | Followed | Outcome |
|---|---|---|---|---|
| 1 | Plugin 확장형 아키텍처 (Option C) | Plan §2 | ✅ | AIProvider + registry로 프로바이더 3단계 추가 가능 |
| 2 | HTTP fetch 직접 호출 (SDK 없음) | Plan §6 | ✅ | 의존성 4개만으로 경량 CLI 달성 |
| 3 | Pragmatic Balance 설계안 (9파일) | Design §1 | ✅ | 적절한 모듈 분리 + 과도한 추상화 없음 |
| 4 | 3단계 파싱 fallback | Design §3.3 | ✅ | JSON → 줄바꿈 → null. AI 응답 변동에 안정적 |
| 5 | 환경변수 우선 API 키 | Design §8 | ✅ | CI/CD에서 config 파일 없이 사용 가능 |

**설계 이후 추가된 결정:**

| # | Decision | Rationale | Outcome |
|---|---|---|---|
| 6 | Gitmoji 지원 (`--gitmoji`) | 커밋 메시지 가독성 향상 요구 | 4가지 포맷 모드 (gitmoji+conventional, gitmoji-only, conventional-only, plain) |
| 7 | Configurable model/timeout | 새 모델 출시 시 코드 수정 없이 대응 | `~/.ai-commit.json`에서 변경 가능 |
| 8 | AbortController fetch timeout | 느린 네트워크에서 무한 대기 방지 | 30초 기본, config로 조절 가능 |
| 9 | 대화형 config wizard 자동 안내 | 첫 사용자 이탈 방지 | API 키 없으면 "Run setup now?" 프롬프트 |
| 10 | Package rename ai-commit → aicommit | npm 네이밍 컨벤션 (하이픈 없는 단일 단어) | npx aicommit으로 실행 |

---

## 4. Plan Success Criteria Final Status

| # | Criterion | Status | Evidence |
|---|---|---|---|
| SC-1 | `npx aicommit`으로 즉시 사용 가능 | ✅ Met | `package.json:bin.aicommit`, `node bin/ai-commit.js --help` 정상 동작 |
| SC-2 | 3개 메시지 제안 → 선택/수정/재생성 | ✅ Met | `bin/ai-commit.js:promptUser()` — Inquirer list with select/edit/regen/cancel |
| SC-3 | 프로바이더 인터페이스로 교체 가능 | ✅ Met | `AIProvider.js` 추상 클래스 + `registry.js` 등록/조회 + README 가이드 |
| SC-4 | 한국어/영어 커밋 메시지 지원 | ✅ Met | `prompt.js:buildPrompt()` — `--lang ko` 시 "Write commit messages in Korean" |

**Overall Success Rate: 4/4 (100%)**

---

## 5. Architecture Overview

```
ai-commit/
├── bin/
│   └── ai-commit.js              # CLI entrypoint (211 lines)
├── src/
│   ├── core/
│   │   ├── config.js              # Config management (128 lines)
│   │   ├── git.js                 # Git operations (29 lines)
│   │   └── prompt.js              # Prompt builder + truncate (62 lines)
│   └── providers/
│       ├── AIProvider.js          # Abstract base class (14 lines)
│       ├── registry.js            # Provider registry (26 lines)
│       ├── parse.js               # Response parser (33 lines)
│       ├── claude.js              # Claude implementation (49 lines)
│       └── openai.js              # OpenAI implementation (48 lines)
├── package.json
├── README.md / README.ko.md
└── .gitignore
```

**Dependency Graph:**
```
bin/ai-commit.js
 ├── src/core/config.js      (inquirer, chalk, fs, os)
 ├── src/core/git.js          (child_process)
 ├── src/core/prompt.js       (→ git.js)
 └── src/providers/registry.js
      ├── src/providers/claude.js  (→ AIProvider.js, parse.js)
      └── src/providers/openai.js  (→ AIProvider.js, parse.js)
```

---

## 6. Features Delivered

### v1.0 Scope (Plan 기준)

- [x] git diff --staged 읽기 + git commit 실행
- [x] AI Provider 인터페이스 + Claude/OpenAI 구현체
- [x] Provider Registry (등록/조회)
- [x] Conventional Commit 프롬프트 템플릿
- [x] CLI 인터랙션 (선택/수정/재생성/취소)
- [x] `--lang` 옵션 (ko/en)
- [x] `--provider` 옵션
- [x] `config` 명령어 (API 키 대화형 설정)
- [x] 에러 핸들링 (11개 시나리오)

### v1.0 Beyond Scope (구현 중 추가)

- [x] `--gitmoji` 옵션 (4가지 포맷 모드)
- [x] Configurable AI model (`claudeModel`, `openaiModel`)
- [x] Configurable timeout (30초 default, `AbortController`)
- [x] Staged 파일 목록 실행 전 표시
- [x] API 키 미설정 시 config wizard 자동 안내
- [x] 커밋 후 undo/amend 힌트
- [x] Config wizard에서 기존 API 키 유지 (Enter to keep)
- [x] 양쪽 provider 키 동시 설정 가능

---

## 7. Lessons Learned

| # | Lesson | Category |
|---|---|---|
| 1 | 설계 시 "Out of Scope"로 뺀 gitmoji가 구현 중 자연스럽게 추가됨. 프롬프트 분기만으로 구현 가능한 기능은 scope 판단 시 비용을 더 정밀하게 평가할 것 | Scope |
| 2 | fetch timeout은 초기 설계에 빠지기 쉬운 항목. 네트워크 의존 CLI는 timeout을 기본 설계에 포함해야 함 | Reliability |
| 3 | "설계 초과 구현"도 Gap으로 관리하면 문서 동기화 시점을 명확히 잡을 수 있음 | Process |

---

## 8. Commit History

| Commit | Message |
|---|---|
| `162c7e9` | chore: initial commit |
| `11be96e` | docs: add ai-commit plan document with plugin architecture design |
| `943892d` | feat: implement ai-commit CLI with plugin architecture |
| `9bd2ab6` | docs: add Korean README |
| `abbf6fe` | docs: clarify installation and usage instructions in README |
| `897e123` | chore: rename package from ai-commit to aicommit |
| `5fe87d9` | feat: add gitmoji support |
| `ce426ce` | feat: improve UX and add fetch timeout, configurable models |
| `bb9a8bb` | docs: sync Plan/Design/Analysis with current implementation |
