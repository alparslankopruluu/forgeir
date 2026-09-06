import type { Span } from "@forgeir/core";

export type BinaryOp =
  | "+"
  | "-"
  | "*"
  | "/"
  | "=="
  | "!="
  | "<"
  | "<="
  | ">"
  | ">=";

export type TypeRef = {
  name: string;
  args: TypeRef[];
  span: Span;
};

export type Param = {
  name: string;
  type: TypeRef;
  span: Span;
};

export type Field = {
  name: string;
  type: TypeRef;
  span: Span;
};

export type RecordDecl = {
  kind: "record";
  name: string;
  nameSpan: Span;
  fields: Field[];
  span: Span;
};

export type FieldInit = {
  name: string;
  value: Expr;
  span: Span;
};

export type Pattern =
  | { kind: "int"; value: number; span: Span }
  | { kind: "wildcard"; span: Span }
  | {
      kind: "variant";
      name: "Some" | "None" | "Ok" | "Err";
      bind: string | null;
      span: Span;
    };

export type MatchArm = {
  pattern: Pattern;
  body: Expr;
  span: Span;
};

export type Expr =
  | { kind: "name"; name: string; span: Span }
  | { kind: "int"; value: number; span: Span }
  | { kind: "bool"; value: boolean; span: Span }
  | { kind: "str"; value: string; span: Span }
  | { kind: "list"; elems: Expr[]; span: Span }
  | { kind: "binary"; op: BinaryOp; left: Expr; right: Expr; span: Span }
  | { kind: "field"; object: Expr; field: string; span: Span }
  | { kind: "index"; object: Expr; index: Expr; span: Span }
  | { kind: "construct"; name: string; fields: FieldInit[]; span: Span }
  | { kind: "call"; name: string; args: Expr[]; span: Span }
  | { kind: "if"; cond: Expr; thenBody: Expr; elseBody: Expr; span: Span }
  | { kind: "match"; scrutinee: Expr; arms: MatchArm[]; span: Span };

export type Fn = {
  kind: "fn";
  name: string;
  nameSpan: Span;
  params: Param[];
  returnType: TypeRef;
  effects: string[];
  body: Expr;
  span: Span;
};

export type Extern = {
  kind: "extern";
  name: string;
  nameSpan: Span;
  params: Param[];
  returnType: TypeRef;
  effects: string[];
  target: string;
  span: Span;
};

export type Use = {
  kind: "use";
  module: string;
  names: string[];
  span: Span;
};

export type Module = {
  kind: "module";
  name: string;
  uses: Use[];
  records: RecordDecl[];
  functions: Fn[];
  externs: Extern[];
  span: Span;
};

export function splitExternTarget(
  target: string,
): { spec: string; exportName: string } | null {
  const i = target.lastIndexOf(".");
  if (i <= 0 || i === target.length - 1) {
    return null;
  }
  const spec = target.slice(0, i);
  const exportName = target.slice(i + 1);
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(exportName)) {
    return null;
  }
  return { spec, exportName };
}
