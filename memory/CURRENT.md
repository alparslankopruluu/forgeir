# CURRENT

Current milestone: M5 (modules)

Current implementation slice: `use examples.add.{add}` across `.fir` files.

## What is working

- M0–M4 language, lockfile, query/get, patch, extern, effects, http, oracles, LLM harness
- `use Qid.{name}` resolves `qid/main.fir` or `qid.fir` from cwd
- `examples/calc` `twice(3) → 6` via `examples.add.add`
- `USE-001` unresolved, `USE-002` missing export, `USE-003` cycle, `USE-004` duplicate import

## What is incomplete

- Tagged `bench-vX` / published scores
- `let` / `loop` / cross-file rename
- Package registry
- Stay-on-TS vs native `core` decision

## Current blockers

None.

## Next highest-priority actions

1. `let` / `loop` or cross-file rename
2. Tagged LLM evidence (N ≥ 3, no README numbers)
3. Extra patch ops

## Relevant files

- `packages/syntax/src/parser.ts`
- `packages/sema/src/check.ts`
- `packages/sema/src/resolve.ts`
- `examples/calc/main.fir`

## Relevant tests

- `tests/use.test.ts`
- `tests/e2e/use.test.ts`

## Last validated state

```
Last validated commit: df181be
Current milestone: M5
Completed: use imports; calc twice(3)→6; T23 oracle
In progress: none
Known issue: TS `number` emit is not i64-accurate (ADR-002); no bench-vX tag
Next recommended action: let/loop or tagged LLM run
Validation commands: pnpm test && pnpm typecheck && pnpm forge run examples/calc/main.fir twice 3 && pnpm bench
```
