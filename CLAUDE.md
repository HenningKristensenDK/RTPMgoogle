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
Collections: projects, risks, roles_and_responsibilities, risk_messages
Indexes: risk_messages (mode+riskId+timestamp), risks (projectId+createdAt)
Note: existing risk docs still hold old "DataCenter Vejle [diamond] Phase 1" string in Risk collection field - will be fixed on next re-seed, not yet done.

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
Client: Claus Risum Korsgaard, Project Director, Turner & Townsend
Demo target: August 2026
Mandate: Google-only tooling

## Open items / next priorities
1. GROUP B - left menu as main nav with all modules in frequency order (Dashboard, Time Log, Documents, Correspondence, Site Inspection, NCR, Risk, Permit, Change, Project Economics, Roles last). Correspondence is a cross-cutting view with type filter (RFI/TQ/Meeting Minutes/Variation/Site Instruction/EOT/Inspection Request) - not separate modules.
2. GROUP C - "Send Update" button (top-right of every item) that looks up Responsible (one per party) + Informed from R&R matrix and pre-fills a send popup. Plus per-module dashboard + To Do chart (Contractor/Owner split). Plus Informed lookup in R&R.
3. GROUP D - project dashboard: milestone timeline, KPI cards, performance chart, risk-by-workstream RAG, ball-count by Next-Step Owner.
4. GROUP E (from Gemini Gem) - Cloud Functions + secure Gemini key, inject R&R into AI context, Firestore-to-Sheets sync for Looker.
5. GROUP F - Looker Studio dashboard + "Generate Weekly Report" button (demo finale).
6. Re-seed Firestore to clear old project name + diamond encoding in existing risk docs.
7. Decide: should the per-risk agent know the whole project or only its own risk? (Currently only its own.)

## Known issues
- Existing Firestore risk docs show "DataCenter Vejle [diamond] Phase 1" until re-seed
- serviceAccountKey.json must never be committed
- Gemini key currently exposed in frontend bundle - to be secured via Cloud Function (Group E)
