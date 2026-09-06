# Benchmarks

`pnpm bench` runs **compiler oracles** (check/run the examples and fixtures). It prints pass/fail only.

`pnpm bench:llm` is the **LLM token harness**. It is skipped unless `FORGEIR_BENCH_API_KEY` (or `OPENAI_API_KEY`) and `FORGEIR_BENCH_MODEL` are set. Optional: `FORGEIR_BENCH_BASE_URL` (OpenAI-compatible, default `https://api.openai.com/v1`). Repeat with `--repeat 3`.

Primary metric (when a tagged run exists): **total tokens until tests pass**, per model, per task. A design that cuts tokens but drops pass@1 is a failure.

Rules:

- Frozen prompts: [prompts/](./prompts/).
- Means are printed only for N ≥ 3 **measured** API usage traces. Estimates do not count.
- Those means may go to stdout and `benches/artifacts/` only.
- README may cite numbers only from a tagged `bench-vX` run with N ≥ 3. There is no such tag yet.

Task definitions: [tasks.md](./tasks.md). Oracle list: [oracles.ts](./oracles.ts). LLM tasks: T01, T17, T21.
