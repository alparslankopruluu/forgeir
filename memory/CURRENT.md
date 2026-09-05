# CURRENT

Current milestone: M1 (language kernel, partial)

Current implementation slice: records, bool, comparisons, if/match, field access, construct, calls, TYPE-002 fixes.

## What is working

- M0 int functions (`examples/add`)
- Records and field access
- `if` / `else` expressions (else required)
- `match` on int with required `_` arm
- `bool` and comparisons
- Named function calls and record construct
- TYPE-002 diagnostics include `fixes[]`
- `examples/clamp` runs `clamp10(15) → 10`

## What is incomplete

- lists, Option/Result
- `forge.lock.json` identity table
- Semantic patch
- MCP query/get/patch
- Benchmark harness execution (task list only)

## Current blockers

None.

## Next highest-priority actions

1. M1 remaining: lists + Option/Result builtins
2. M2: lockfile nids + `forge_query`
3. Semantic `replace_expr` patch preview

## Relevant files

- `packages/syntax/src/parser.ts`
- `packages/sema/src/check.ts`
- `packages/emit-ts/src/emit.ts`
- `examples/clamp/main.fir`

## Relevant tests

- `tests/parser.test.ts`
- `tests/check.test.ts`
- `tests/emit.test.ts`
- `tests/e2e/add.test.ts`
- `tests/e2e/clamp.test.ts`

## Last validated state

```
Last validated commit: 559c907
Current milestone: M1
Completed: records, if/match, bool, calls, clamp example
In progress: none
Known issue: TS `number` emit is not i64-accurate (ADR-002)
Next recommended action: lists and Option/Result
Validation commands: pnpm test && pnpm typecheck && pnpm forge run examples/clamp/main.fir clamp10 15
```
