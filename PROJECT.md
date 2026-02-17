# ClawBotList — Project Spec (Semantically Compressed)

## Vision
Directory/catalog of personal AI agents ("claws") — autonomous assistants running locally, bridging LLMs with OS/messaging apps. NOT coding assistants.

Domain: clawbotlist.com
Stack: SvelteKit + Cloudflare Workers + D1 (SQLite) + Drizzle ORM
Design: COSS UI visual inspiration (coss.com/ui), OpenAlternative card layout (openalternative.co), devsuite.co layout

## Architecture

### Orchestration
- CTO = heartbeat every 15min, reads PROJECT.md, delegates work
- Ralph Orchestrator = coding/build loops (Planner → Builder → Validator → Committer)
- Subagents = research, content, deploy, data refresh
- CTO never spawns Ralph if previous run still active (`pgrep -f ralph`)
- State on disk, not in context. Fresh context each iteration

### CTO Flow (heartbeat)
1. Read PROJECT.md
2. Check if ralph process alive → YES: wait → NO: continue
3. Check last run result (LOOP_COMPLETE or crash → resume)
4. Pick next task, spawn appropriate executor
5. Update PROJECT.md with result

### Models (CRITICAL - no old models allowed)
- Planner: gpt-5.2 high (thorough planning)
- Builder/Coder: gpt-5.3-codex high
- Scout/Research: gpt-5.3-codex-spark
- Reviewer PRIMARY: gpt-5.2 high (catches edge cases, details)
- Reviewer SECONDARY: claude-opus-4-6 (second opinion, paired with gpt-5.2)
- FORBIDDEN: claude-sonnet-4, claude-3.5-*, any deprecated model

### Review Process
Two rounds: gpt-5.2 reviews first, then opus gets that review and confirms/adds. gpt-5.2 leads.

## Data Model (adapted from OpenAlternative)
Each project card shows:
- Name, slug, description, tagline
- GitHub: stars, contributors, last commit, forks, watchers
- Language (TS/Go/Rust/Python)
- Engine under the hood (pi, Claude Code, custom, etc.)
- License
- Topics/tags
- Health score (OpenAlternative algorithm: stars/forks/contributors weighted by age + commit recency penalty)
- Website URL, repo URL, favicon, screenshot

## Tech Rules
- llms-full.txt docs in docs/llms/ (.gitignored) — agents MUST read before coding each layer
- NEVER hardcode versions in package.json — always `bun add <package>`
- Reference code from OpenAlternative in docs/reference/

## Seed Projects (~20 personal AI agents)
Research needed. Known so far:
- openclaw/openclaw (204k stars, TS) — the original viral agent
- HKUDS/nanobot (20k stars, Python) — ultra-lightweight
- qwibitai/nanoclaw (9k stars, TS) — container-based
- cloudflare/moltworker (8.8k stars, TS) — runs on CF Workers
- mikeyobrien/rho (253 stars, TS) — pi-based, always-on
- Significant-Gravitas/AutoGPT (181k stars, Python) — original autonomous agent
- crewAIInc/crewAI (44k stars, Python) — multi-agent orchestration
- More needed: memU, Knolli, PicoClaw, IronClaw, ZeroClaw, bitdoze-bot, Agent S3, AnythingLLM, SuperAGI, Jan.ai

## Visual Design
- Cards: favicon + name + tagline + stats row (stars, contributors, last commit)
- Hover: expanded description + engine + language
- Grid layout, filterable by: language, engine, stars range, activity
- Particles/effects from COSS UI
- Dark mode default

## Files Structure
```
clawbotlist/
├── .agents/tasks/           # task tracking
├── .ralph/specs/            # ralph orchestrator specs
├── .ralph/agent/            # ralph state
├── docs/
│   ├── llms/                # framework docs (.gitignored)
│   └── reference/           # OpenAlternative reference code
├── src/                     # SvelteKit app (to be created)
├── PROJECT.md               # this file
├── ralph-clawbotlist.yml    # ralph config
└── .gitignore
```

## Credentials Needed (from user)
- [ ] Cloudflare API token (Workers, D1, DNS, Pages scope)
- [ ] Domain clawbotlist.com (bought on Cloudflare)
- [ ] GitHub PAT token (repo, workflow scope)
- [ ] GitHub token for GraphQL API (repo stats)

## Status
- [x] Project spec written
- [x] Ralph installed (v2.5.1)
- [x] llms docs downloaded (SvelteKit, Drizzle, CF D1/Workers/Pages, Hono)
- [x] Reference code saved (OpenAlternative GitHub queries, scoring, card, schema)
- [x] Semantic compression skill installed
- [x] Ralph config written (ralph-clawbotlist.yml)
- [x] Full seed list researched (~20 projects with repos)
- [x] .gitignore created
- [x] PROMPT.md created
- [x] git repo initialized
- [x] Review round 1 completed
- [ ] CTO heartbeat configured
- [ ] Credentials obtained from user
- [ ] SvelteKit app scaffolded
