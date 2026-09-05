import type { Span } from "@forgeir/core";
import { Codes, type Diagnostic } from "@forgeir/diag";
import type { BinaryOp, Expr, Fn, Module, Param, TypeRef } from "./ast.ts";
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
    const functions: Fn[] = [];
    while (this.peek().kind !== "eof") {
      if (this.peek().kind !== "fn") {
        this.fail(
          Codes.PARSE_UNEXPECTED,
          `expected fn, found ${this.peek().kind}${this.peek().value ? ` '${this.peek().value}'` : ""}`,
          this.peek().span,
        );
      }
      functions.push(this.parseFn());
    }
    const end = this.peek().span.end;
    return {
      kind: "module",
      name,
      functions,
      span: { file: this.file, start, end },
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
    this.expect("lbrace");
    const body = this.parseExpr();
    const endTok = this.expect("rbrace");
    return {
      kind: "fn",
      name: nameTok.value,
      params,
      returnType,
      body,
      span: { file: this.file, start, end: endTok.span.end },
    };
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
    return { name: tok.value, span: tok.span };
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

  private parseExpr(): Expr {
    return this.parseAdd();
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
    let left = this.parsePrimary();
    while (this.peek().kind === "star" || this.peek().kind === "slash") {
      const opTok = this.advance();
      const right = this.parsePrimary();
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

  private parsePrimary(): Expr {
    const tok = this.peek();
    if (tok.kind === "number") {
      this.advance();
      return { kind: "int", value: Number(tok.value), span: tok.span };
    }
    if (tok.kind === "ident") {
      this.advance();
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
