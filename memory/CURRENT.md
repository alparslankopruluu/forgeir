# CURRENT

Current milestone: M2 (addressability + MCP)

Current implementation slice: lockfile nids, query/get, `replace_expr` preview.

## What is working

- M0 int functions (`examples/add`)
- Records, `if`/`match`, `bool`, calls (`examples/clamp`)
- `str`, `list[T]`, `Option[T]`, `Result[T, E]` (`examples/option`)
- `forge.lock.json` symbol nid table (`forge.lock/v1`)
- `forge query` / `forge get` (and MCP `forge_query` / `forge_get`)
- `replace_expr` preview; `--apply` / MCP `mode: apply` writes if not `PATCH-001`
- MCP tools (5): `forge_status`, `forge_validate`, `forge_query`, `forge_get`, `forge_patch`

## What is incomplete

- Effects / `extern`
- Rename-preserving nids (new qid → new nid; old lock entries remain)
- Patch ops other than `replace_expr`
- Benchmark harness execution (task list only)

## Current blockers

None.

## Next highest-priority actions

1. M3: effects (`net`, `fs`, `env`)
2. M3: `extern` npm
3. Rename-preserving nids / extra patch ops

## Relevant files

- `packages/ir/src/lock.ts`
- `packages/ir/src/graph.ts`
- `packages/patch/src/index.ts`
- `packages/cli/src/main.ts`
- `packages/mcp/src/index.ts`
- `forge.lock.json`

## Relevant tests

- `tests/ir.test.ts`
- `tests/patch.test.ts`
- `tests/mcp.test.ts`
- `tests/e2e/patch.test.ts`

## Last validated state

```
Last validated commit: 96db4f2
Current milestone: M2
Completed: lockfile nids; query/get; replace_expr preview/apply
In progress: none
Known issue: TS `number` emit is not i64-accurate (ADR-002); rename allocates a new nid
Next recommended action: M3 effects and extern
Validation commands: pnpm test && pnpm typecheck && pnpm forge lock examples/add/main.fir && pnpm forge get examples/add/main.fir examples.add.add@body --detail body
```
