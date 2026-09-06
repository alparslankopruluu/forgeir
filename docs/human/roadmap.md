# Roadmap

Measurable milestones. Features listed here are not shipped until the acceptance line is true.

## M0 — Genesis + hello

Parse, check, emit TypeScript, and run `examples/add`. JSON diagnostics. MCP stub (`forge_status`, `forge_validate`). Memory Bank and ADRs.

## M1 — Language kernel

**Done:** records, `bool`, `str`, comparisons, `if`/`else`, `match`, field access, calls, `list[T]`, `Option[T]`, `Result[T, E]`, TYPE-002 `fixes[]`.

## M2 — Addressability + MCP

**Done:** `forge.lock.json` symbol nids, `forge_query` / `forge_get`, `replace_expr` preview (apply opt-in), stdio MCP with five tools.

## M3 — Interop + effects

**Done:** `extern fn ... = "module.export"`, effect checker (`net`/`fs`/`env`, omit = pure), `forge run --allow`.

## M4 — Adapters + compiler oracles

**Done:** `@forgeir/http` over `fetch`, `net` → async TS, `pnpm bench` compiler oracles, same-file `rename`, `pnpm bench:llm` (skip without key; N ≥ 3 gate). No scores. No `bench-vX` tag.

Not done in M4: tagged LLM evidence. Stay-on-TS vs native `core` is still open.

## M5 — Modules (current)

**Done:** `use examples.add.{add}` resolves `qid/main.fir` (or `qid.fir`) from cwd, type-checks exports, emits ESM imports. `examples/calc` `twice(3) → 6`. `USE-001`…`USE-004`.

Not done: `let`/`loop`, cross-file rename, package registry.
