# ForgeIR language kernel (M0)

Edition: 2026 (hardcoded). File extension: `.fir`. One module per file.

```
Module  := "module" Qid Fn*
Qid     := ident ("." ident)*
Fn      := "fn" ident "(" Params? ")" "->" Type "{" Expr "}"
Params  := Param ("," Param)*
Param   := ident ":" Type
Type    := "int"
Expr    := Add (("+" | "-") Add)*
Add     := Mul (("*" | "/") Mul)*
Mul     := ident | int | "(" Expr ")"
```

- No required semicolons. `//` comments to end of line.
- Last (only) expression in a block is the return value.
- Unknown syntax is `PARSE-001`. Do not invent `record`, `if`, or `extern` yet; the parser will reject them.
- `int` is the only type. It emits as TypeScript `number`.

Example:

```
module examples.add

fn add(a: int, b: int) -> int {
  a + b
}
```
