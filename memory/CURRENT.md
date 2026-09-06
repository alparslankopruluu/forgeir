# CURRENT

Current milestone: M3 (interop + effects)

Current implementation slice: `extern` npm facades and `! { net|fs|env }`.

## What is working

- M0 int functions (`examples/add`)
- Records, `if`/`match`, `bool`, calls (`examples/clamp`)
- `str`, `list[T]`, `Option[T]`, `Result[T, E]` (`examples/option`)
- `forge.lock.json` symbol nid table; query/get; `replace_expr`
- `extern fn ... = "module.export"` (`examples/wrap` → `node:path.basename`)
- Effects `net`/`fs`/`env`; omit = pure; `EFFECT-001`/`EFFECT-002`
- `forge run --allow env` (`examples/env` → `node:os.homedir`)
- MCP tools (5): `forge_status`, `forge_validate`, `forge_query`, `forge_get`, `forge_patch`

## What is incomplete

- LLM benchmark harness / published scores
- `forge.http` adapter
- `use` / multi-file modules
- Rename-preserving nids
- Patch ops other than `replace_expr`

## Current blockers

None.

## Next highest-priority actions

1. M4: benchmark harness (no scores until N ≥ 3)
2. `forge.http` over `fetch`
3. Rename-preserving nids / extra patch ops

## Relevant files

- `packages/syntax/src/parser.ts`
- `packages/sema/src/check.ts`
- `packages/emit-ts/src/emit.ts`
- `packages/cli/src/main.ts`
- `examples/wrap/main.fir`
- `examples/env/main.fir`

## Relevant tests

- `tests/extern.test.ts`
- `tests/e2e/extern.test.ts`
- `tests/check.test.ts`

## Last validated state

```
Last validated commit: 5670008
Current milestone: M3
Completed: extern npm facades; effect checker; forge run --allow
In progress: none
Known issue: TS `number` emit is not i64-accurate (ADR-002); rename allocates a new nid
Next recommended action: M4 harness / forge.http
Validation commands: pnpm test && pnpm typecheck && pnpm forge run examples/wrap/main.fir demo && pnpm forge run examples/env/main.fir demo --allow env
```
