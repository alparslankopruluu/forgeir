import type { Span } from "@forgeir/core";

export type BinaryOp = "+" | "-" | "*" | "/";

export type TypeRef = {
  name: string;
  span: Span;
};

export type Param = {
  name: string;
  type: TypeRef;
  span: Span;
};

export type Expr =
  | { kind: "name"; name: string; span: Span }
  | { kind: "int"; value: number; span: Span }
  | { kind: "binary"; op: BinaryOp; left: Expr; right: Expr; span: Span };

export type Fn = {
  kind: "fn";
  name: string;
  params: Param[];
  returnType: TypeRef;
  body: Expr;
  span: Span;
};

export type Module = {
  kind: "module";
  name: string;
  functions: Fn[];
  span: Span;
};
