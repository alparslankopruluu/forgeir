# Agent documentation index

Read only what the task needs.

1. [language.md](./language.md) — M1 surface syntax + M3 `extern` / effects
2. [ids.md](./ids.md) — qid/nid/hid, lockfile, query, get, `replace_expr`
3. [../../memory/CURRENT.md](../../memory/CURRENT.md) — where the project actually is
4. [../../AGENTS.md](../../AGENTS.md) — how to work on this compiler repo
5. [../human/roadmap.md](../human/roadmap.md) — milestones
6. Error codes: `PARSE-001`, `PARSE-002`, `TYPE-001`, `TYPE-002`, `TYPE-003`, `TYPE-004`, `EFFECT-001`, `EFFECT-002`, `EXTERN-001` in `packages/diag/src/index.ts`; `PATCH-001` from `@forgeir/patch`
7. MCP tools: `forge_status`, `forge_validate`, `forge_query`, `forge_get`, `forge_patch`

Do not ingest the whole repository to change one function. Prefer `forge_query` / `forge_get` / `pnpm forge check --json` over reading generated TypeScript. Preview patches before `--apply`.
