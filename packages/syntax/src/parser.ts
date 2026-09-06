import type { Span } from "@forgeir/core";
import { Codes, type Diagnostic } from "@forgeir/diag";
import type {
  BinaryOp,
  Expr,
  Extern,
  Field,
  FieldInit,
  Fn,
  MatchArm,
  Module,
  Param,
  Pattern,
  RecordDecl,
  TypeRef,
} from "./ast.ts";
import { lex, type Token, type TokenKind } from "./lexer.ts";

export type ParseResult = {
  module: Module | null;
  diagnostics: Diagnostic[];
};

class ParseError extends Error {
  constructor(readonly diagnostic: Diagnostic) {
    super(diagnostic.message);
  }
}

const COMPARE: Record<string, BinaryOp> = {
  eqeq: "==",
  ne: "!=",
  lt: "<",
  gt: ">",
  le: "<=",
  ge: ">=",
};

export function parse(source: string, file: string): ParseResult {
  const lexed = lex(source, file);
  if (lexed.diagnostics.length > 0) {
    return { module: null, diagnostics: lexed.diagnostics };
  }
  const parser = new Parser(lexed.tokens, file);
  try {
    return { module: parser.parseModule(), diagnostics: [] };
  } catch (err) {
    if (err instanceof ParseError) {
      return { module: null, diagnostics: [err.diagnostic] };
    }
    throw err;
  }
}

class Parser {
  private i = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly file: string,
  ) {}

  parseModule(): Module {
    const start = this.peek().span.start;
    this.expect("module");
    const name = this.parseQid();
    const records: RecordDecl[] = [];
    const functions: Fn[] = [];
    const externs: Extern[] = [];
    while (this.peek().kind !== "eof") {
      if (this.peek().kind === "record") {
        records.push(this.parseRecord());
        continue;
      }
      if (this.peek().kind === "fn") {
        functions.push(this.parseFn());
        continue;
      }
      if (this.peek().kind === "extern") {
        externs.push(this.parseExtern());
        continue;
      }
      this.fail(
        Codes.PARSE_UNEXPECTED,
        `expected record, fn, or extern, found ${this.peek().kind}${this.peek().value ? ` '${this.peek().value}'` : ""}`,
        this.peek().span,
      );
    }
    const end = this.peek().span.end;
    return {
      kind: "module",
      name,
      records,
      functions,
      externs,
      span: { file: this.file, start, end },
    };
  }

  private parseRecord(): RecordDecl {
    const start = this.peek().span.start;
    this.expect("record");
    const nameTok = this.expect("ident");
    this.expect("lbrace");
    const fields: Field[] = [];
    while (this.peek().kind !== "rbrace" && this.peek().kind !== "eof") {
      const fieldName = this.expect("ident");
      this.expect("colon");
      const type = this.parseType();
      if (this.peek().kind === "comma") {
        this.advance();
      }
      fields.push({
        name: fieldName.value,
        type,
        span: {
          file: this.file,
          start: fieldName.span.start,
          end: type.span.end,
        },
      });
    }
    const endTok = this.expect("rbrace");
    return {
      kind: "record",
      name: nameTok.value,
      fields,
      span: { file: this.file, start, end: endTok.span.end },
    };
  }

  private parseFn(): Fn {
    const start = this.peek().span.start;
    this.expect("fn");
    const nameTok = this.expect("ident");
    this.expect("lparen");
    const params = this.parseParams();
    this.expect("rparen");
    this.expect("arrow");
    const returnType = this.parseType();
    const effects = this.parseEffectSet();
    const body = this.parseBlock();
    return {
      kind: "fn",
      name: nameTok.value,
      params,
      returnType,
      effects,
      body,
      span: { file: this.file, start, end: body.span.end },
    };
  }

  private parseExtern(): Extern {
    const start = this.peek().span.start;
    this.expect("extern");
    this.expect("fn");
    const nameTok = this.expect("ident");
    this.expect("lparen");
    const params = this.parseParams();
    this.expect("rparen");
    this.expect("arrow");
    const returnType = this.parseType();
    const effects = this.parseEffectSet();
    this.expect("eq");
    const targetTok = this.expect("string");
    return {
      kind: "extern",
      name: nameTok.value,
      params,
      returnType,
      effects,
      target: targetTok.value,
      span: { file: this.file, start, end: targetTok.span.end },
    };
  }

  private parseEffectSet(): string[] {
    if (this.peek().kind !== "bang") {
      return [];
    }
    this.advance();
    this.expect("lbrace");
    const effects: string[] = [];
    while (this.peek().kind !== "rbrace" && this.peek().kind !== "eof") {
      const nameTok = this.expect("ident");
      effects.push(nameTok.value);
      if (this.peek().kind === "comma") {
        this.advance();
      }
    }
    this.expect("rbrace");
    return effects;
  }

  private parseParams(): Param[] {
    if (this.peek().kind === "rparen") {
      return [];
    }
    const params = [this.parseParam()];
    while (this.peek().kind === "comma") {
      this.advance();
      params.push(this.parseParam());
    }
    return params;
  }

  private parseParam(): Param {
    const nameTok = this.expect("ident");
    this.expect("colon");
    const type = this.parseType();
    return {
      name: nameTok.value,
      type,
      span: { file: this.file, start: nameTok.span.start, end: type.span.end },
    };
  }

  private parseType(): TypeRef {
    const tok = this.expect("ident");
    const args: TypeRef[] = [];
    let end = tok.span.end;
    if (this.peek().kind === "lbracket") {
      this.advance();
      args.push(this.parseType());
      while (this.peek().kind === "comma") {
        this.advance();
        args.push(this.parseType());
      }
      const close = this.expect("rbracket");
      end = close.span.end;
    }
    return {
      name: tok.value,
      args,
      span: { file: this.file, start: tok.span.start, end },
    };
  }

  private parseQid(): string {
    const first = this.expect("ident");
    const parts = [first.value];
    while (this.peek().kind === "dot") {
      this.advance();
      parts.push(this.expect("ident").value);
    }
    return parts.join(".");
  }

  private parseBlock(): Expr {
    this.expect("lbrace");
    const expr = this.parseExpr();
    this.expect("rbrace");
    return expr;
  }

  private parseExpr(): Expr {
    return this.parseCompare();
  }

  private parseCompare(): Expr {
    let left = this.parseAdd();
    const op = COMPARE[this.peek().kind];
    if (!op) {
      return left;
    }
    while (COMPARE[this.peek().kind]) {
      const opTok = this.advance();
      const right = this.parseAdd();
      const cmp = COMPARE[opTok.kind];
      if (!cmp) {
        this.fail(Codes.PARSE_UNEXPECTED, "expected comparison", opTok.span);
      }
      left = {
        kind: "binary",
        op: cmp,
        left,
        right,
        span: joinSpan(left.span, right.span),
      };
    }
    return left;
  }

  private parseAdd(): Expr {
    let left = this.parseMul();
    while (this.peek().kind === "plus" || this.peek().kind === "minus") {
      const opTok = this.advance();
      const right = this.parseMul();
      left = {
        kind: "binary",
        op: opTok.kind === "plus" ? "+" : "-",
        left,
        right,
        span: joinSpan(left.span, right.span),
      };
    }
    return left;
  }

  private parseMul(): Expr {
    let left = this.parsePostfix();
    while (this.peek().kind === "star" || this.peek().kind === "slash") {
      const opTok = this.advance();
      const right = this.parsePostfix();
      const op: BinaryOp = opTok.kind === "star" ? "*" : "/";
      left = {
        kind: "binary",
        op,
        left,
        right,
        span: joinSpan(left.span, right.span),
      };
    }
    return left;
  }

  private parsePostfix(): Expr {
    let expr = this.parseAtom();
    while (true) {
      if (this.peek().kind === "dot") {
        this.advance();
        const field = this.expect("ident");
        expr = {
          kind: "field",
          object: expr,
          field: field.value,
          span: joinSpan(expr.span, field.span),
        };
        continue;
      }
      if (this.peek().kind === "lbracket") {
        this.advance();
        const index = this.parseExpr();
        const endTok = this.expect("rbracket");
        expr = {
          kind: "index",
          object: expr,
          index,
          span: {
            file: this.file,
            start: expr.span.start,
            end: endTok.span.end,
          },
        };
        continue;
      }
      if (this.peek().kind === "lparen") {
        if (expr.kind !== "name") {
          this.fail(
            Codes.PARSE_UNEXPECTED,
            "only named functions can be called",
            this.peek().span,
          );
        }
        this.advance();
        const args = this.parseArgList();
        const endTok = this.expect("rparen");
        expr = {
          kind: "call",
          name: expr.name,
          args,
          span: {
            file: this.file,
            start: expr.span.start,
            end: endTok.span.end,
          },
        };
        continue;
      }
      break;
    }
    return expr;
  }

  private parseArgList(): Expr[] {
    if (this.peek().kind === "rparen") {
      return [];
    }
    const args = [this.parseExpr()];
    while (this.peek().kind === "comma") {
      this.advance();
      args.push(this.parseExpr());
    }
    return args;
  }

  private parseAtom(): Expr {
    const tok = this.peek();
    if (tok.kind === "if") {
      return this.parseIf();
    }
    if (tok.kind === "match") {
      return this.parseMatch();
    }
    if (tok.kind === "true" || tok.kind === "false") {
      this.advance();
      return { kind: "bool", value: tok.kind === "true", span: tok.span };
    }
    if (tok.kind === "number") {
      this.advance();
      return { kind: "int", value: Number(tok.value), span: tok.span };
    }
    if (tok.kind === "string") {
      this.advance();
      return { kind: "str", value: tok.value, span: tok.span };
    }
    if (tok.kind === "lbracket") {
      return this.parseList();
    }
    if (tok.kind === "ident") {
      this.advance();
      if (this.isConstructStart()) {
        return this.parseConstruct(tok);
      }
      return { kind: "name", name: tok.value, span: tok.span };
    }
    if (tok.kind === "lparen") {
      this.advance();
      const expr = this.parseExpr();
      this.expect("rparen");
      return expr;
    }
    if (tok.kind === "eof") {
      this.fail(Codes.PARSE_EOF, "unexpected end of file", tok.span);
    }
    this.fail(
      Codes.PARSE_UNEXPECTED,
      `unexpected token '${tok.value}'`,
      tok.span,
    );
  }

  private isConstructStart(): boolean {
    if (this.peek().kind !== "lbrace") {
      return false;
    }
    const inner = this.peekAt(1);
    const after = this.peekAt(2);
    return (
      inner.kind === "rbrace" ||
      (inner.kind === "ident" && after.kind === "colon")
    );
  }

  private peekAt(offset: number): Token {
    const tok = this.tokens[this.i + offset];
    if (tok) {
      return tok;
    }
    return this.peek();
  }

  private parseConstruct(nameTok: Token): Expr {
    this.expect("lbrace");
    const fields: FieldInit[] = [];
    while (this.peek().kind !== "rbrace" && this.peek().kind !== "eof") {
      const fieldName = this.expect("ident");
      this.expect("colon");
      const value = this.parseExpr();
      if (this.peek().kind === "comma") {
        this.advance();
      }
      fields.push({
        name: fieldName.value,
        value,
        span: joinSpan(fieldName.span, value.span),
      });
    }
    const endTok = this.expect("rbrace");
    return {
      kind: "construct",
      name: nameTok.value,
      fields,
      span: {
        file: this.file,
        start: nameTok.span.start,
        end: endTok.span.end,
      },
    };
  }

  private parseList(): Expr {
    const startTok = this.expect("lbracket");
    const elems: Expr[] = [];
    if (this.peek().kind !== "rbracket") {
      elems.push(this.parseExpr());
      while (this.peek().kind === "comma") {
        this.advance();
        if (this.peek().kind === "rbracket") {
          break;
        }
        elems.push(this.parseExpr());
      }
    }
    const endTok = this.expect("rbracket");
    return {
      kind: "list",
      elems,
      span: {
        file: this.file,
        start: startTok.span.start,
        end: endTok.span.end,
      },
    };
  }

  private parseIf(): Expr {
    const start = this.peek().span.start;
    this.expect("if");
    const cond = this.parseExpr();
    const thenBody = this.parseBlock();
    this.expect("else");
    const elseBody = this.parseBlock();
    return {
      kind: "if",
      cond,
      thenBody,
      elseBody,
      span: { file: this.file, start, end: elseBody.span.end },
    };
  }

  private parseMatch(): Expr {
    const start = this.peek().span.start;
    this.expect("match");
    const scrutinee = this.parseExpr();
    this.expect("lbrace");
    const arms: MatchArm[] = [];
    while (this.peek().kind !== "rbrace" && this.peek().kind !== "eof") {
      arms.push(this.parseArm());
    }
    const endTok = this.expect("rbrace");
    return {
      kind: "match",
      scrutinee,
      arms,
      span: { file: this.file, start, end: endTok.span.end },
    };
  }

  private parseArm(): MatchArm {
    const pattern = this.parsePattern();
    this.expect("fatarrow");
    const body = this.parseExpr();
    return {
      pattern,
      body,
      span: joinSpan(pattern.span, body.span),
    };
  }

  private parsePattern(): Pattern {
    const tok = this.peek();
    if (tok.kind === "number") {
      this.advance();
      return { kind: "int", value: Number(tok.value), span: tok.span };
    }
    if (tok.kind === "ident" && tok.value === "_") {
      this.advance();
      return { kind: "wildcard", span: tok.span };
    }
    if (tok.kind === "ident" && tok.value === "None") {
      this.advance();
      return { kind: "variant", name: "None", bind: null, span: tok.span };
    }
    if (
      tok.kind === "ident" &&
      (tok.value === "Some" || tok.value === "Ok" || tok.value === "Err")
    ) {
      this.advance();
      this.expect("lparen");
      const inner = this.peek();
      let bind: string | null = null;
      if (inner.kind === "ident") {
        this.advance();
        bind = inner.value === "_" ? null : inner.value;
      } else {
        this.fail(
          Codes.PARSE_UNEXPECTED,
          "expected binding in variant pattern",
          inner.span,
        );
      }
      const endTok = this.expect("rparen");
      return {
        kind: "variant",
        name: tok.value as "Some" | "Ok" | "Err",
        bind,
        span: { file: this.file, start: tok.span.start, end: endTok.span.end },
      };
    }
    this.fail(
      Codes.PARSE_UNEXPECTED,
      "expected match pattern (int, _, Some, None, Ok, or Err)",
      tok.span,
    );
  }

  private peek(): Token {
    const tok = this.tokens[this.i];
    if (!tok) {
      const last = this.tokens[this.tokens.length - 1];
      if (!last) {
        return {
          kind: "eof",
          value: "",
          span: { file: this.file, start: 0, end: 0 },
        };
      }
      return last;
    }
    return tok;
  }

  private advance(): Token {
    const tok = this.peek();
    if (tok.kind !== "eof") {
      this.i += 1;
    }
    return tok;
  }

  private expect(kind: TokenKind): Token {
    const tok = this.peek();
    if (tok.kind !== kind) {
      if (tok.kind === "eof") {
        this.fail(
          Codes.PARSE_EOF,
          `expected ${kind}, found end of file`,
          tok.span,
        );
      }
      this.fail(
        Codes.PARSE_UNEXPECTED,
        `expected ${kind}, found ${tok.kind}`,
        tok.span,
      );
    }
    return this.advance();
  }

  private fail(code: string, message: string, span: Span): never {
    throw new ParseError({
      severity: "error",
      code,
      message,
      span,
    });
  }
}

function joinSpan(a: Span, b: Span): Span {
  return { file: a.file, start: a.start, end: b.end };
}
