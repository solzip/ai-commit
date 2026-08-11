import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAIResponse } from '../src/providers/parse.js';

test('JSON 배열을 파싱한다', () => {
  assert.deepEqual(parseAIResponse('["feat: a", "fix: b"]', 3), ['feat: a', 'fix: b']);
});

test('코드펜스로 감싼 JSON도 파싱한다', () => {
  assert.deepEqual(parseAIResponse('```json\n["feat: a", "fix: b"]\n```', 3), ['feat: a', 'fix: b']);
});

test('maxSuggestions 만큼만 반환한다', () => {
  assert.deepEqual(parseAIResponse('["a", "b", "c", "d"]', 2), ['a', 'b']);
});

test('JSON 안의 비문자열 항목은 버린다', () => {
  assert.deepEqual(parseAIResponse('["feat: a", 42, null, "fix: b"]', 3), ['feat: a', 'fix: b']);
});

// 회귀 방지: 서문이 1번 제안으로 채택되어 그냥 Enter 치면 커밋되던 버그
test('번호 목록 앞의 서문을 후보로 삼지 않는다', () => {
  const raw = [
    'Here are 3 commit messages for your diff:',
    '',
    '1. feat(auth): add login',
    '2. fix: repair thing',
    '3. chore: bump deps',
  ].join('\n');
  assert.deepEqual(parseAIResponse(raw, 3), [
    'feat(auth): add login',
    'fix: repair thing',
    'chore: bump deps',
  ]);
});

test('불릿 목록 앞의 서문도 배제한다', () => {
  assert.deepEqual(parseAIResponse('Suggestions:\n- feat: a\n- fix: b', 3), ['feat: a', 'fix: b']);
});

test('목록 형식이 아니면 평문 줄을 사용한다', () => {
  assert.deepEqual(parseAIResponse('feat: a\nfix: b', 3), ['feat: a', 'fix: b']);
});

test('마크다운 헤더와 코드펜스는 후보에서 제외한다', () => {
  assert.deepEqual(parseAIResponse('## Messages\n```\nfeat: a\n```', 3), ['feat: a']);
});

test('100자를 넘는 줄은 커밋 메시지로 보지 않는다', () => {
  assert.equal(parseAIResponse('x'.repeat(150), 3), null);
});

test('파싱 실패 시 null을 반환한다 (caller가 재시도)', () => {
  assert.equal(parseAIResponse('Here are the messages:', 3), null);
  assert.equal(parseAIResponse('   ', 3), null);
});

// 회귀 방지: text가 null이면 text.match에서 TypeError로 죽던 경로
test('문자열이 아닌 입력에도 죽지 않는다', () => {
  assert.equal(parseAIResponse(null, 3), null);
  assert.equal(parseAIResponse(undefined, 3), null);
  assert.equal(parseAIResponse(42, 3), null);
});
