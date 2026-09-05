---
name: forgeir-dev
description: Work on the ForgeIR compiler repository. Use when changing parser, checker, emit, CLI, MCP, docs, or Memory Bank. Triggers: ForgeIR compiler, packages/syntax, pnpm forge, memory/CURRENT.md.
---

# ForgeIR compiler development

You are working on the compiler, not on an app written in ForgeIR.

1. Read `memory/CURRENT.md` and `AGENTS.md` first. Do not dump `packages/**`.
2. M0 language is `module` / `fn` / `int` / arithmetic only. Do not add records, effects, or backends unless the task says so.
3. Tests live in `tests/`. Write or update a failing test before production code.
4. Validate with `pnpm test` and `pnpm typecheck`. For the hello slice also run `pnpm forge run examples/add/main.fir`.
5. Public artifacts are English. Commits are Conventional Commits.
6. Update Memory Bank and README when behavior changes. Do not claim the task done until they match reality.
7. Generated TypeScript is not canonical. Do not "fix" programs by editing emit output.
