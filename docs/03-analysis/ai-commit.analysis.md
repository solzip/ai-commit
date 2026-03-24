# Analysis: ai-commit

## Context Anchor

| Key | Value |
|---|---|
| **WHY** | 커밋 메시지 작성 비효율 + 품질 불일치 + 한국어/멀티 프로바이더 부재 해결 |
| **WHO** | git을 사용하는 모든 개발자 |
| **RISK** | API 키 노출 → 환경변수+chmod 600 / 파싱 실패 → 3단계 fallback / 토큰 초과 → 프로바이더별 동적 제한 |
| **SUCCESS** | npx 즉시 사용, 3개 메시지 제안, 프로바이더 교체 자유, ko/en 지원 |
| **SCOPE** | v1.0 — 핵심 기능 + plugin system + --lang + config |

---

## Match Rate: 92%

```
[Plan] ✅ → [Design] ✅ → [Do] ✅ → [Check] 🔄 92% → [Act] ⏳
```

---

## Plan Success Criteria

| Criterion | Status |
|---|---|
| `npx ai-commit`으로 즉시 사용 가능 | ✅ PASS |
| 3개 메시지 제안 → 선택/수정/재생성 | ✅ PASS |
| 프로바이더 인터페이스로 교체 가능 | ✅ PASS |
| 한국어/영어 커밋 메시지 지원 | ✅ PASS |

---

## Gap List

### Important (수정 권장)

| ID | Gap | Confidence | File |
|---|---|---|---|
| G-03 | 401 에러 시 `ai-commit config` 실행 안내 누락 | 90% | `providers/claude.js`, `providers/openai.js`, `bin/ai-commit.js` |
| G-05 | Design에 없는 `parse.js` 파일 추가 (10개 vs 설계 9개) | 95% | `providers/parse.js` |

### Minor (허용 가능한 차이)

| ID | Gap | Confidence | File | Assessment |
|---|---|---|---|---|
| G-04 | Network error 시 spinner fail + console.error 이중 출력 | 85% | `bin/ai-commit.js` | 수정 용이 |
| G-07 | 프롬프트 응답 포맷이 "줄바꿈" → "JSON 배열"로 변경 | 85% | `src/core/prompt.js` | 설계 개선 (3단계 fallback과 일관됨) |
| G-08 | `getStagedDiff()`가 throw 대신 빈 문자열 반환 | 90% | `src/core/git.js` | CLI에서 처리하여 기능 동일 |

---

## Assessment

- **G-03**: Design Section 5에서 401 에러의 Recovery가 "Suggest `ai-commit config`"인데, 구현에서 누락됨. 사용자 경험 관점에서 수정 권장.
- **G-05**: `parse.js` 추가는 DRY 원칙에 맞는 합리적 판단. Design 문서에 반영하면 해결.
- **G-04**: 에러 출력 중복은 사소하지만 수정 쉬움.
- **G-07, G-08**: 설계보다 나은 방향으로 변경. 허용.
