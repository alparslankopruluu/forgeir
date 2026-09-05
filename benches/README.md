# Benchmarks

No numbers live here yet. README and public docs must not invent them.

Primary metric (when the harness exists): **total tokens until tests pass**, per model, per task, versus TypeScript and Python baselines. A design that cuts tokens but drops pass@1 is a failure.

Rules:

- Frozen prompts will live in `benches/prompts/` (not in M0).
- N ≥ 3 runs before any figure may appear in the project README.
- Raw traces go in `benches/artifacts/` (gitignored).
- Cite only tagged `bench-vX` runs.

Task definitions: [tasks.md](./tasks.md).
