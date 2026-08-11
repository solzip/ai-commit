/**
 * AI 응답을 파싱하여 커밋 메시지 배열로 변환 (3단계 fallback)
 * 1차: JSON 배열 파싱
 * 2차: 줄 단위 fallback (목록 항목 우선)
 * 3차: 실패 시 null 반환 (caller가 재시도)
 */

/** "1. ", "2) ", "- ", "* " 같은 목록 마커 */
const LIST_MARKER = /^\s*(?:\d+[.)]|[-*+])\s+/;

/** 마크다운 코드펜스 / 헤더 */
const NOISE = /^\s*(?:```|#{1,6}\s)/;

function isLikelyMessage(line) {
  if (!line || line.length > 100) return false;
  if (NOISE.test(line)) return false;
  // "Here are 3 commit messages:" 같은 서문은 콜론으로 끝난다.
  if (line.endsWith(':')) return false;
  return true;
}

export function parseAIResponse(text, maxSuggestions = 3) {
  if (typeof text !== 'string' || !text.trim()) return null;

  // 1차: JSON 배열 파싱
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        const items = parsed
          .filter((v) => typeof v === 'string')
          .map((v) => v.trim())
          .filter(Boolean);
        if (items.length > 0) return items.slice(0, maxSuggestions);
      }
    } catch {
      // JSON 파싱 실패 → fallback
    }
  }

  // 2차: 줄 단위 fallback
  const rawLines = text.split('\n');

  // 목록 마커가 있으면 그 항목만 신뢰한다.
  // 이렇게 해야 "Here are 3 commit messages:" 같은 서문이 후보에 섞이지 않는다.
  const listItems = rawLines
    .filter((line) => LIST_MARKER.test(line))
    .map((line) => line.replace(LIST_MARKER, '').trim())
    .filter(isLikelyMessage);

  if (listItems.length > 0) return listItems.slice(0, maxSuggestions);

  // 목록 형식이 아니면 전체 줄에서 잡음을 걸러낸다.
  const plainLines = rawLines.map((line) => line.trim()).filter(isLikelyMessage);

  if (plainLines.length > 0) return plainLines.slice(0, maxSuggestions);

  // 3차: 파싱 실패
  return null;
}
