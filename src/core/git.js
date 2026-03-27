import { execSync } from 'child_process';

export function isGitRepo() {
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

export function getStagedDiff() {
  const diff = execSync('git diff --staged', { encoding: 'utf-8', maxBuffer: 1024 * 1024 });
  return diff.trim();
}

export function getStagedDiffStat() {
  const stat = execSync('git diff --staged --stat', { encoding: 'utf-8' });
  return stat.trim();
}

export function getStagedFiles() {
  const files = execSync('git diff --staged --name-only', { encoding: 'utf-8' });
  return files.trim();
}

export function execCommit(message) {
  execSync(`git commit -m ${JSON.stringify(message)}`, { stdio: 'pipe' });
}
