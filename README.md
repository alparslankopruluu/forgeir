# ForgeIR

**A software representation designed for AI agents, not human authors.**

ForgeIR is an AI-native **semantic intermediate representation**, surface language, compiler, and agent tooling layer. Coding agents (Claude Code, Codex, Grok, Gemini, and others) should inspect and patch a typed program graph instead of repeatedly regenerating large TypeScript, Swift, or Kotlin files.

The product is **not** “a short programming language.” Short syntax is incidental. The kernel is addressable semantics, machine-readable diagnostics, semantic patches, and interoperability with existing ecosystems.

This thesis is **unproven**. There are no published token-savings figures in this repository.

## Current status

**Milestone M0 — genesis + hello slice.** Experimental.

### Implemented

- M0 surface: `module`, `fn`, `int`, `+ - * /`, `//` comments
- Parse, typecheck, JSON diagnostics (`PARSE-001`, `TYPE-001`, `TYPE-002`)
- Deterministic TypeScript ESM emit
- CLI: `forge parse | check | emit | run`
- MCP stub: `forge_status`, `forge_validate`
- Agent docs, Memory Bank, ADRs

### Not implemented (do not treat as shipped)

- Records, `if`/`match`, lists, Option/Result
- Effects, `extern`, package registry
- Semantic patch, lockfile nids, query MCP tools
- LLVM, WASM, JVM, Swift, Kotlin backends
- Benchmark harness results

Related systems such as TML are native LLVM languages with compiler-shaped MCP wrappers. ForgeIR’s bet is a **semantic IR and agent protocol** that compiles *to* existing ecosystems, not a batteries-included native stdlib.

## Quick start

Requires Node 22+ and [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm test
pnpm forge check examples/add/main.fir
pnpm forge run examples/add/main.fir    # prints 5
pnpm forge emit examples/add/main.fir
pnpm forge check --json examples/add/main.fir
```

Example program (`examples/add/main.fir`):

```fir
module examples.add

fn add(a: int, b: int) -> int {
  a + b
}
```

Emitted TypeScript is an **artifact**. The `.fir` file is canonical.

## Architecture

```
.fir  →  parse  →  check  →  Semantic Program Graph (M2)
                              ├─ diagnostics (JSON)
                              ├─ MCP / CLI
                              └─ emit-ts  →  .ts artifact
```

IDs (see [ADR-003](docs/adr/0003-canonical-store-and-ids.md)):

- `qid` — qualified name
- `nid` — stable node id (lockfile in M2)
- `hid` — content hash

## Documentation

| Audience | Start |
|---|---|
| Humans | [Getting started](docs/human/getting-started.md), [roadmap](docs/human/roadmap.md) |
| Agents | [llms.txt](llms.txt), [docs/agent/INDEX.md](docs/agent/INDEX.md), [AGENTS.md](AGENTS.md) |
| Decisions | [ADR-001](docs/adr/0001-compiler-implementation-language.md), [ADR-002](docs/adr/0002-first-backend.md), [ADR-003](docs/adr/0003-canonical-store-and-ids.md) |
| Continuity | [memory/CURRENT.md](memory/CURRENT.md) |

## Benchmarks

Task list: [benches/tasks.md](benches/tasks.md). **No results yet.** Numbers may appear in this README only from a tagged `bench-vX` run with at least three repetitions.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Apache-2.0. English Conventional Commits. Update this README in the same change as user-facing behavior.

## License

[Apache License 2.0](LICENSE)
