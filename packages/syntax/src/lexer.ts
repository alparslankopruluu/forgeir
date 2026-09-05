import type { Span } from "@forgeir/core";
import { Codes, type Diagnostic } from "@forgeir/diag";

export type TokenKind =
  | "module"
  | "fn"
  | "record"
  | "if"
  | "else"
  | "match"
  | "true"
  | "false"
  | "ident"
  | "number"
  | "colon"
  | "arrow"
  | "fatarrow"
  | "lparen"
  | "rparen"
  | "lbrace"
  | "rbrace"
  | "comma"
  | "plus"
  | "minus"
  | "star"
  | "slash"
  | "dot"
  | "eqeq"
  | "ne"
  | "lt"
  | "gt"
  | "le"
  | "ge"
  | "eof";

export type Token = {
  kind: TokenKind;
  value: string;
  span: Span;
};

export type LexResult = {
  tokens: Token[];
  diagnostics: Diagnostic[];
};

const KEYWORDS: Record<string, TokenKind> = {
  module: "module",
  fn: "fn",
  record: "record",
  if: "if",
  else: "else",
  match: "match",
  true: "true",
  false: "false",
};

function isIdentStart(ch: string): boolean {
  return /[A-Za-z_]/.test(ch);
}

function isIdentPart(ch: string): boolean {
  return /[A-Za-z0-9_]/.test(ch);
}

function isDigit(ch: string): boolean {
  return /[0-9]/.test(ch);
}

export function lex(source: string, file: string): LexResult {
  const tokens: Token[] = [];
  const diagnostics: Diagnostic[] = [];
  let i = 0;

  const spanAt = (start: number, end: number): Span => ({ file, start, end });

  const push = (
    kind: TokenKind,
    start: number,
    end: number,
    value = source.slice(start, end),
  ) => {
    tokens.push({ kind, value, span: spanAt(start, end) });
  };

  while (i < source.length) {
    const ch = source[i] ?? "";

    if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
      i += 1;
      continue;
    }

    if (ch === "/" && source[i + 1] === "/") {
      while (i < source.length && source[i] !== "\n") {
        i += 1;
      }
      continue;
    }

    const start = i;

    if (isIdentStart(ch)) {
      i += 1;
      while (i < source.length && isIdentPart(source[i] ?? "")) {
        i += 1;
      }
      const value = source.slice(start, i);
      const kind = KEYWORDS[value] ?? "ident";
      push(kind, start, i, value);
      continue;
    }

    if (isDigit(ch)) {
      i += 1;
      while (i < source.length && isDigit(source[i] ?? "")) {
        i += 1;
      }
      push("number", start, i);
      continue;
    }

    if (ch === "-" && source[i + 1] === ">") {
      i += 2;
      push("arrow", start, i, "->");
      continue;
    }

    if (ch === "=" && source[i + 1] === ">") {
      i += 2;
      push("fatarrow", start, i, "=>");
      continue;
    }

    if (ch === "=" && source[i + 1] === "=") {
      i += 2;
      push("eqeq", start, i, "==");
      continue;
    }

    if (ch === "!" && source[i + 1] === "=") {
      i += 2;
      push("ne", start, i, "!=");
      continue;
    }

    if (ch === "<" && source[i + 1] === "=") {
      i += 2;
      push("le", start, i, "<=");
      continue;
    }

    if (ch === ">" && source[i + 1] === "=") {
      i += 2;
      push("ge", start, i, ">=");
      continue;
    }

    const singles: Record<string, TokenKind> = {
      ":": "colon",
      "(": "lparen",
      ")": "rparen",
      "{": "lbrace",
      "}": "rbrace",
      ",": "comma",
      "+": "plus",
      "-": "minus",
      "*": "star",
      "/": "slash",
      ".": "dot",
      "<": "lt",
      ">": "gt",
    };
    const kind = singles[ch];
    if (kind) {
      i += 1;
      push(kind, start, i, ch);
      continue;
    }

    diagnostics.push({
      severity: "error",
      code: Codes.PARSE_UNEXPECTED,
      message: `unexpected character ${JSON.stringify(ch)}`,
      span: spanAt(start, start + 1),
    });
    i += 1;
  }

  tokens.push({
    kind: "eof",
    value: "",
    span: spanAt(source.length, source.length),
  });
  return { tokens, diagnostics };
}
