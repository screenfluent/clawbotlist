# ClawBotList - Ralph Entry Prompt

Read `PROJECT.md` for full project context, goals, architecture, and data model.

## Current Task
Check `.ralph/specs/` for the active task breakdown and implementation plan.
Find the first task with `status: pending` and execute it.

## Guardrails
- **docs/llms/** - Read the relevant file BEFORE coding each layer. These contain framework-specific API refs and constraints.
- **Dependencies** - Always `bun add <pkg>`. Never hardcode versions in package.json.
- **Models** - Use only current-gen models as specified per hat. No claude-sonnet-4, no claude-3.5-*, no deprecated models.
- **Fresh context** - Re-read PROJECT.md and task files each iteration. Don't rely on stale memory.
- **YAGNI** - No speculative features. Build what's needed now.
- **KISS** - Simplest solution that works.
