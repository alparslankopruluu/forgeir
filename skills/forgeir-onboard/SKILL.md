---
name: forgeir-onboard
description: Learn ForgeIR M1 surface syntax and toolchain. Use when writing or reading .fir files, running forge check/emit/run, or onboarding an agent to a ForgeIR program.
---

# ForgeIR onboard (M1)

Read `docs/agent/language.md` (one page). Do not load the full human guide.

M1 can express records, `bool`, `if`/`else`, `match`, field access, constructs, and calls:

```
module examples.clamp

record Bounds {
  lo: int
  hi: int
}

fn clamp10(x: int) -> int {
  if x < 0 { 0 } else { if x > 10 { 10 } else { x } }
}
```

Commands:

```
pnpm forge check path.fir
pnpm forge check --json path.fir
pnpm forge emit path.fir
pnpm forge run path.fir
pnpm forge run examples/clamp/main.fir clamp10 15
```

If `check --json` reports errors, repair the `.fir` source. Do not edit emitted `.ts`.

Out of language: `extern`, lists, Option/Result, effects. Expect `PARSE-001`.
