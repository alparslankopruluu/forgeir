---
name: forgeir-onboard
description: Learn ForgeIR M0 surface syntax and toolchain. Use when writing or reading .fir files, running forge check/emit/run, or onboarding an agent to a ForgeIR program.
---

# ForgeIR onboard (M0)

Read `docs/agent/language.md` (one page). Do not load the full human guide.

M0 can express:

```
module examples.add

fn add(a: int, b: int) -> int {
  a + b
}
```

Commands:

```
pnpm forge check path.fir
pnpm forge check --json path.fir
pnpm forge emit path.fir
pnpm forge run path.fir
```

If `check --json` reports errors, repair the `.fir` source (or later, apply a semantic patch). Do not edit emitted `.ts`.

Anything beyond `module`, `fn`, `int`, and `+ - * /` is out of language. Expect `PARSE-001`.
