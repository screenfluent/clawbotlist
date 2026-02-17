# ClawBotList deploy runbook

## 1) Prerequisites

- Bun installed
- Cloudflare account access to Worker + D1 database (`clawbotlist-db`)
- Wrangler auth (`bunx wrangler login`) or CI token auth

## 2) Environment variables

| Variable | Required | Used in | Purpose |
| --- | --- | --- | --- |
| `GITHUB_TOKEN` | yes (for refresh) | `src/lib/server/github/client.ts` via `db:refresh:metrics:local` | GitHub GraphQL repo metrics fetch |
| `SEED_D1_DATABASE` | optional | `src/lib/server/projects/seed-import.ts`, `src/lib/server/projects/refresh-metrics.ts` | Override D1 database name (default: `clawbotlist-db`) |
| `CLOUDFLARE_API_TOKEN` | recommended for CI/non-interactive deploy | Wrangler (`deploy`, D1 migration commands) | Auth for deploy/migrations without browser login |
| `CLOUDFLARE_ACCOUNT_ID` | recommended for CI | Wrangler | Select account for token-based deploy |

Example local `.env`:

```bash
GITHUB_TOKEN=ghp_xxx
SEED_D1_DATABASE=clawbotlist-db
```

## 3) Local database workflow

```bash
bun run db:migrate:local
bun run db:seed:local
bun run db:refresh:metrics:local
```

Single project refresh:

```bash
bun run db:refresh:metrics:local -- --slug openclaw-openclaw
```

## 4) Quality gates (must be green before deploy)

```bash
bun run check
bun run test
bun run build
bun run deploy:dry-run
```

## 5) Production deploy workflow

Apply remote schema migrations:

```bash
bun run db:migrate:remote
```

Seed remote D1 dataset:

```bash
bun run db:seed:remote
```

Deploy Worker:

```bash
bun run deploy
```

Post-deploy smoke check:

```bash
bunx wrangler d1 execute clawbotlist-db --remote --command "SELECT COUNT(*) AS projects FROM projects;"
```

## 6) Troubleshooting

### Missing token

- Symptom: refresh command fails with message mentioning missing token or `GITHUB_TOKEN`.
- Fix: export `GITHUB_TOKEN` (with GraphQL access) and rerun `bun run db:refresh:metrics:local`.

### DB binding mismatch

- Symptom: `no such table: projects`, wrong database, or updates not visible.
- Fixes:
  - Verify `wrangler.jsonc` has D1 binding `DB` pointing to `clawbotlist-db`.
  - If using another DB name, set `SEED_D1_DATABASE` accordingly.
  - Re-run migration: `bun run db:migrate:local` or `bun run db:migrate:remote`.

### Empty dataset

- Symptom: homepage renders but shows 0 projects.
- Fixes:
  - Run seed command for target environment (`bun run db:seed:local` or `bun run db:seed:remote`).
  - Confirm row count with `wrangler d1 execute ... SELECT COUNT(*) FROM projects`.
