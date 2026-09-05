# ForgeIR language kernel (M1)

Edition: 2026 (hardcoded). File extension: `.fir`. One module per file.

```
Module  := "module" Qid Decl*
Decl    := Record | Fn
Record  := "record" ident "{" Field* "}"
Field   := ident ":" Type
Fn      := "fn" ident "(" Params? ")" "->" Type "{" Expr "}"
Params  := Param ("," Param)*
Param   := ident ":" Type
Type    := "int" | "bool" | ident
Expr    := Compare | If | Match | Call | Construct | FieldGet | lit
If      := "if" Expr "{" Expr "}" "else" "{" Expr "}"
Match   := "match" Expr "{" Arm* "}"
Arm     := (int | "_") "=>" Expr
```

- No required semicolons. `//` comments to end of line.
- Comparisons: `== != < <= > >=` on `int`, result `bool`.
- `if` is an expression and requires `else`.
- `match` on `int` requires a `_` arm.
- Record construct: `Bounds { lo: 0, hi: 10 }` (commas optional).
- Calls: `clamp(x, b)` — named functions only.
- Unknown syntax is `PARSE-001`. Do not invent `extern`, lists, or Option yet.

Example:

```
module examples.clamp

record Bounds {
  lo: int
  hi: int
}

fn clamp10(x: int) -> int {
  if x < 0 {
    0
  } else {
    if x > 10 {
      10
    } else {
      x
    }
  }
}
```
