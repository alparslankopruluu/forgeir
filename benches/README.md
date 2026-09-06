# Benchmarks

`pnpm bench` runs **compiler oracles** (check/run the examples and fixtures). It prints pass/fail only. It does **not** measure tokens, pass@1, or model cost.

Primary *future* metric (LLM harness, not shipped): **total tokens until tests pass**, per model, per task, versus TypeScript and Python baselines. A design that cuts tokens but drops pass@1 is a failure.

Rules:

- Frozen prompts will live in `benches/prompts/` (not shipped).
- N ≥ 3 runs before any figure may appear in the project README.
- Raw traces go in `benches/artifacts/` (gitignored).
- Cite only tagged `bench-vX` runs. There is no `bench-vX` tag yet.

Task definitions: [tasks.md](./tasks.md). Oracle list: [oracles.ts](./oracles.ts).
