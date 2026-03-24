/**
 * AI 응답을 파싱하여 커밋 메시지 배열로 변환 (3단계 fallback)
 * 1차: JSON 배열 파싱
 * 2차: 줄바꿈 분리 fallback
 * 3차: 실패 시 null 반환 (caller가 재시도)
 */
export function parseAIResponse(text, maxSuggestions = 3) {
  // 1차: JSON 배열 파싱
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(String).slice(0, maxSuggestions);
      }
    } catch {
      // JSON 파싱 실패 → fallback
    }
  }

  // 2차: 줄바꿈 분리 fallback
  const lines = text
    .split('\n')
    .map((line) => line.replace(/^\s*[\d]+[.)]\s*/, '').replace(/^\s*[-*]\s*/, '').trim())
    .filter((line) => line.length > 0 && line.length <= 100);

  if (lines.length > 0) {
    return lines.slice(0, maxSuggestions);
  }

  // 3차: 파싱 실패
  return null;
}
