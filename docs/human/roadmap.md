# Roadmap

Measurable milestones. Features listed here are not shipped until the acceptance line is true.

## M0 — Genesis + hello

Parse, check, emit TypeScript, and run `examples/add`. JSON diagnostics. MCP stub (`forge_status`, `forge_validate`). Memory Bank and ADRs.

## M1 — Language kernel

**Done:** records, `bool`, `str`, comparisons, `if`/`else`, `match`, field access, calls, `list[T]`, `Option[T]`, `Result[T, E]`, TYPE-002 `fixes[]`.

## M2 — Addressability + MCP (current)

**Done:** `forge.lock.json` symbol nids, `forge_query` / `forge_get`, `replace_expr` preview (apply opt-in), stdio MCP with five tools.

Not done in M2: rename-preserving nids, patch ops other than `replace_expr`. Next milestone is M3.

## M3 — Interop + effects + harness

`extern` to npm, effect checker, runnable benchmark harness. No published scores until N ≥ 3.

## M4 — Evidence and adapters

Ten-plus executed tasks, first tagged `bench-vX`, `forge.http` over `fetch`. Decision point: stay on TypeScript compiler vs native `core`.
