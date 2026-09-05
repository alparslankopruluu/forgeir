import type { Expr, Module } from "@forgeir/syntax";

export type EmitOptions = {
  types?: boolean;
};

export function emitTs(mod: Module, options: EmitOptions = {}): string {
  const types = options.types ?? true;
  const fns = mod.functions.map((fn) => {
    const params = fn.params
      .map((p) => (types ? `${p.name}: number` : p.name))
      .join(", ");
    const ret = types ? ": number" : "";
    return `export function ${fn.name}(${params})${ret} {\n  return ${emitExpr(fn.body)};\n}`;
  });
  return `${fns.join("\n\n")}\n`;
}

function emitExpr(expr: Expr): string {
  switch (expr.kind) {
    case "int":
      return String(expr.value);
    case "name":
      return expr.name;
    case "binary":
      return `(${emitExpr(expr.left)} ${expr.op} ${emitExpr(expr.right)})`;
  }
}
