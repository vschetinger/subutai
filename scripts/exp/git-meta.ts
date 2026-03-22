import { execSync } from 'node:child_process';

export function getGitMeta(): { git_commit: string; branch: string; dirty: boolean } {
  try {
    const commit = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    const status = execSync('git status --porcelain', { encoding: 'utf-8' }).trim();
    return { git_commit: commit, branch, dirty: status.length > 0 };
  } catch {
    return { git_commit: 'unknown', branch: 'unknown', dirty: false };
  }
}
