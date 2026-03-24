import { getStagedDiffStat } from './git.js';

export function truncateDiff(diff, maxLength) {
  if (diff.length <= maxLength) return { diff, truncated: false };

  const stat = getStagedDiffStat();
  const statSection = `[Diff Stats]\n${stat}\n\n[Partial Diff]\n`;
  const remaining = maxLength - statSection.length;

  if (remaining <= 0) {
    return { diff: stat, truncated: true };
  }

  return {
    diff: statSection + diff.slice(0, remaining),
    truncated: true,
  };
}

export function buildPrompt(diff, options) {
  const { language = 'en', conventionalCommit = true, gitmoji = false, maxSuggestions = 3 } = options;

  const langInstruction = language === 'ko'
    ? 'Write commit messages in Korean. The type prefix (feat, fix, etc.) stays in English.'
    : 'Write commit messages in English.';

  let formatInstruction;
  if (gitmoji && conventionalCommit) {
    formatInstruction = `Use Gitmoji + Conventional Commits format: <emoji> <type>(<scope>): <description>
Gitmoji mapping: ✨=feat, 🐛=fix, ♻️=refactor, 📝=docs, 💄=style, ✅=test, 🔧=chore, ⚡=perf, 👷=ci, 📦=build, 🔥=remove, 🚀=deploy, 🔒=security, ⬆️=upgrade, 🎨=format`;
  } else if (gitmoji) {
    formatInstruction = `Use Gitmoji format: <emoji> <description>
Gitmoji mapping: ✨=new feature, 🐛=bug fix, ♻️=refactor, 📝=docs, 💄=style, ✅=test, 🔧=config, ⚡=performance, 🔥=remove, 🚀=deploy`;
  } else if (conventionalCommit) {
    formatInstruction = 'Follow Conventional Commits format: <type>(<scope>): <description>\nTypes: feat, fix, refactor, docs, style, test, chore, perf, ci, build';
  } else {
    formatInstruction = 'Write clear, descriptive commit messages.';
  }

  const example = gitmoji
    ? '["✨ feat(auth): add login endpoint", "🐛 fix(api): resolve timeout issue", "♻️ refactor: simplify middleware"]'
    : '["feat(auth): add login endpoint", "feat: implement auth flow", "feat(auth): add JWT support"]';

  return `You are a git commit message generator.
Analyze the following git diff and generate ${maxSuggestions} commit messages.

Rules:
- ${formatInstruction}
- ${langInstruction}
- Keep messages concise (max 72 chars for subject line)
- Focus on WHAT changed and WHY

Git Diff:
\`\`\`
${diff}
\`\`\`

Respond ONLY with a JSON array of strings. Example:
${example}

No explanation, no markdown, just the JSON array.`;
}
