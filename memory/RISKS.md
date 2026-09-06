# RISKS

| Risk | Severity | Evidence | Mitigation | Test |
|---|---|---|---|---|
| Thesis is false (no token/repair win) | existential | untested | Do not publish numbers; run T17/T20 vs TypeScript in M3 | benches/tasks.md |
| Syntax novelty increases model errors | high | untested | Familiar tokens (`fn`, `int`); keyword renaming is a bench | tokenizer matrix later |
| Pretty-print round-trip never works | high | no printer | Span-splice `replace_expr` in M2 | `tests/patch.test.ts` |
| nid/qid merge hell | high | lockfile maps qid→nid; rename allocates a new nid | ADR-003; keep old entries; no silent rewrite | two-branch rename fixture still needed |
| extern signatures lie | high | no extern | Typed facades only; no `.d.ts` import in v0.1 | negative tests in M3 |
| Effect system too weak or noisy | med | no effects | Small closed set | T21 |
| MCP tool surface explodes | med | 5 tools in M2 | Cap 8 in v0.1 | tool-choice eval |
| TS compiler too slow | med | hello-only | Query-shaped API; revisit per ADR-001 | 1k-fn synthetic later |
| Agents still dump whole files | med | untested | Skills tell agents to use CLI/MCP | repair skill eval |
| Destructive MCP + future shell | high | apply is opt-in | Preview default; `PATCH-001` refuses bad selectors; no shell | `tests/e2e/patch.test.ts` |
