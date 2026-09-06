# Getting started

Requires Node 22+ and pnpm 10+.

```bash
pnpm install
pnpm test
pnpm forge check examples/add/main.fir
pnpm forge run examples/add/main.fir
pnpm forge run examples/clamp/main.fir clamp10 15
pnpm forge run examples/option/main.fir demo
pnpm forge run examples/wrap/main.fir demo
pnpm forge run examples/env/main.fir demo --allow env
pnpm bench
pnpm forge emit examples/add/main.fir
pnpm forge lock examples/add/main.fir
pnpm forge query examples/add/main.fir examples.add
pnpm forge get examples/add/main.fir examples.add.add@body --detail body
```

`forge run` on the add example calls `add(2, 3)` and prints `5`. The clamp example prints `10`. The option demo prints `10`. The wrap demo prints `main.fir`. The env demo needs `--allow env`. `pnpm bench` runs compiler oracles and prints pass/fail with **no scores**.

M1 language: `module`, `record`, `fn`, `int`, `bool`, `str`, `list[T]`, `Option[T]`, `Result[T, E]`, arithmetic, comparisons, `if`/`else`, `match`, field access, record construct, calls.

M3: `extern fn name(...) -> T = "module.export"` and `! { net | fs | env }` (omit = pure). Unknown syntax is a `PARSE-001` error, not a silent skip. Unknown effects are `EFFECT-002`. Calling a more-effectful function from a purer one is `EFFECT-001`.

M2 addressability: `forge lock` writes symbol nids to `forge.lock.json`. `forge query` / `forge get` list compact IR nodes. `forge patch` previews `replace_expr` or `--rename` (add `--apply` to write). Use `rename` so nids survive. See [IDs, query, and patch](../agent/ids.md).

See [agent language kernel](../agent/language.md) for the compact grammar.
