import type { TypeRef } from "@forgeir/syntax";

export type Type =
  | { tag: "int" }
  | { tag: "bool" }
  | { tag: "str" }
  | { tag: "named"; name: string }
  | { tag: "list"; elem: Type }
  | { tag: "option"; inner: Type }
  | { tag: "result"; ok: Type; err: Type }
  | { tag: "error" };

export const TInt: Type = { tag: "int" };
export const TBool: Type = { tag: "bool" };
export const TStr: Type = { tag: "str" };
export const TError: Type = { tag: "error" };

export function typeEq(a: Type, b: Type): boolean {
  if (a.tag === "error" || b.tag === "error") {
    return true;
  }
  if (a.tag !== b.tag) {
    return false;
  }
  switch (a.tag) {
    case "int":
    case "bool":
    case "str":
      return true;
    case "named":
      return b.tag === "named" && a.name === b.name;
    case "list":
      return b.tag === "list" && typeEq(a.elem, b.elem);
    case "option":
      return b.tag === "option" && typeEq(a.inner, b.inner);
    case "result":
      return b.tag === "result" && typeEq(a.ok, b.ok) && typeEq(a.err, b.err);
  }
}

export function typeStr(t: Type): string {
  switch (t.tag) {
    case "int":
      return "int";
    case "bool":
      return "bool";
    case "str":
      return "str";
    case "named":
      return t.name;
    case "list":
      return `list[${typeStr(t.elem)}]`;
    case "option":
      return `Option[${typeStr(t.inner)}]`;
    case "result":
      return `Result[${typeStr(t.ok)}, ${typeStr(t.err)}]`;
    case "error":
      return "error";
  }
}

export function typeRefStr(t: TypeRef): string {
  if (t.args.length === 0) {
    return t.name;
  }
  return `${t.name}[${t.args.map(typeRefStr).join(", ")}]`;
}
