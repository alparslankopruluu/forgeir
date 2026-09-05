import { qidJoin } from "@forgeir/core";
import { Codes, type Diagnostic } from "@forgeir/diag";
import { type Expr, type Fn, type Module, parse } from "@forgeir/syntax";

export type CheckedFn = Fn & { qid: string };

export type CheckedModule = {
  kind: "module";
  name: string;
  functions: CheckedFn[];
  span: Module["span"];
};

export type AnalyzeResult = {
  module: CheckedModule | null;
  diagnostics: Diagnostic[];
};

const INT = "int";

export function analyze(source: string, file: string): AnalyzeResult {
  const parsed = parse(source, file);
  if (!parsed.module) {
    return { module: null, diagnostics: parsed.diagnostics };
  }
  return check(parsed.module);
}

export function check(mod: Module): AnalyzeResult {
  const diagnostics: Diagnostic[] = [];
  const functions: CheckedFn[] = [];

  for (const fn of mod.functions) {
    const qid = qidJoin(mod.name, fn.name);
    const env = new Map<string, string>();

    for (const param of fn.params) {
      if (param.type.name !== INT) {
        diagnostics.push({
          severity: "error",
          code: Codes.TYPE_MISMATCH,
          message: `parameter ${param.name} has type ${param.type.name}, expected ${INT}`,
          span: param.type.span,
          qid,
          expected: INT,
          received: param.type.name,
        });
      }
      env.set(param.name, param.type.name);
    }

    if (fn.returnType.name !== INT) {
      diagnostics.push({
        severity: "error",
        code: Codes.TYPE_MISMATCH,
        message: `return type ${fn.returnType.name} is not ${INT}`,
        span: fn.returnType.span,
        qid,
        expected: INT,
        received: fn.returnType.name,
      });
    }

    const bodyType = typeExpr(fn.body, env, qid, diagnostics);
    if (
      bodyType !== fn.returnType.name &&
      fn.returnType.name === INT &&
      bodyType !== "error"
    ) {
      diagnostics.push({
        severity: "error",
        code: Codes.TYPE_MISMATCH,
        message: `body has type ${bodyType}, expected ${fn.returnType.name}`,
        span: fn.body.span,
        qid,
        expected: fn.returnType.name,
        received: bodyType,
      });
    }

    functions.push({ ...fn, qid });
  }

  if (diagnostics.length > 0) {
    return { module: null, diagnostics };
  }
  return {
    module: { kind: "module", name: mod.name, functions, span: mod.span },
    diagnostics,
  };
}

function typeExpr(
  expr: Expr,
  env: Map<string, string>,
  qid: string,
  diagnostics: Diagnostic[],
): string {
  switch (expr.kind) {
    case "int":
      return INT;
    case "name": {
      const found = env.get(expr.name);
      if (!found) {
        diagnostics.push({
          severity: "error",
          code: Codes.TYPE_UNKNOWN,
          message: `unknown name '${expr.name}'`,
          span: expr.span,
          qid,
        });
        return "error";
      }
      return found;
    }
    case "binary": {
      const left = typeExpr(expr.left, env, qid, diagnostics);
      const right = typeExpr(expr.right, env, qid, diagnostics);
      if (left === "error" || right === "error") {
        return "error";
      }
      if (left !== INT || right !== INT) {
        diagnostics.push({
          severity: "error",
          code: Codes.TYPE_MISMATCH,
          message: `operator ${expr.op} requires ${INT} operands`,
          span: expr.span,
          qid,
          expected: INT,
          received: left !== INT ? left : right,
        });
        return "error";
      }
      return INT;
    }
  }
}
