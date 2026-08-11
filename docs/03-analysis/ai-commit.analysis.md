# Analysis: ai-commit

## Context Anchor

| Key | Value |
|---|---|
| **WHY** | 커밋 메시지 작성 비효율 + 품질 불일치 + 한국어/멀티 프로바이더 부재 해결 |
| **WHO** | git을 사용하는 모든 개발자 |
| **RISK** | API 키 노출 → 환경변수+chmod 600 / 파싱 실패 → 3단계 fallback / 토큰 초과 → 프로바이더별 동적 제한 |
| **SUCCESS** | npx 즉시 사용, 3개 메시지 제안, 프로바이더 교체 자유, ko/en 지원 |
| **SCOPE** | v1.0 — 핵심 기능 + plugin system + --lang + --gitmoji + config |

---

## Match Rate: 92%

```
[Plan] ✅ → [Design] ✅ → [Do] ✅ → [Check] ✅ 92% → [Act] ⏳
```

| Category | Score |
|----------|:-----:|
| Design Match | 90% |
| Architecture Compliance | 95% |
| Error Handling | 88% |
| Security | 100% |
| Convention | 93% |
| **Overall** | **92%** |

---

## Plan Success Criteria

| Criterion | Status | Evidence |
|---|---|---|
| `npx aicommit`으로 즉시 사용 가능 | ✅ Met | `package.json:bin` + `node bin/ai-commit.js --help` 정상 |
| 3개 메시지 제안 → 선택/수정/재생성 | ✅ Met | `bin/ai-commit.js:promptUser()` — select/edit/regen/cancel |
| 프로바이더 인터페이스로 교체 가능 | ✅ Met | `AIProvider.js` + `registry.js` — 3단계 추가 가이드 |
| 한국어/영어 커밋 메시지 지원 | ✅ Met | `prompt.js:buildPrompt()` — `--lang ko` 옵션 |

**Success Rate: 4/4 (100%)**

---

## Gap List

### Important (설계 문서 업데이트 필요)

| ID | Gap | Type | File | Assessment |
|---|---|---|---|---|
| G-03 | API 키 없을 때 에러 종료 → 대화형 wizard 안내로 변경 | Changed | `bin/ai-commit.js:64-74` | UX 개선. 설계 Section 5 에러 테이블 업데이트 필요 |
| G-10 | configurable model names (`claudeModel`, `openaiModel`) 추가 | Added | `config.js:15-16`, `claude.js:7`, `openai.js:7` | 확장성 개선. 설계 Section 3.4, 3.7, 3.8 업데이트 필요 |
| G-11 | configurable timeout (30s default) 추가 | Added | `config.js:17`, `claude.js:8`, `openai.js:8` | 안정성 개선. 설계 Section 3.4 업데이트 필요 |
| G-12 | AbortController fetch timeout 추가 | Added | `claude.js:12-36`, `openai.js:12-36` | 무한 대기 방지. 설계 Section 3.7, 3.8 업데이트 필요 |
| G-13 | `--gitmoji` CLI 옵션 + config 필드 추가 | Added | `bin/ai-commit.js:22`, `config.js:13` | 새 기능. 설계 전반 업데이트 필요 |
| G-14 | Gitmoji 프롬프트 템플릿 (4가지 모드) | Added | `prompt.js:28-43` | gitmoji+conventional, gitmoji-only 등 |

### Minor (허용 가능한 차이)

| ID | Gap | Type | File | Assessment |
|---|---|---|---|---|
| G-01 | `getProvider()` 시그니처 `(name, apiKey)` → `(name, apiKey, config)` | Changed | `registry.js:10` | 하위 호환, config 전달용 |
| G-02 | Provider 생성자 `(apiKey)` → `(apiKey, config)` | Changed | `claude.js:5`, `openai.js:5` | model/timeout 설정 전달 |
| G-04 | API 500+ 에러 메시지에 status code 추가 | Changed | `claude.js:42`, `openai.js:42` | 더 정보적 |
| G-05 | package name `ai-commit` → `aicommit` | Changed | `package.json:2` | 의도적 리네이밍 (commit 897e123) |
| G-06 | `getStagedFiles()` 함수 추가 | Added | `git.js:22-25` | staged 파일 목록 표시용 |
| G-07 | Staged 파일 목록 실행 전 표시 | Added | `bin/ai-commit.js:54-55` | UX 개선 |
| G-08 | Config wizard 자동 안내 | Added | `bin/ai-commit.js:65-74` | 첫 사용자 UX |
| G-09 | 커밋 후 undo/amend 힌트 표시 | Added | `bin/ai-commit.js:206` | UX 안내 |
| G-15 | `truncateDiff()` 별도 함수로 추출 | Added | `prompt.js:3-18` | 재사용성 개선 |
| G-16 | git diff 읽기 실패 에러 핸들링 | Added | `bin/ai-commit.js:43-46` | 방어적 에러 처리 |

---

## Decision Record Verification

| Decision | Source | Followed? | Outcome |
|---|---|---|---|
| Plugin 확장형 (Option C) 아키텍처 | Plan §2 | ✅ | AIProvider 인터페이스 + registry 정상 구현 |
| Pragmatic Balance 설계안 | Design §1 | ✅ | 9개 파일, core/providers 분리 |
| HTTP fetch 직접 호출 (SDK 없음) | Plan §6 | ✅ | 의존성 4개만 사용 |
| 3단계 파싱 fallback | Design §3.3 | ✅ | parse.js에 JSON → 줄바꿈 → null 구현 |
| 환경변수 우선 API 키 | Design §8 | ✅ | config.js:22-28 |

---

## Assessment

- **구현 누락 0건**: 설계에 명시된 모든 기능이 구현됨
- **Critical 0건**: 심각한 문제 없음
- **Important 6건**: 모두 "설계보다 더 많이 구현됨" 방향 → 설계 문서 업데이트로 해결
- **Minor 10건**: 시그니처 확장, UX 개선 등 허용 가능한 차이

**권장 조치**: 설계 문서(`ai-commit.design.md`)를 현재 구현에 맞춰 업데이트 (gitmoji, configurable model/timeout, UX 개선사항 반영)
