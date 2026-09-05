import type { Expr, Module } from "@forgeir/syntax";

export type EmitOptions = {
  types?: boolean;
};

export function emitTs(mod: Module, options: EmitOptions = {}): string {
  const types = options.types ?? true;
  const parts: string[] = [];

  if (types) {
    for (const rec of mod.records) {
      const fields = rec.fields
        .map((f) => `  ${f.name}: ${emitType(f.type.name)};`)
        .join("\n");
      parts.push(`export type ${rec.name} = {\n${fields}\n};`);
    }
  }

  for (const fn of mod.functions) {
    const params = fn.params
      .map((p) => (types ? `${p.name}: ${emitType(p.type.name)}` : p.name))
      .join(", ");
    const ret = types ? `: ${emitType(fn.returnType.name)}` : "";
    parts.push(
      `export function ${fn.name}(${params})${ret} {\n  return ${emitExpr(fn.body)};\n}`,
    );
  }

  return parts.length === 0 ? "\n" : `${parts.join("\n\n")}\n`;
}

function emitType(name: string): string {
  if (name === "int") {
    return "number";
  }
  if (name === "bool") {
    return "boolean";
  }
  return name;
}

function emitExpr(expr: Expr): string {
  switch (expr.kind) {
    case "int":
      return String(expr.value);
    case "bool":
      return expr.value ? "true" : "false";
    case "name":
      return expr.name;
    case "binary":
      return `(${emitExpr(expr.left)} ${expr.op} ${emitExpr(expr.right)})`;
    case "field":
      return `${emitExpr(expr.object)}.${expr.field}`;
    case "construct": {
      const fields = expr.fields
        .map((f) => `${f.name}: ${emitExpr(f.value)}`)
        .join(", ");
      return `{ ${fields} }`;
    }
    case "call":
      return `${expr.name}(${expr.args.map(emitExpr).join(", ")})`;
    case "if":
      return `(${emitExpr(expr.cond)} ? ${emitExpr(expr.thenBody)} : ${emitExpr(expr.elseBody)})`;
    case "match": {
      const arms = expr.arms.map((arm) => {
        if (arm.pattern.kind === "wildcard") {
          return `default: return ${emitExpr(arm.body)};`;
        }
        return `case ${arm.pattern.value}: return ${emitExpr(arm.body)};`;
      });
      return `(((_m) => { switch (_m) { ${arms.join(" ")} } })(${emitExpr(expr.scrutinee)}))`;
    }
  }
}
