# CURRENT

Current milestone: M1 (language kernel complete)

Current implementation slice: list / Option / Result / str builtins.

## What is working

- M0 int functions (`examples/add`)
- Records, `if`/`match`, `bool`, calls (`examples/clamp`)
- `str`, `list[T]`, `Option[T]`, `Result[T, E]`
- List literals and `xs[i] -> Option[T]`
- `Some` / `None` / `Ok` / `Err` constructors and match
- `examples/option` runs `demo → 10` and `empty → 7`

## What is incomplete

- `forge.lock.json` identity table
- Semantic patch
- MCP query/get/patch
- Benchmark harness execution (task list only)

## Current blockers

None.

## Next highest-priority actions

1. M2: lockfile nids + `forge_query`
2. Semantic `replace_expr` patch preview
3. Effects / `extern`

## Relevant files

- `packages/syntax/src/parser.ts`
- `packages/sema/src/check.ts`
- `packages/sema/src/type.ts`
- `packages/emit-ts/src/emit.ts`
- `examples/option/main.fir`

## Relevant tests

- `tests/option.test.ts`
- `tests/e2e/option.test.ts`
- `tests/check.test.ts`
- `tests/e2e/add.test.ts`
- `tests/e2e/clamp.test.ts`

## Last validated state

```
Last validated commit: b4cd12d
Current milestone: M1
Completed: list/Option/Result/str; option example
In progress: none
Known issue: TS `number` emit is not i64-accurate (ADR-002)
Next recommended action: M2 semantic IDs and query MCP
Validation commands: pnpm test && pnpm typecheck && pnpm forge run examples/option/main.fir demo
```
