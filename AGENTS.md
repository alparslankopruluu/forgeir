# AGENTS.md

ForgeIR is a compiler and semantic IR. This file is for agents working **on this repository**.

## Start here

1. `memory/CURRENT.md` — live state
2. `docs/agent/INDEX.md` — progressive docs
3. `memory/PROJECT.md` — invariants (rarely changes)

## Build and test

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm format:check
pnpm forge check examples/add/main.fir
pnpm forge run examples/add/main.fir
pnpm bench
pnpm bench:llm
```

Node 22+, pnpm 10. Package manager is pinned in `package.json`.

## Layout

- `packages/core` — ids, spans, hashes
- `packages/syntax` — lexer, parser, AST (`use`, `extern`, effects)
- `packages/sema` — typechecker
- `packages/diag` — diagnostic codes and JSON
- `packages/ir` — lockfile and semantic graph index
- `packages/patch` — `replace_expr` preview
- `packages/emit-ts` — TypeScript backend (`net` → async)
- `packages/http` — `fetch` facade for `extern ... = "@forgeir/http.get"`
- `packages/cli` — `forge`
- `benches/` — compiler oracles and LLM harness (`pnpm bench`, `pnpm bench:llm`; no README scores)
- `packages/mcp` — stdio MCP (5 tools)
- `examples/` — canonical `.fir` programs
- `tests/` — unit and e2e
- `memory/` — project continuity across sessions
- `forge.lock.json` — committed symbol nid table

## Rules

- English commit messages, Conventional Commits.
- Do not publish benchmark percentages.
- Do not add LLVM, a package registry, or a stdlib reimplementation.
- Generated TS is an artifact. `.fir` is canonical.
- After significant work: update `memory/CURRENT.md`, `memory/TODO.md`, and README if user-facing behavior changed.
- Keep diffs inside the requested package. Parser work should not rewrite MCP.

## Skills

- `skills/forgeir-dev` — compiler work
- `skills/forgeir-onboard` — writing `.fir`
- `skills/forgeir-repair` — diagnostics-driven repair
