---
name: forgeir-onboard
description: Learn ForgeIR M1 surface syntax and toolchain. Use when writing or reading .fir files, running forge check/emit/run, or onboarding an agent to a ForgeIR program.
---

# ForgeIR onboard (M1)

Read `docs/agent/language.md` (one page). Do not load the full human guide.

M1 includes records, `bool`, `str`, `list[T]`, `Option[T]`, `Result[T, E]`, `if`/`else`, `match`, and calls.

```
fn first_or(xs: list[int], fallback: int) -> int {
  match xs[0] {
    Some(v) => v
    None => fallback
  }
}
```

Commands:

```
pnpm forge check path.fir
pnpm forge check --json path.fir
pnpm forge emit path.fir
pnpm forge run path.fir
pnpm forge run examples/option/main.fir demo
```

If `check --json` reports errors, repair the `.fir` source. Do not edit emitted `.ts`.

Out of language: `extern`, effects. Expect `PARSE-001`.
