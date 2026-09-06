# ForgeIR

**A software representation designed for AI agents, not human authors.**

ForgeIR is an AI-native **semantic intermediate representation**, surface language, compiler, and agent tooling layer. Coding agents (Claude Code, Codex, Grok, Gemini, and others) should inspect and patch a typed program graph instead of repeatedly regenerating large TypeScript, Swift, or Kotlin files.

The product is **not** “a short programming language.” Short syntax is incidental. The kernel is addressable semantics, machine-readable diagnostics, semantic patches, and interoperability with existing ecosystems.

This thesis is **unproven**. There are no published token-savings figures in this repository.

## Current status

**Milestone M4 — adapters + compiler oracles.** Experimental.

### Implemented

- Surface: `module`, `record`, `fn`, `int`, `bool`, `str`, `list[T]`, `Option[T]`, `Result[T, E]`, arithmetic, comparisons, `if`/`else`, `match`, field access, construct, calls
- Parse, typecheck, JSON diagnostics (`PARSE-001` … `TYPE-004`, `EFFECT-001`, `EFFECT-002`, `EXTERN-001`, `PATCH-001`) including TYPE-002 / EFFECT-001 repair `fixes[]`
- Deterministic TypeScript ESM emit
- CLI: `forge parse | check | emit | run | lock | query | get | patch | mcp`
- `forge.lock.json` symbol nid table (`forge.lock/v1`)
- Semantic `replace_expr` and `rename` (preview default; `--apply` opt-in). Rename retargets lockfile nids.
- `extern fn ... = "module.export"` → ESM `import`; typed facade only (no `.d.ts` import)
- Explicit effects `! { net }`, `! { fs }`, `! { env }` (omit = pure); `net` lowers to `async` TypeScript; `forge run --allow`
- `@forgeir/http` thin `fetch` facade (`examples/http`)
- Compiler oracles: `pnpm bench` (11 tasks). **No scores.**
- Examples: `examples/add`, `examples/clamp`, `examples/option`, `examples/wrap`, `examples/env`, `examples/http`
- MCP (5 tools): `forge_status`, `forge_validate`, `forge_query`, `forge_get`, `forge_patch`
- Agent docs, Memory Bank, ADRs

### Not implemented (do not treat as shipped)

- Package registry, `use`/multi-file modules
- Silent rename (edit the name in `.fir` without the `rename` op) still allocates a new nid
- Patch ops other than `replace_expr` and `rename`
- LLVM, WASM, JVM, Swift, Kotlin backends
- LLM benchmark scores (require a tagged `bench-vX` with N ≥ 3)

Related systems such as TML are native LLVM languages with compiler-shaped MCP wrappers. ForgeIR’s bet is a **semantic IR and agent protocol** that compiles *to* existing ecosystems, not a batteries-included native stdlib.

## Quick start

Requires Node 22+ and [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm test
pnpm forge check examples/add/main.fir
pnpm forge run examples/add/main.fir    # prints 5
pnpm forge run examples/clamp/main.fir clamp10 15    # prints 10
pnpm forge run examples/option/main.fir demo         # prints 10
pnpm forge run examples/wrap/main.fir demo           # prints main.fir
pnpm forge run examples/env/main.fir demo --allow env
pnpm bench
pnpm forge emit examples/add/main.fir
pnpm forge check --json examples/add/main.fir
pnpm forge lock examples/add/main.fir
pnpm forge query examples/add/main.fir examples.add
pnpm forge get examples/add/main.fir examples.add.add@body --detail body
pnpm forge patch examples/add/main.fir --qid examples.add.add@body --expr 'a - b'
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
.fir  →  parse  →  check  →  Semantic Program Graph
                              ├─ forge.lock.json (symbol nids)
                              ├─ diagnostics (JSON)
                              ├─ MCP / CLI (query, get, patch)
                              └─ emit-ts  →  .ts artifact
```

IDs (see [ADR-003](docs/adr/0003-canonical-store-and-ids.md) and [agent IDs](docs/agent/ids.md)):

- `qid` — qualified name (changes on rename)
- `nid` — stable node id for symbols in `forge.lock.json`
- `hid` — content hash of the source slice

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
