# ADR-001: Compiler implementation language is TypeScript

- Status: accepted
- Date: 2026-09-05

## Decision

Implement the ForgeIR compiler toolchain (parser, checker, emit, CLI, MCP) in TypeScript on Node 22+.

## Why

Coding agents iterate fastest in TypeScript. The first backend is TypeScript, so the compiler can dogfood emit. The MCP TypeScript SDK is first-class. IR schemas are language-independent, so this choice is reversible.

## Alternatives

- Rust: better long-term compiler performance and credibility; slower agent iteration on an empty repo.
- Python: fast prototypes, weak compiler packaging.
- C++: native speed; agent-hostile; LLVM gravity well.

## Consequences

Check/emit of large programs may become slow. Revisit when a 10k-node program takes more than 2s to check, or when a second backend needs a shared native core.

## Revisit when

Measured compile-time budget is missed, or we start a non-TS backend that needs shared `core`/`sema`.
