# CURRENT

Current milestone: M0 (genesis + hello slice)

Current implementation slice: parse / check / emit-ts / run for `int` functions; MCP stub.

## What is working

- Handwritten lexer/parser for the M0 grammar
- Int-only typechecker with JSON diagnostics
- Deterministic TypeScript emit
- `forge parse | check | emit | run | mcp`
- Example `examples/add/main.fir` runs `add(2, 3) → 5`

## What is incomplete

- Records, control flow, Option/Result, effects, extern
- `forge.lock.json` identity table
- Semantic patch
- MCP query/get/patch
- Benchmark harness execution (task list only)

## Current blockers

None for M0.

## Next highest-priority actions

1. M1: records + `if`/`match`
2. M1: lists and Option/Result builtins
3. M2: lockfile nids + `forge_query`

## Relevant files

- `packages/syntax/src/parser.ts`
- `packages/sema/src/check.ts`
- `packages/emit-ts/src/emit.ts`
- `packages/cli/src/main.ts`
- `examples/add/main.fir`

## Relevant tests

- `tests/parser.test.ts`
- `tests/check.test.ts`
- `tests/emit.test.ts`
- `tests/e2e/add.test.ts`
- `tests/mcp.test.ts`

## Last validated state

See handoff. Update the commit hash after the M0 commit lands.

```
Last validated commit: (pending first commit)
Current milestone: M0
Completed: parse/check/emit/run for int functions; MCP stub; docs/memory
In progress: none
Known issue: TS `number` emit is not i64-accurate (ADR-002)
Next recommended action: M1 records and conditionals
Validation commands: pnpm test && pnpm typecheck && pnpm forge run examples/add/main.fir
```
