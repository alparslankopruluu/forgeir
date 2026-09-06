# ForgeIR language kernel (M1 + M3 interop)

Edition: 2026 (hardcoded). File extension: `.fir`. One module per file.

```
Module  := "module" Qid Decl*
Decl    := Record | Fn | Extern
Record  := "record" ident "{" Field* "}"
Field   := ident ":" Type
Fn      := "fn" ident "(" Params? ")" "->" Type Effects? "{" Expr "}"
Extern  := "extern" "fn" ident "(" Params? ")" "->" Type Effects? "=" string
Effects := "!" "{" ident* "}"
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
- Effects are a closed set: `net`, `fs`, `env`. Omit `! { ... }` for pure. Callee effects must be a subset of the caller’s.
- `extern` target is `"module.export"` (last `.` splits). Emits `import { export } from "module"`. No `.d.ts` import.
- `forge run` of an effectful entry function needs `--allow <effect>` for each required effect.
- `net` lowers to `async` TypeScript (`await` on `net` calls). No `async` keyword in `.fir`.
- HTTP: `extern fn http_get(url: str) -> Result[str, str] ! { net } = "@forgeir/http.get"` (thin `fetch` facade, not a stdlib).
- Unknown syntax is `PARSE-001`. Do not invent `use`, `loop`, or `let` yet.

Example:

```
module examples.wrap

extern fn basename(p: str) -> str = "node:path.basename"

fn demo() -> str {
  basename("/tmp/main.fir")
}
```
