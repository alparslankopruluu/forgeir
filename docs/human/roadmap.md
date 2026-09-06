# Roadmap

Measurable milestones. Features listed here are not shipped until the acceptance line is true.

## M0 — Genesis + hello

Parse, check, emit TypeScript, and run `examples/add`. JSON diagnostics. MCP stub (`forge_status`, `forge_validate`). Memory Bank and ADRs.

## M1 — Language kernel

**Done:** records, `bool`, `str`, comparisons, `if`/`else`, `match`, field access, calls, `list[T]`, `Option[T]`, `Result[T, E]`, TYPE-002 `fixes[]`.

## M2 — Addressability + MCP

**Done:** `forge.lock.json` symbol nids, `forge_query` / `forge_get`, `replace_expr` preview (apply opt-in), stdio MCP with five tools.

## M3 — Interop + effects (current)

**Done:** `extern fn ... = "module.export"`, effect checker (`net`/`fs`/`env`, omit = pure), `forge run --allow`.

Not done in M3: LLM benchmark harness, `forge.http` adapter, `use`/multi-file modules. No published scores until N ≥ 3. Next is M4 evidence.

## M4 — Evidence and adapters

Ten-plus executed tasks, first tagged `bench-vX`, `forge.http` over `fetch`. Decision point: stay on TypeScript compiler vs native `core`.
