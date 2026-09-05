# Getting started

Requires Node 22+ and pnpm 10+.

```bash
pnpm install
pnpm test
pnpm forge check examples/add/main.fir
pnpm forge run examples/add/main.fir
pnpm forge run examples/clamp/main.fir clamp10 15
pnpm forge emit examples/add/main.fir
```

`forge run` on the add example calls `add(2, 3)` and prints `5`. The clamp example prints `10`.

M1 language: `module`, `record`, `fn`, `int`, `bool`, arithmetic, comparisons, `if`/`else`, `match`, field access, record construct, calls. Unknown syntax is a `PARSE-001` error, not a silent skip.

See [agent language kernel](../agent/language.md) for the compact grammar.
