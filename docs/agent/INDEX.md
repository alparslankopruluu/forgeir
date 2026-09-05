# Agent documentation index

Read only what the task needs.

1. [language.md](./language.md) — M0 surface syntax
2. [../../memory/CURRENT.md](../../memory/CURRENT.md) — where the project actually is
3. [../../AGENTS.md](../../AGENTS.md) — how to work on this compiler repo
4. [../human/roadmap.md](../human/roadmap.md) — milestones
5. Error codes: `PARSE-001`, `PARSE-002`, `TYPE-001`, `TYPE-002` in `packages/diag/src/index.ts`
6. MCP stub tools: `forge_status`, `forge_validate`

Do not ingest the whole repository to change one function. Prefer `pnpm forge check --json` over reading generated TypeScript.
