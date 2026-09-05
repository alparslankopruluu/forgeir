---
name: forgeir-repair
description: Repair ForgeIR programs from forge.diag/v1 JSON. Use when forge check --json or forge_validate returns errors, TYPE-001, TYPE-002, PARSE-001.
---

# ForgeIR repair

Input: a `forge.diag/v1` report (from `pnpm forge check --json` or MCP `forge_validate`).

Rules:

1. Prefer the smallest edit that matches `expected` / `received` and any `fixes[]`.
2. Address nodes by `qid` when present. Do not rewrite the whole file if one expression is wrong.
3. Re-run `pnpm forge check --json` after the edit. Stop when `diagnostics` is empty.
4. Never patch emitted TypeScript; it is not canonical.
5. If the diagnostic is `PARSE-001`, the syntax is outside M0. Do not invent new forms.

M2 will replace whole-file edits with `forge_patch` preview/apply. Until then, splice the span in the `.fir` file.
