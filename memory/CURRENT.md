# CURRENT

Current milestone: M4 (adapters + oracles + rename + LLM harness)

Current implementation slice: frozen-prompt LLM token harness (skip without key).

## What is working

- M0–M3 language, lockfile, query/get, patch (`replace_expr`, `rename`), `extern`, effects
- `@forgeir/http`; compiler oracles (`pnpm bench`)
- `pnpm bench:llm` with frozen prompts T01/T17/T21; skip without API key; N ≥ 3 gate on means

## What is incomplete

- Tagged `bench-vX` / published scores
- `use` / multi-file modules / cross-file rename
- Patch ops other than `replace_expr` and `rename`
- Stay-on-TS vs native `core` decision

## Current blockers

None.

## Next highest-priority actions

1. `use` / multi-file modules
2. Tagged LLM evidence (N ≥ 3, do not write README numbers here)
3. Extra patch ops

## Relevant files

- `benches/llm/harness.ts`
- `benches/prompts/`
- `benches/llm/summary.ts`

## Relevant tests

- `tests/llm-harness.test.ts`

## Last validated state

```
Last validated commit: 530a8c7
Current milestone: M4
Completed: LLM harness with frozen prompts; skip without key; N≥3 mean gate
In progress: none
Known issue: TS `number` emit is not i64-accurate (ADR-002); no bench-vX tag
Next recommended action: use/modules or a tagged LLM run
Validation commands: pnpm test && pnpm typecheck && pnpm bench && pnpm bench:llm
```
