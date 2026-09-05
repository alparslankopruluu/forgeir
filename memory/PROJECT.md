# PROJECT

ForgeIR is an AI-native semantic intermediate representation, surface language, compiler, and agent tooling layer. It is not a short syntax novelty and not a replacement for TypeScript/Swift/Kotlin as human languages.

## Mission

Give coding agents an addressable, typed, effect-aware program graph so they can inspect and patch software without rewriting large source files, then emit into existing ecosystems.

## Thesis

If the canonical program is a semantic graph with machine-readable diagnostics and semantic patches, agents can reach passing tests with less context, fewer tokens, and fewer repair loops than by generating human-oriented source. This is a hypothesis. Measure it.

## Non-goals

- Rewriting Firebase, Stripe, OpenCV, or other ecosystems
- A ForgeIR package registry in v0.x
- LLVM/WASM as the first backend
- Classes and inheritance as the core model
- Publishing unproven token-savings percentages
- A hosted editor/database as the source of truth

## Invariants

- `.fir` text in git is human-canonical; emitted native code is not.
- Public docs and commit messages are English.
- CLI, MCP, and skills share one engine.
- Evidence before claims in README.

## Terms

- **qid**: qualified name
- **nid**: stable node id
- **hid**: content hash
- **SPG**: Semantic Program Graph
