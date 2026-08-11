import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { ClaudeProvider } from '../src/providers/claude.js';
import { OpenAIProvider } from '../src/providers/openai.js';
import { getProvider, getAvailableProviders, registerBuiltInProviders } from '../src/providers/registry.js';

const realFetch = global.fetch;
afterEach(() => { global.fetch = realFetch; });

const mockJson = (body, init = {}) => {
  global.fetch = async () => ({ ok: true, status: 200, ...init, json: async () => body });
};

const opts = { maxSuggestions: 3 };

test('Claude: 정상 응답을 파싱한다', async () => {
  mockJson({ content: [{ type: 'text', text: '["feat: ok"]' }] });
  assert.deepEqual(
    await new ClaudeProvider('k').generateCommitMessages('p', opts),
    ['feat: ok']
  );
});

test('Claude: text 블록이 앞에 없어도 찾아낸다', async () => {
  mockJson({ content: [{ type: 'thinking' }, { type: 'text', text: '["feat: ok"]' }] });
  assert.deepEqual(
    await new ClaudeProvider('k').generateCommitMessages('p', opts),
    ['feat: ok']
  );
});

// 회귀 방지: data.content[0].text 무방비 접근으로 TypeError가 나던 경로
test('Claude: content가 비면 실행 가능한 메시지로 실패한다', async () => {
  mockJson({ content: [] });
  await assert.rejects(
    () => new ClaudeProvider('k').generateCommitMessages('p', opts),
    (e) => !(e instanceof TypeError) && /empty response/i.test(e.message)
  );
});

test('Claude: refusal을 감지한다', async () => {
  mockJson({ stop_reason: 'refusal', content: [] });
  await assert.rejects(
    () => new ClaudeProvider('k').generateCommitMessages('p', opts),
    /declined/i
  );
});

test('Claude: HTTP 상태별 메시지', async () => {
  for (const [status, re] of [[401, /Invalid API key/i], [429, /Rate limited/i], [500, /API error/i]]) {
    global.fetch = async () => ({ ok: false, status, json: async () => ({}) });
    await assert.rejects(() => new ClaudeProvider('k').generateCommitMessages('p', opts), re);
  }
});

// 회귀 방지: choices[0].message.content가 null이면 TypeError가 나던 경로
test('OpenAI: content_filter를 감지한다', async () => {
  mockJson({ choices: [{ finish_reason: 'content_filter', message: { content: null } }] });
  await assert.rejects(
    () => new OpenAIProvider('k').generateCommitMessages('p', opts),
    (e) => !(e instanceof TypeError) && /content filter/i.test(e.message)
  );
});

test('OpenAI: choices가 비면 실행 가능한 메시지로 실패한다', async () => {
  mockJson({ choices: [] });
  await assert.rejects(
    () => new OpenAIProvider('k').generateCommitMessages('p', opts),
    (e) => !(e instanceof TypeError) && /empty response/i.test(e.message)
  );
});

test('registry: 알 수 없는 프로바이더는 사용 가능 목록을 알려준다', () => {
  registerBuiltInProviders();
  assert.deepEqual(getAvailableProviders().sort(), ['claude', 'openai']);
  assert.throws(() => getProvider('gemini', 'k', {}), /Unknown provider: gemini.*claude, openai/);
});

test('기본 Claude 모델은 지원 중단된 ID가 아니다', () => {
  const model = new ClaudeProvider('k').model;
  assert.equal(model, 'claude-sonnet-5');
  assert.doesNotMatch(model, /-\d{8}$/, '날짜 접미사가 붙은 스냅샷 ID는 은퇴 대상이다');
});
