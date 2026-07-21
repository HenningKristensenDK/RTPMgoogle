#!/usr/bin/env node
/**
 * PreToolUse hook (Bash matcher). Blocks `git commit` if a staged file looks
 * like a credential (.env*, serviceAccountKey.json) — both are gitignored on
 * purpose (see CLAUDE.md), this is a safety net for `git add -f` or a new
 * secret file that isn't covered by an existing .gitignore pattern yet.
 */
const { execSync } = require("child_process");

let input = "";
process.stdin.on("data", (d) => (input += d));
process.stdin.on("end", () => {
  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    process.exit(0);
  }

  const command = (payload?.tool_input?.command || "").trim();
  if (!/^git commit\b/.test(command)) process.exit(0);

  let staged = "";
  try {
    staged = execSync("git diff --cached --name-only", { encoding: "utf8" });
  } catch {
    process.exit(0);
  }

  const matches = staged
    .split("\n")
    .map((f) => f.trim())
    .filter((f) => /(^|\/)(\.env(\..*)?|serviceAccountKey\.json)$/.test(f));

  if (matches.length > 0) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: `Blocked: staged file(s) look like credentials: ${matches.join(
            ", "
          )}. Unstage with 'git restore --staged <file>' first — .env and serviceAccountKey.json must never be committed (see CLAUDE.md).`,
        },
      })
    );
  }
  process.exit(0);
});
