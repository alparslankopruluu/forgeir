import type { Span } from "@forgeir/core";
import { Codes, type Diagnostic } from "@forgeir/diag";

export type TokenKind =
  | "module"
  | "fn"
  | "record"
  | "if"
  | "else"
  | "match"
  | "extern"
  | "use"
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
  | "bang"
  | "eq"
  | "lbracket"
  | "rbracket"
  | "string"
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
  extern: "extern",
  use: "use",
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

    if (ch === '"') {
      i += 1;
      let value = "";
      let closed = false;
      while (i < source.length) {
        const cur = source[i] ?? "";
        if (cur === '"') {
          i += 1;
          closed = true;
          break;
        }
        if (cur === "\n") {
          break;
        }
        if (cur === "\\" && i + 1 < source.length) {
          const esc = source[i + 1] ?? "";
          if (esc === "n") {
            value += "\n";
          } else if (esc === "t") {
            value += "\t";
          } else {
            value += esc;
          }
          i += 2;
          continue;
        }
        value += cur;
        i += 1;
      }
      if (!closed) {
        diagnostics.push({
          severity: "error",
          code: Codes.PARSE_UNEXPECTED,
          message: "unterminated string",
          span: spanAt(start, i),
        });
      } else {
        tokens.push({
          kind: "string",
          value,
          span: spanAt(start, i),
        });
      }
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

    if (ch === "!") {
      i += 1;
      push("bang", start, i, "!");
      continue;
    }

    if (ch === "=") {
      i += 1;
      push("eq", start, i, "=");
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
      "[": "lbracket",
      "]": "rbracket",
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
