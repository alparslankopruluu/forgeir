# ADR-002: First backend is TypeScript ESM

- Status: accepted
- Date: 2026-09-05

## Decision

The first code-generation target is TypeScript ESM running on Node 22+. M0 emits `number` for ForgeIR `int`.

## Why

The thesis compares agent cost against languages agents already write. TypeScript is the highest-signal baseline. WASM/LLVM are year-scale. JavaScript without types weakens the comparison.

## Alternatives

- LLVM / native: too much compiler surface before the thesis is tested.
- WASM Component Model: future interop ABI, not v0.1 runtime.
- Python: weaker static types.

## Consequences

`int` is i64 in the language kernel and `number` in TS emit (IEEE float). M0 programs stay in the safe integer range. Later backends must not assume TS `number` semantics.

## Revisit when

We add i64-accurate emit, or ship a second backend (Web reuse of TS emit, then JVM/Kotlin, Swift, WASM, LLVM).
