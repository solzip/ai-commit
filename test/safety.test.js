import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { execCommit, getStagedDiff } from '../src/core/git.js';
import { truncateDiff } from '../src/core/prompt.js';

let repo;
const cwd = process.cwd();

before(() => {
  repo = mkdtempSync(join(tmpdir(), 'aicommit-test-'));
  process.chdir(repo);
  execFileSync('git', ['init', '-q', '.']);
  execFileSync('git', ['config', 'user.email', 'test@example.com']);
  execFileSync('git', ['config', 'user.name', 'test']);
});

after(() => {
  process.chdir(cwd);
  rmSync(repo, { recursive: true, force: true });
});

// 회귀 방지: execSync + JSON.stringify는 POSIX 셸에서 $(...)를 평가했다
test('커밋 메시지가 셸에서 평가되지 않는다', () => {
  writeFileSync(join(repo, 'a.txt'), 'hello\n');
  execFileSync('git', ['add', 'a.txt']);

  const payload = 'feat: pwn $(touch injected.txt) `touch injected2.txt`';
  execCommit(payload);

  assert.ok(!existsSync(join(repo, 'injected.txt')), '$(...) 가 실행되었다');
  assert.ok(!existsSync(join(repo, 'injected2.txt')), '백틱이 실행되었다');

  const subject = execFileSync('git', ['log', '-1', '--pretty=%s'], { encoding: 'utf-8' }).trim();
  assert.equal(subject, payload, '메시지는 문자 그대로 저장되어야 한다');
});

// 회귀 방지: maxBuffer 1MB 기본값 때문에 lockfile 규모 diff에서 죽었다
test('1MB를 넘는 staged diff를 읽어낸다', () => {
  writeFileSync(join(repo, 'big.txt'), 'line of representative content\n'.repeat(80_000));
  execFileSync('git', ['add', 'big.txt']);

  const diff = getStagedDiff();
  assert.ok(diff.length > 1024 * 1024, `diff가 1MB를 넘어야 유효한 테스트다 (${diff.length})`);

  const { diff: out, truncated } = truncateDiff(diff, 15_000);
  assert.equal(truncated, true);
  assert.ok(out.length <= 15_000);
  assert.ok(out.startsWith('[Diff Stats]'), '잘릴 때는 통계 요약을 앞에 붙인다');
});

test('한도 이하 diff는 그대로 통과한다', () => {
  const small = 'diff --git a/x b/x\n+hello\n';
  assert.deepEqual(truncateDiff(small, 15_000), { diff: small, truncated: false });
});

// 회귀 방지: 마법사가 loadConfig()를 써서 환경변수 키를 디스크에 기록했다
test('환경변수 키는 설정 파일 값에 섞이지 않는다', async () => {
  const home = mkdtempSync(join(tmpdir(), 'aicommit-home-'));
  const prev = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  process.env.AI_COMMIT_CLAUDE_KEY = 'sk-ant-FROM-ENV';

  writeFileSync(
    join(home, '.ai-commit.json'),
    JSON.stringify({ provider: 'claude', claudeApiKey: 'sk-ant-FROM-FILE' })
  );

  // CONFIG_PATH가 모듈 로드 시점에 정해지므로 env를 세팅한 뒤 import 한다
  const { loadConfig, loadFileConfig } = await import(
    `../src/core/config.js?t=${Date.now()}`
  );

  assert.equal(loadConfig().claudeApiKey, 'sk-ant-FROM-ENV', '실행 시에는 환경변수가 우선한다');
  assert.equal(
    loadFileConfig().claudeApiKey,
    'sk-ant-FROM-FILE',
    '마법사가 쓰는 값에는 환경변수 키가 없어야 한다'
  );

  const onDisk = readFileSync(join(home, '.ai-commit.json'), 'utf-8');
  assert.ok(!onDisk.includes('FROM-ENV'), '환경변수 키가 디스크에 기록되었다');

  delete process.env.AI_COMMIT_CLAUDE_KEY;
  process.env.HOME = prev.HOME;
  process.env.USERPROFILE = prev.USERPROFILE;
  rmSync(home, { recursive: true, force: true });
});
