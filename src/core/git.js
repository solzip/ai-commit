import { execFileSync, execSync } from 'child_process';

export function isGitRepo() {
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// diff는 truncateDiff()에서 프로바이더 한도로 줄이므로, 읽는 단계에서
// 막힐 이유가 없다. 기본값 1MB는 lockfile 재생성 하나로도 넘는다.
const MAX_BUFFER = 256 * 1024 * 1024;

export function getStagedDiff() {
  const diff = execSync('git diff --staged', { encoding: 'utf-8', maxBuffer: MAX_BUFFER });
  return diff.trim();
}

export function getStagedDiffStat() {
  const stat = execSync('git diff --staged --stat', { encoding: 'utf-8', maxBuffer: MAX_BUFFER });
  return stat.trim();
}

export function getStagedFiles() {
  const files = execSync('git diff --staged --name-only', {
    encoding: 'utf-8',
    maxBuffer: MAX_BUFFER,
  });
  return files.trim();
}

export function execCommit(message) {
  // 셸을 거치지 않고 인자를 직접 전달한다.
  // 셸 경유 시 메시지 안의 $(...), 백틱이 POSIX 셸에서 평가된다.
  execFileSync('git', ['commit', '-m', message], { stdio: 'pipe' });
}
