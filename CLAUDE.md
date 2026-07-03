# RTPM - Claude Code Project Memory
Version: v3
Last updated: 2026-07-03

## Project identity
App: RTPM Risk Manager - Viking Project demo
Live URL: https://rtpm-cf560.web.app
GitHub: https://github.com/HenningKristensenDK/RTPMgoogle
Working branch: claude/epic-feynman-wx9jhf
Local: C:\Users\henni\RTPMgoogle
Firebase project: rtpm-cf560 (europe-west1)

## How to work on this project (IMPORTANT)
- Edit code ONLY in Claude Code running inside PowerShell (terminal), never the desktop app Code tab (that runs in a sandbox that cannot reach this machine or deploy).
- After changes: npm run build && firebase deploy --only hosting --project rtpm-cf560
- Then commit and push: git add . / git commit / git push origin claude/epic-feynman-wx9jhf
- GitHub is the single source of truth. Ranjith now actively collaborates as a developer via his own VS Code + Claude Code setup, pushing directly to `claude/epic-feynman-wx9jhf` (not `main` — `main` is still just the original scaffold commit and has none of the real app; there is no merged PR yet, decide with Henning when/whether to open one).
- **First-time setup on a new machine (Ranjith or anyone else):** `git checkout claude/epic-feynman-wx9jhf` (not main) → `npm install` → copy `.env.example` to `.env` and fill in the Firebase web config (Console → Project settings → your web app) **plus `VITE_GEMINI_API_KEY`** (this key is required or AI chat throws immediately — it was missing from `.env.example` until 2026-07-03, now fixed) → `npm run dev`. `.env` and `serviceAccountKey.json` are gitignored on purpose and never travel with `git pull` — `serviceAccountKey.json` is only needed for the seed/backup scripts, not to run the app.
- Git push auth on Windows goes through Windows' Credential Manager (`git config credential.helper` = `manager`), shared system-wide across any git client on the machine (VS Code, terminal, Claude Code's Bash tool). If push fails with "Invalid username or token", it means no tool has authenticated yet on that machine — sign in once via VS Code's git integration (or `gh auth login`) and every other tool's pushes will then work using that same cached credential.
- Proof a deploy landed: the dist/assets JS hash changes (e.g. index-Cbm__NJd.js).
- A dev-server launch config now exists at `.claude/launch.json` (name: `dev`, runs `npm run dev` with `--port 5180 --strictPort` since port 5173 is often already occupied by a manually-started server) — use this instead of ad-hoc `npm run dev` when driving the app via Claude Code's browser preview tools.

## Tech stack
React + TypeScript + Tailwind + Vite (frontend)
Firebase Auth + Firestore + Hosting (backend)
Gemini gemini-2.0-flash via @google/generative-ai SDK (called direct from frontend - to be moved behind Cloud Function later)
Zustand (state)
react-markdown + @tailwindcss/typography (AI chat rendering)

## Firestore
Project ID (do NOT change): datacenter-vejle-phase-1
Display name shown to users: "Viking Project"
Collections: projects, risks, roles_and_responsibilities, risk_messages, organizations
Indexes: risk_messages (mode+riskId+timestamp), risks (projectId+createdAt)
Note: existing risk docs still hold old "DataCenter Vejle [diamond] Phase 1" string in Risk collection field - will be fixed on next re-seed, not yet done.

`roles_and_responsibilities` is one doc per workstream (id = slug, e.g. `civil-works`), not a flat RACI-row list. Fields: `workstream`, `description`, `interactionSummary` (unused in UI, kept in Firestore), `accountable` (`{name, organization, role}`, single — always the same PMC/Customer lead), `consulted` (`{name, organization, role}[]`, array, must always be populated), `responsibleCustomer`/`responsibleContractor` (`{name, organization, role} | null`, hard rule: max one person per side), `informedCustomer`/`informedContractor` (`{name, organization, role}[]`, arrays). "Owner/Employer" was renamed to "Customer" everywhere (2026-07-02) — the old flat schema (`organization`/`organizationName`/`person`/`type` fields) no longer exists.

`organizations` is the source of both the OBS diagram and the RACI tier grouping: `{orgId, name, tier, parentOrgId, roleType}`. A person's tier is derived at render time by matching their `organization` string against this collection (not stored per-person). Tier model (2026-07-03 redesign, mapped from a Claude Design System handoff — see `design_handoff_raci_view/README.md` for the original spec with a fictive team, not used verbatim): Tier 0 = Customer & PMC (customer, tier 0, "Customer PMO"; wsp-denmark, tier 0, "NT Advisor" — moved here from tier 1), Tier 1 = Main contractors (mt-hojgaard, "HD Contractor"), Tier 2 = Specialist sub-contractors (nordic-fitout, "FO Sub-Contractor"), Tier 3 = Vendors & suppliers (eq-supplier, "EQ Supplier" — new, invented for this update, parented under HD Contractor). Tier color codex: 0 indigo `#0d08d2`, 1 info-blue `#00acff`, 2 amber `#ff8b00`, 3 teal `#14B8A6`.

Roles & Responsibility page: Table/OBS diagram switch (top right) is the only primary view control — unchanged placement/styling, button labels now `whitespace-nowrap` so "OBS diagram"/"Table" never wrap. "+ Add workstream" is a separate CTA next to it with more breathing room (`gap-6` on their shared container) so the two don't read as one group. Within Table view, `groupBy=org` (one column per tier present in data, each person shown with an A/R/C/I badge) vs `groupBy=role` (flat Workstream/Accountable/Responsible(split by side)/Consulted/Informed columns, no zone shading — tier shown via colored pill per person instead) is **no longer a top-right toggle** — as of 2026-07-03 it's a lightweight "Group by: Tier / RACI" pill control living inside the legend bar itself (`LegendBar` in `src/pages/RolesResponsibility.tsx`, takes `raci`/`setRaci` props directly — smaller font/padding, no shadow, visually subordinate to the Table/OBS diagram buttons). Same `raci` boolean state and toggle logic as before, only the control's placement/weight changed. Page subheadline font-size is `text-[12px]`. OBS diagram (`OrgChart.tsx`) and its dynamic tier-band logic are untouched by this. Side-drawer editing (`RoleDrawer.tsx`) works from either group-by mode.

## Firebase Storage
Enabled 2026-07-03 (europe-west1, was never provisioned before that — the "Get Started" step in Firebase Console had never been clicked, so every upload attempt 404'd at the bucket level; this silently broke both risk Attachments and chat images from day one until fixed). `firebase.json` now has a `"storage": {"rules": "storage.rules"}` block (was missing, added so `firebase deploy --only storage` works) and `storage.rules` is deployed — any authenticated user can read/write anywhere (`allow read, write: if request.auth != null`), same permissiveness as Firestore rules, tighten later. Upload paths: `risks/{riskId}/...` (risk attachments, `uploadRiskAttachment` in `src/firebase/storage.ts`) and `risk_messages/{riskId}/...` (chat images, `uploadChatImage`). Note: right after any future `storage.rules` deploy, the very first upload can 403 for ~1 minute while rules propagate — retry, don't assume it's broken.

## Shell architecture (3 states)
landing / active / focus - in src/store/shellStore.ts
Components in src/components/shell/: Header, Sidebar, ProjectManagerPanel, LandingOverlay, MyTodosOverlay

## Brand tokens
Sidebar #070474, Header #090693, Primary #0d08d2, Light #e7e6fa
Yellow #ffcc00, Red #e63946, Orange #ff8b00, Green #28a745
Fonts: Barlow Condensed Bold (headlines), Montserrat (body)

## Current labels (after Group A)
Topbar: RTPM icon + "Viking Project"
Left sidebar agent: "Risk Management Agent"
Right panel AI: "Project Manager Agent"
Per-risk team chat title: "[riskId] Chat Log" (e.g. RK-014 Chat Log)
AI bot signature: "Risk Management Agent"

### A2 — Brand / topbar / logo (verified against `src/components/shell/Header.tsx`)
White header bar (`#ffffff`, 1px `#e6e6f0` border-bottom, 48px tall). Logo is `/rtpm-logo.svg` (44px height, auto width) + "Viking Project" (15px/600/`#070474`) over "RTPM Platform" (11px/`#8a8ca6`) stacked underneath. Right side: "My Todos" button, "Focus"/"Exit focus mode" toggle (active state `#e7e6fa` bg / `#0d08d2` text), a divider, then a 28px indigo (`#0d08d2`) initials-circle avatar + user's display name + sign-out icon.
**2026-07-03 fix**: Header previously pointed at `/RTPM icon navy.png`, a file that was never actually committed anywhere in git history (only ever existed locally on someone's machine at some point) — it 404'd in production, showing a broken image icon. Swapped to `/rtpm-logo.svg` (already committed, navy/indigo `#0c07cf` fill, correct for the white header background). A second asset, `/rtpm-icon-white.svg` (same icon shape, white fill), exists committed but is currently unused anywhere — candidate for the navy sidebar logo if that's ever added.

### Landing overlay — show once, not every refresh (`src/store/shellStore.ts`, fixed 2026-07-03)
`shellStore`'s `mode` used to always initialize to `"landing"`, so the splash (`LandingOverlay.tsx`) reappeared on every page refresh. Now gated by `localStorage["rtpm_landing_seen"]`: `mode` initializes to `"active"` if that key is set, `"landing"` otherwise; `setMode()` writes the flag the moment mode leaves `"landing"` (button click or Esc). Only reappears if that localStorage entry is cleared (different browser/profile, or manually cleared site data).

### B2 — Risk detail progress flow with changedBy trail (verified against `src/components/risk/RiskStatusBar.tsx`)
4-step horizontal tracker (Identified → Assessed → Mitigated → Resolved). Completed steps: green filled circle + checkmark, green connector lines, and **the step's label swaps from a generic role placeholder to the actual `changedBy` display name** once that transition has happened (falls back to a static `STEP_OWNER` role title — Package PM / Lead Scheduler / Quality Manager / Commissioning Authority — until it does). The immediate next step gets an indigo outline; dates render under completed steps from `risk.statusHistory` (Resolved falls back to showing the due date in orange if not yet resolved). Clicking any step opens a confirm modal before calling `onChangeStatus`.

### C — Send Update + R&R lookup (partial, verified against `SendUpdateModal.tsx` / `WorkstreamLookup.tsx`)
Send Update modal (risk detail page) resolves recipients by matching the risk's linked workstream(s) against `roles_and_responsibilities`: "To" = `responsibleCustomer` + `responsibleContractor` (skips nulls), "Cc" = every entry in `informedCustomer` + `informedContractor`. "Look up in R&R" (from Risk Metadata) is a read-only per-workstream picker showing each workstream's Accountable. Still open: per-module dashboard + To Do chart (Contractor/Customer split) mentioned in GROUP C below.

## Modules
Built: Dashboard, Risk Management, Roles & Responsibility
Not built: Documents, Correspondence, NCR, RFI, Change Management, Interface Management, Technical Query, Time Log, Site Inspection, Permit & Compliance, Project Economics

### Dashboard (verified against `src/pages/Dashboard.tsx`)
Milestone timeline dates are **hardcoded** in a `MILESTONES` const (NTP 2026.03.01 → COD 2027.09.30) — not read from any project settings/master-data record. There is no project master-data screen anywhere in the app yet (`src/pages/` has no settings/config page) — if milestone dates or other project-level facts ever need to be editable, that screen doesn't exist and would need to be built from scratch.

## Just changed, visually verified this session
- **The R&R/RACI/OBS diagram tier-model redesign (2026-07-03)** — confirmed via screenshots across all three surfaces: OBS diagram, the RACI (group-by-role) table, and the Roles & Responsibility (group-by-tier) table. Tier 0 = Customer PMO + NT Advisor, Tier 1 = HD Contractor, Tier 2 = FO Sub-Contractor, Tier 3 = EQ Supplier (Rasmus Iversen) — all render correctly with the right people under the right tier, and the OBS diagram picked up the new tiers with zero code changes (confirming its tier-driven, non-hardcoded layout works as designed). Schema: `consulted` is an array (unlimited, must always be populated), `accountable` stays single-person, `responsibleCustomer`/`responsibleContractor` capped at exactly one person per side.
- **R&R header/toggle hierarchy fix (2026-07-03)** — the previously-approved mockup is now built: Table/OBS diagram is the sole top-right view switcher (labels `whitespace-nowrap`, never break to two lines), "+ Add workstream" sits further apart from it as a clearly separate CTA, the Tier/RACI group-by toggle moved into the legend bar as a smaller/lighter "Group by: Tier / RACI" pill pair, and the subheadline is `12px`. Verified live via DOM inspection (computed styles + click-through) that the toggle still drives the same `raci` state and the heading/table content switch correctly both ways.
- **Risk Board summary dashboard (2026-07-03)** — new `src/components/risk/RiskSummaryDashboard.tsx`, rendered above the table in `RiskBoard.tsx` Table view only (not Board view). Four cards: Total risks (hero, with a completed/pending progress bar), Completed/Pending rings, Workstream bar chart, To Do (Responsible vs Informed counts). Every workstream bar and every To Do bar is clickable and cross-filters the table below it (click again, or click blank space in that card, to clear) — this filter is separate from the dropdown filters above and only narrows the table, not the dashboard's own counts. Table view is now the default (`useState<View>("table")`, was `"board"`).
- **Risk detail is now a dimmed modal popup, not a full-page route (2026-07-03)** — `RiskDetail.tsx` renders as a `fixed inset-0` dimmed-backdrop card (`max-w-6xl`, `h-[88vh]`) instead of replacing the whole page. Implemented via React Router's "background location" pattern in `App.tsx`: opening a risk from the Board/Table/Card passes `navigate(path, { state: { background: location } })`, which keeps `RiskBoard` mounted and rendered behind the popup while a second, separate `<Routes>` renders `RiskDetail` on top using the real current location. Back/X/backdrop-click all call one `close()` that always `navigate("/risks")` — it no longer ever sends you to `/` (Dashboard), which was the bug before.
- **Refresh always lands on the Risk Board table, never reopens the popup (2026-07-03)** — react-router persists `navigate()`'s `state` (including the `background` location) across a hard browser refresh via the History API, so a naive fix would keep reopening the popup on refresh. `App.tsx` detects an actual reload via the Navigation Timing API (`performance.getEntriesByType("navigation")[0].type === "reload"`) and ignores the stale background state **only for the specific history entry that was already active when the reload happened** (compared via `location.key`) — any subsequent in-app navigation still opens the popup normally. Direct/fresh navigation to a `/risks/:riskId` URL with no background state at all (e.g. a raw bookmark) also redirects to `/risks` rather than rendering the popup standalone.
- **New Risk no longer writes to Firestore on click (2026-07-03)** — new `src/components/risk/NewRiskModal.tsx` replaces the old instant-`createRisk`-then-navigate flow. Clicking "New Risk" opens a small modal (Title/Priority/Due date/Workstream); nothing is created until you explicitly click "Create risk". Closing with nothing entered just closes silently; closing after entering something prompts "Discard this risk?" with Keep editing / Discard / Save risk.
- **Per-row delete on the Risk Board table (2026-07-03)** — trash icon per row, opens a confirm modal (matching `RiskStatusBar`'s existing confirm-modal style) before calling the new `deleteRisk()` in `firestore.ts` (a real hard `deleteDoc`, no undo/trash).
- **Chat: rich text + image/screenshot attachments (2026-07-03)** — `ChatInput.tsx` has a small Markdown toolbar (bold/italic/list/code/link) and an image-attach button; pasting an image (e.g. Win+Shift+S screenshot) directly into the textarea also attaches it. `ChatMessages.tsx` now renders every message (not just the AI agent's) through `ReactMarkdown` + `@tailwindcss/typography`, and shows attached images as thumbnails with a click-to-enlarge lightbox. `RiskMessage.images?: string[]` added to `types.ts`. Uploads go through the newly-fixed Firebase Storage (see Firebase Storage section above) — **before that was fixed, image messages silently failed and left blank/empty messages in real chat history** (at least two such orphaned messages exist in RK-022's history from before the fix; left alone per Ranjith's call, no delete-message UI exists yet if cleanup is ever wanted). The "Switched to Team Chat"/"Switched to Risk Management Agent" system message on every mode toggle was removed (`ChatPanel.tsx`'s `switchMode()` no longer calls `sendMessage`). Own-message bubble color lightened from `#0d08d2` to `#5b56e8` (was reported as "too dark").
- **Custom domain in progress (2026-07-03)** — `app.rtpm.dk` added as a custom domain in Firebase Hosting (Console → rtpm-cf560 → Hosting), CNAME record (`app` → `rtpm-cf560.web.app`) added at Simply.com (where `rtpm.dk`'s DNS is managed). Verification was pending/erroring at time of writing — likely just DNS propagation delay, retry Verify in the Firebase Console. This only adds the `app` subdomain; the existing `rtpm.dk` website and all its DNS records (A, MX, SRV for mail/calendar, etc.) are untouched.

## Demo context
Client: Henning Kristensen, Project director, Customer PMO
Demo target: August 2026
Mandate: Google-only tooling

Note (2026-07-02): all seed/demo data uses genericized names (Customer PMO / HD Contractor / NT Advisor / FO Sub-Contractor) after a real client name and firm name were found leaked into seed data and purged from Firestore, seed scripts and this file. Do not reintroduce real client/firm names into seed data.

## Open items / next priorities
1. GROUP B - left menu as main nav with all modules in frequency order (Dashboard, Time Log, Documents, Correspondence, Site Inspection, NCR, Risk, Permit, Change, Project Economics, Roles last). Correspondence is a cross-cutting view with type filter (RFI/TQ/Meeting Minutes/Variation/Site Instruction/EOT/Inspection Request) - not separate modules.
2. GROUP C - "Send Update" button (top-right of every item) that looks up Responsible (one per party) + Informed from R&R matrix and pre-fills a send popup. Plus per-module dashboard + To Do chart (Contractor/Customer split). Plus Informed lookup in R&R. (Send Update modal itself is built on the risk detail page; per-module dashboard/To Do chart still open.)
3. GROUP D - project dashboard: milestone timeline, KPI cards, performance chart, risk-by-workstream RAG, ball-count by Next-Step Owner.
4. GROUP E (from Gemini Gem) - Cloud Functions + secure Gemini key, inject R&R into AI context, Firestore-to-Sheets sync for Looker.
5. GROUP F - Looker Studio dashboard + "Generate Weekly Report" button (demo finale).
6. Re-seed Firestore to clear old project name + diamond encoding in existing risk docs.
7. Decide: should the per-risk agent know the whole project or only its own risk? (Currently only its own.)
8. Finish verifying `app.rtpm.dk` custom domain (DNS/CNAME added at Simply.com 2026-07-03, verification pending in Firebase Console).
9. Decide with Henning whether/when to open a PR merging `claude/epic-feynman-wx9jhf` into `main` — `main` currently has none of the real app.

## Known issues
- Existing Firestore risk docs show "DataCenter Vejle [diamond] Phase 1" until re-seed
- The ◆ (mangled encoding, likely from a mojibake'd em-dash/degree-sign) appearing in several risk `notes`/`title` strings is baked into the Firestore documents themselves, not a display bug — fixing it needs a **source-level re-seed** (correcting the string in `seedData.ts`/seed scripts, then re-writing the affected documents), not a find/replace at render time.
- Real client/company names have leaked into R&R seed data more than once already (see the genericized-names note above and the leak-purge fix on 2026-07-02) — stay alert for this recurring, especially now that this session's tier-model update added a new team member/org (EQ Supplier / Rasmus Iversen). Never reuse a real person or company name when authoring seed data.
- serviceAccountKey.json must never be committed
- Gemini key currently exposed in frontend bundle - to be secured via Cloud Function (Group E)
- Two blank/empty messages exist in risk RK-022's real chat history from before Firebase Storage was enabled (image upload silently failed, leaving a message with no text/image) — cosmetic only, left as-is per Ranjith's call; no delete-message UI exists yet
- A throwaway test auth account (`testdebug@example.com`, display name "Debug Tester") was created in the live `rtpm-cf560` Firebase Auth during debugging on 2026-07-03 — safe to delete from Console → Authentication whenever convenient, not urgent
- `main` branch is 30+ commits behind `claude/epic-feynman-wx9jhf` and still holds only the original scaffold — do not assume `main` reflects the live app
