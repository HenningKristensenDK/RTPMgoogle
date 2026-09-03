---
description: Build, deploy to Firebase Hosting, and push to GitHub — the standard end-of-session workflow for this project.
---

Run this project's standard ship workflow, in order, stopping and reporting back if any step fails:

1. `npm run build` — must succeed with no TypeScript errors before continuing.
2. `firebase deploy --only hosting --project <current project ID — check .firebaserc, and CLAUDE.md's "CRITICAL" section if unsure which project is currently live>` — confirm the deploy output shows a new JS asset hash (proof the new build actually shipped, not a cached one).
3. Review `git status`/`git diff` for what changed this session, stage the relevant files (never `git add -A`/`git add .` blindly — check for anything unexpected first), and commit with a message describing *why*, not just *what*.
4. `git push origin claude/epic-feynman-wx9jhf` (this project's working branch — **not** `main`, which is still the original scaffold).

Only do steps 3–4 if the user has asked to commit/push in this session (per this project's standing instructions, never commit unprompted). If just asked to "deploy," steps 1–2 alone are enough.
