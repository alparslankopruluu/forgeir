# ForgeIR language kernel (M1)

Edition: 2026 (hardcoded). File extension: `.fir`. One module per file.

```
Module  := "module" Qid Decl*
Decl    := Record | Fn
Record  := "record" ident "{" Field* "}"
Field   := ident ":" Type
Fn      := "fn" ident "(" Params? ")" "->" Type "{" Expr "}"
Type    := "int" | "bool" | "str" | ident | "list" "[" Type "]"
         | "Option" "[" Type "]" | "Result" "[" Type "," Type "]"
If      := "if" Expr "{" Expr "}" "else" "{" Expr "}"
Match   := "match" Expr "{" Arm* "}"
Arm     := Pattern "=>" Expr
Pattern := int | "_" | "None" | "Some" "(" ident ")" | "Ok" "(" ident ")" | "Err" "(" ident ")"
```

- No required semicolons. `//` comments to end of line.
- Comparisons: `== != < <= > >=` on `int`, result `bool`.
- `if` is an expression and requires `else`.
- `match` on `int` requires `_`. `Option` needs `Some`/`None` (or `_`). `Result` needs `Ok`/`Err` (or `_`).
- List literal `[1, 2]`. Index `xs[i]` has type `Option[T]`.
- `Some(x)`, `None`, `Ok(x)`, `Err(e)` are builtin constructors.
- `[]` and `None` need an expected type (parameter, return, or argument).
- Unknown syntax is `PARSE-001`. Do not invent `extern` yet.

Example:

```
module examples.option

fn first_or(xs: list[int], fallback: int) -> int {
  match xs[0] {
    Some(v) => v
    None => fallback
  }
}
```
