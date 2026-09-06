import type { Expr, Extern, Module, TypeRef } from "@forgeir/syntax";
import { splitExternTarget } from "@forgeir/syntax";

export type EmitOptions = {
  types?: boolean;
};

export function emitTs(mod: Module, options: EmitOptions = {}): string {
  const types = options.types ?? true;
  const parts: string[] = [];
  parts.push(...emitImports(mod.externs));

  if (types) {
    if (moduleUses(mod, "Option")) {
      parts.push(
        'export type Option<T> = { tag: "some"; value: T } | { tag: "none" };',
      );
    }
    if (moduleUses(mod, "Result")) {
      parts.push(
        'export type Result<T, E> = { tag: "ok"; value: T } | { tag: "err"; value: E };',
      );
    }
    for (const rec of mod.records) {
      const fields = rec.fields
        .map((f) => `  ${f.name}: ${emitTypeRef(f.type)};`)
        .join("\n");
      parts.push(`export type ${rec.name} = {\n${fields}\n};`);
    }
  }

  for (const fn of mod.functions) {
    const params = fn.params
      .map((p) => (types ? `${p.name}: ${emitTypeRef(p.type)}` : p.name))
      .join(", ");
    const ret = types ? `: ${emitTypeRef(fn.returnType)}` : "";
    parts.push(
      `export function ${fn.name}(${params})${ret} {\n  return ${emitExpr(fn.body)};\n}`,
    );
  }

  return parts.length === 0 ? "\n" : `${parts.join("\n\n")}\n`;
}

function emitImports(externs: Extern[]): string[] {
  const bySpec = new Map<string, { exportName: string; local: string }[]>();
  for (const ext of externs) {
    const split = splitExternTarget(ext.target);
    if (!split) {
      continue;
    }
    const list = bySpec.get(split.spec) ?? [];
    if (!list.some((b) => b.local === ext.name)) {
      list.push({ exportName: split.exportName, local: ext.name });
    }
    bySpec.set(split.spec, list);
  }
  return [...bySpec.keys()].sort().map((spec) => {
    const names = (bySpec.get(spec) ?? []).slice().sort((a, b) => {
      if (a.local < b.local) {
        return -1;
      }
      if (a.local > b.local) {
        return 1;
      }
      return 0;
    });
    const bindings = names.map((n) =>
      n.exportName === n.local ? n.local : `${n.exportName} as ${n.local}`,
    );
    return `import { ${bindings.join(", ")} } from ${JSON.stringify(spec)};`;
  });
}

function moduleUses(mod: Module, name: string): boolean {
  const inType = (t: TypeRef): boolean =>
    t.name === name || t.args.some((a) => inType(a));
  for (const rec of mod.records) {
    if (rec.fields.some((f) => inType(f.type))) {
      return true;
    }
  }
  const fns = [...mod.functions, ...mod.externs];
  return fns.some(
    (fn) => inType(fn.returnType) || fn.params.some((p) => inType(p.type)),
  );
}

function emitTypeRef(t: TypeRef): string {
  if (t.name === "int") {
    return "number";
  }
  if (t.name === "bool") {
    return "boolean";
  }
  if (t.name === "str") {
    return "string";
  }
  if (t.name === "list") {
    const elem = t.args[0];
    return `${elem ? emitTypeRef(elem) : "never"}[]`;
  }
  if (t.name === "Option") {
    const inner = t.args[0];
    return `Option<${inner ? emitTypeRef(inner) : "never"}>`;
  }
  if (t.name === "Result") {
    const ok = t.args[0];
    const err = t.args[1];
    return `Result<${ok ? emitTypeRef(ok) : "never"}, ${err ? emitTypeRef(err) : "never"}>`;
  }
  return t.name;
}

function emitExpr(expr: Expr): string {
  switch (expr.kind) {
    case "int":
      return String(expr.value);
    case "bool":
      return expr.value ? "true" : "false";
    case "str":
      return JSON.stringify(expr.value);
    case "name":
      if (expr.name === "None") {
        return '{ tag: "none" }';
      }
      return expr.name;
    case "list":
      return `[${expr.elems.map(emitExpr).join(", ")}]`;
    case "binary":
      return `(${emitExpr(expr.left)} ${expr.op} ${emitExpr(expr.right)})`;
    case "field":
      return `${emitExpr(expr.object)}.${expr.field}`;
    case "index":
      return `(((_o, _i) => (_i >= 0 && _i < _o.length ? { tag: "some", value: _o[_i] } : { tag: "none" }))(${emitExpr(expr.object)}, ${emitExpr(expr.index)}))`;
    case "construct": {
      const fields = expr.fields
        .map((f) => `${f.name}: ${emitExpr(f.value)}`)
        .join(", ");
      return `{ ${fields} }`;
    }
    case "call":
      return emitCall(expr.name, expr.args);
    case "if":
      return `(${emitExpr(expr.cond)} ? ${emitExpr(expr.thenBody)} : ${emitExpr(expr.elseBody)})`;
    case "match":
      return emitMatch(expr);
  }
}

function emitCall(name: string, args: Expr[]): string {
  if (name === "Some" && args[0]) {
    return `{ tag: "some", value: ${emitExpr(args[0])} }`;
  }
  if (name === "Ok" && args[0]) {
    return `{ tag: "ok", value: ${emitExpr(args[0])} }`;
  }
  if (name === "Err" && args[0]) {
    return `{ tag: "err", value: ${emitExpr(args[0])} }`;
  }
  return `${name}(${args.map(emitExpr).join(", ")})`;
}

function emitMatch(expr: Extract<Expr, { kind: "match" }>): string {
  const variant = expr.arms.some((arm) => arm.pattern.kind === "variant");
  if (!variant) {
    const arms = expr.arms.map((arm) => {
      if (arm.pattern.kind === "wildcard") {
        return `default: return ${emitExpr(arm.body)};`;
      }
      if (arm.pattern.kind === "int") {
        return `case ${arm.pattern.value}: return ${emitExpr(arm.body)};`;
      }
      return `default: return ${emitExpr(arm.body)};`;
    });
    return `(((_m) => { switch (_m) { ${arms.join(" ")} } })(${emitExpr(expr.scrutinee)}))`;
  }
  const arms = expr.arms.map((arm) => {
    if (arm.pattern.kind === "wildcard") {
      return `return ${emitExpr(arm.body)};`;
    }
    if (arm.pattern.kind !== "variant") {
      return `return ${emitExpr(arm.body)};`;
    }
    const tag =
      arm.pattern.name === "Some"
        ? "some"
        : arm.pattern.name === "None"
          ? "none"
          : arm.pattern.name === "Ok"
            ? "ok"
            : "err";
    const bind = arm.pattern.bind
      ? ` const ${arm.pattern.bind} = _m.value;`
      : "";
    return `if (_m.tag === "${tag}") {${bind} return ${emitExpr(arm.body)}; }`;
  });
  return `(((_m) => { ${arms.join(" ")} })(${emitExpr(expr.scrutinee)}))`;
}
