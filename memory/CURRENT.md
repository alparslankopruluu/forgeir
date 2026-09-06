# CURRENT

Current milestone: M4 (adapters + compiler oracles)

Current implementation slice: `@forgeir/http` over fetch; `pnpm bench` oracles.

## What is working

- M0–M3 language, lockfile, query/get, `replace_expr`, `extern`, effects
- `@forgeir/http.get` thin `fetch` facade (`examples/http`)
- `net` functions emit as `async` TypeScript; `forge run --allow net`
- Compiler oracles: 11/11 via `pnpm bench` (no scores)

## What is incomplete

- LLM token harness / `bench-vX` / published scores
- `use` / multi-file modules
- Rename-preserving nids
- Patch ops other than `replace_expr`
- Stay-on-TS vs native `core` decision

## Current blockers

None.

## Next highest-priority actions

1. LLM token harness (frozen prompts; no README numbers until N ≥ 3)
2. Rename-preserving nids
3. Extra patch ops / `use`

## Relevant files

- `packages/http/src/index.js`
- `packages/emit-ts/src/emit.ts`
- `benches/harness.ts`
- `benches/oracles.ts`
- `examples/http/main.fir`

## Relevant tests

- `tests/http.test.ts`
- `tests/e2e/http.test.ts`
- `tests/e2e/bench.test.ts`

## Last validated state

```
Last validated commit: 212a52b
Current milestone: M4
Completed: forge.http fetch facade; compiler oracles (11); net→async emit
In progress: none
Known issue: TS `number` emit is not i64-accurate (ADR-002); rename allocates a new nid
Next recommended action: LLM harness or rename-preserving nids
Validation commands: pnpm test && pnpm typecheck && pnpm bench
```
