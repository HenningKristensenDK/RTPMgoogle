# RTPM - Claude Code Project Memory
Version: v2
Last updated: 2026-06-27

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
- GitHub is the single source of truth. A developer (Ranjith) will collaborate via GitHub.
- Proof a deploy landed: the dist/assets JS hash changes (e.g. index-Cbm__NJd.js).

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

Roles & Responsibility page: Table/OBS diagram switch (top right), default Table shows the OBS diagram unchanged (`src/components/roles/OrgChart.tsx`, dynamic tier bands — no code changes needed when tiers/orgs change, only data). Within Table view, a further Table/RACI toggle in `src/pages/RolesResponsibility.tsx` swaps between `groupBy=org` (one column per tier present in data, each person shown with an A/R/C/I badge) and `groupBy=role` (flat Workstream/Accountable/Responsible(split by side)/Consulted/Informed columns, no zone shading — tier shown via colored pill per person instead). A legend bar (RACI meaning + tier codex) sits above both. Side-drawer editing (`RoleDrawer.tsx`) works from either sub-view.

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

## Modules
Built: Dashboard, Risk Management, Roles & Responsibility
Not built: Documents, Correspondence, NCR, RFI, Change Management, Interface Management, Technical Query, Time Log, Site Inspection, Permit & Compliance, Project Economics

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

## Known issues
- Existing Firestore risk docs show "DataCenter Vejle [diamond] Phase 1" until re-seed
- serviceAccountKey.json must never be committed
- Gemini key currently exposed in frontend bundle - to be secured via Cloud Function (Group E)
