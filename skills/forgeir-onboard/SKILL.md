---
name: forgeir-onboard
description: Learn ForgeIR M1 surface syntax, M3 extern/effects, and M2 query/patch toolchain. Use when writing or reading .fir files, running forge check/emit/run/query/get/patch, or onboarding an agent to a ForgeIR program.
---

# ForgeIR onboard (M1 language, M3 extern, M2 IDs)

Read `docs/agent/language.md` then `docs/agent/ids.md`. Do not load the full human guide.

M1 includes records, `bool`, `str`, `list[T]`, `Option[T]`, `Result[T, E]`, `if`/`else`, `match`, and calls. M3 adds `extern fn` and `! { net | fs | env }`.

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
pnpm forge run examples/wrap/main.fir demo
pnpm forge run examples/env/main.fir demo --allow env
pnpm forge run examples/http/main.fir status_ok <url> --allow net
pnpm bench
pnpm forge query path.fir
pnpm forge get path.fir <qid> --detail body
pnpm forge patch path.fir --qid <qid> --expr '<source>'
```

If `check --json` reports errors, repair the `.fir` source. Prefer `forge_patch` preview over rewriting the file. Do not edit emitted `.ts`.

Out of language: `use`, `let`, `loop`. Expect `PARSE-001`. Effectful `forge run` without `--allow` is refused.
