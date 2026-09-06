# CURRENT

Current milestone: M4 (adapters + compiler oracles + rename)

Current implementation slice: same-file `rename` patch that retargets lockfile nids.

## What is working

- M0–M3 language, lockfile, query/get, `replace_expr`, `extern`, effects
- `@forgeir/http.get` thin `fetch` facade; `net` → async TS
- Compiler oracles: 11/11 via `pnpm bench` (no scores)
- `rename` patch (fn, extern, record) preserves symbol nids in `forge.lock.json`

## What is incomplete

- LLM token harness / `bench-vX` / published scores
- `use` / multi-file modules / cross-file rename
- Patch ops other than `replace_expr` and `rename`
- Stay-on-TS vs native `core` decision

## Current blockers

None.

## Next highest-priority actions

1. LLM token harness (frozen prompts; no README numbers until N ≥ 3)
2. Extra patch ops / `use`
3. Stay-on-TS vs native `core`

## Relevant files

- `packages/patch/src/index.ts`
- `packages/ir/src/lock.ts`
- `packages/cli/src/main.ts`
- `docs/agent/ids.md`

## Relevant tests

- `tests/rename.test.ts`
- `tests/e2e/rename.test.ts`
- `tests/mcp.test.ts`

## Last validated state

```
Last validated commit: 09b39ae
Current milestone: M4
Completed: rename patch retargets lockfile nids
In progress: none
Known issue: TS `number` emit is not i64-accurate (ADR-002); silent name edits still allocate a new nid
Next recommended action: LLM harness or `use`
Validation commands: pnpm test && pnpm typecheck && pnpm bench
```
