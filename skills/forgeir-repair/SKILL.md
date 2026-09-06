---
name: forgeir-repair
description: Repair ForgeIR programs from forge.diag/v1 JSON. Use when forge check --json or forge_validate returns errors, TYPE-001, TYPE-002, PARSE-001, EFFECT-001, EXTERN-001, PATCH-001.
---

# ForgeIR repair

Input: a `forge.diag/v1` report (from `pnpm forge check --json` or MCP `forge_validate`).

Rules:

1. Prefer the smallest edit that matches `expected` / `received` and any `fixes[]`.
2. Address nodes by `qid` (or `nid` from the lockfile). Do not rewrite the whole file if one expression is wrong.
3. Preview with `forge patch --qid <qid> --expr '...'` or MCP `forge_patch`. Apply only after the hunk looks right.
4. Re-run `pnpm forge check --json` after the edit. Stop when `diagnostics` is empty.
5. Never patch emitted TypeScript; it is not canonical.
6. If the diagnostic is `PARSE-001`, the syntax is outside the current kernel. Do not invent `use`/`let`/`loop`. `PATCH-001` means the selector is unknown or not an expression. `EFFECT-001` means declare the missing `! { ... }` on the caller. `EXTERN-001` means the target is not `module.export`.
