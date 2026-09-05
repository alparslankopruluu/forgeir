import type { Span } from "@forgeir/core";
import { qidJoin } from "@forgeir/core";
import { Codes, type Diagnostic } from "@forgeir/diag";
import {
  type Expr,
  type Fn,
  type Module,
  parse,
  type RecordDecl,
} from "@forgeir/syntax";

export type CheckedFn = Fn & { qid: string };

export type CheckedModule = {
  kind: "module";
  name: string;
  records: RecordDecl[];
  functions: CheckedFn[];
  span: Module["span"];
};

export type AnalyzeResult = {
  module: CheckedModule | null;
  diagnostics: Diagnostic[];
};

const INT = "int";
const BOOL = "bool";
const ERROR = "error";
const COMPARE = new Set(["==", "!=", "<", "<=", ">", ">="]);

type FnSig = { params: string[]; ret: string };
type RecordSig = Map<string, string>;

type CheckCtx = {
  qid: string;
  env: Map<string, string>;
  records: Map<string, RecordSig>;
  functions: Map<string, FnSig>;
  diagnostics: Diagnostic[];
};

export function analyze(source: string, file: string): AnalyzeResult {
  const parsed = parse(source, file);
  if (!parsed.module) {
    return { module: null, diagnostics: parsed.diagnostics };
  }
  return check(parsed.module);
}

export function check(mod: Module): AnalyzeResult {
  const diagnostics: Diagnostic[] = [];
  const records = new Map<string, RecordSig>();
  const functions = new Map<string, FnSig>();

  for (const rec of mod.records) {
    if (rec.name === INT || rec.name === BOOL) {
      diagnostics.push({
        severity: "error",
        code: Codes.TYPE_DUPLICATE,
        message: `record name '${rec.name}' is reserved`,
        span: rec.span,
        qid: qidJoin(mod.name, rec.name),
      });
      continue;
    }
    if (records.has(rec.name)) {
      diagnostics.push({
        severity: "error",
        code: Codes.TYPE_DUPLICATE,
        message: `duplicate record '${rec.name}'`,
        span: rec.span,
        qid: qidJoin(mod.name, rec.name),
      });
      continue;
    }
    const fields: RecordSig = new Map();
    for (const field of rec.fields) {
      if (fields.has(field.name)) {
        diagnostics.push({
          severity: "error",
          code: Codes.TYPE_DUPLICATE,
          message: `duplicate field '${field.name}'`,
          span: field.span,
          qid: qidJoin(mod.name, rec.name, field.name),
        });
      }
      fields.set(field.name, field.type.name);
    }
    records.set(rec.name, fields);
  }

  for (const rec of mod.records) {
    const fields = records.get(rec.name);
    if (!fields) {
      continue;
    }
    for (const field of rec.fields) {
      const resolved = resolveTypeName(
        field.type.name,
        field.type.span,
        qidJoin(mod.name, rec.name, field.name),
        records,
        diagnostics,
      );
      if (resolved) {
        fields.set(field.name, resolved);
      }
    }
  }

  for (const fn of mod.functions) {
    if (functions.has(fn.name)) {
      diagnostics.push({
        severity: "error",
        code: Codes.TYPE_DUPLICATE,
        message: `duplicate function '${fn.name}'`,
        span: fn.span,
        qid: qidJoin(mod.name, fn.name),
      });
      continue;
    }
    const params = fn.params.map(
      (p) =>
        resolveTypeName(
          p.type.name,
          p.type.span,
          qidJoin(mod.name, fn.name),
          records,
          diagnostics,
        ) ?? p.type.name,
    );
    const ret =
      resolveTypeName(
        fn.returnType.name,
        fn.returnType.span,
        qidJoin(mod.name, fn.name),
        records,
        diagnostics,
      ) ?? fn.returnType.name;
    functions.set(fn.name, { params, ret });
  }

  const checked: CheckedFn[] = [];
  for (const fn of mod.functions) {
    const qid = qidJoin(mod.name, fn.name);
    const sig = functions.get(fn.name);
    if (!sig) {
      continue;
    }
    const env = new Map<string, string>();
    for (let i = 0; i < fn.params.length; i += 1) {
      const param = fn.params[i];
      const ty = sig.params[i];
      if (param && ty) {
        env.set(param.name, ty);
      }
    }
    const ctx: CheckCtx = { qid, env, records, functions, diagnostics };
    const bodyType = typeExpr(fn.body, ctx);
    if (bodyType !== ERROR && bodyType !== sig.ret) {
      diagnostics.push(
        mismatch(sig.ret, bodyType, fn.body.span, qid, "function body"),
      );
    }
    checked.push({ ...fn, qid });
  }

  if (diagnostics.length > 0) {
    return { module: null, diagnostics };
  }
  return {
    module: {
      kind: "module",
      name: mod.name,
      records: mod.records,
      functions: checked,
      span: mod.span,
    },
    diagnostics,
  };
}

function resolveTypeName(
  name: string,
  span: Span,
  qid: string,
  records: Map<string, RecordSig>,
  diagnostics: Diagnostic[],
): string | null {
  if (name === INT || name === BOOL || records.has(name)) {
    return name;
  }
  diagnostics.push({
    severity: "error",
    code: Codes.TYPE_UNKNOWN_TYPE,
    message: `unknown type '${name}'`,
    span,
    qid,
    received: name,
  });
  return null;
}

function mismatch(
  expected: string,
  received: string,
  span: Span,
  qid: string,
  what: string,
): Diagnostic {
  return {
    severity: "error",
    code: Codes.TYPE_MISMATCH,
    message: `${what} has type ${received}, expected ${expected}`,
    span,
    qid,
    expected,
    received,
    fixes: [
      {
        kind: "change_type",
        message: `change this type to ${expected}`,
      },
      {
        kind: "change_expected",
        message: `change the expected type to ${received}`,
      },
    ],
  };
}

function typeExpr(expr: Expr, ctx: CheckCtx): string {
  switch (expr.kind) {
    case "int":
      return INT;
    case "bool":
      return BOOL;
    case "name": {
      const found = ctx.env.get(expr.name);
      if (!found) {
        ctx.diagnostics.push({
          severity: "error",
          code: Codes.TYPE_UNKNOWN,
          message: `unknown name '${expr.name}'`,
          span: expr.span,
          qid: ctx.qid,
        });
        return ERROR;
      }
      return found;
    }
    case "binary": {
      const left = typeExpr(expr.left, ctx);
      const right = typeExpr(expr.right, ctx);
      if (left === ERROR || right === ERROR) {
        return ERROR;
      }
      if (COMPARE.has(expr.op)) {
        if (left !== INT || right !== INT) {
          ctx.diagnostics.push(
            mismatch(
              INT,
              left !== INT ? left : right,
              expr.span,
              ctx.qid,
              `operator ${expr.op}`,
            ),
          );
          return ERROR;
        }
        return BOOL;
      }
      if (left !== INT || right !== INT) {
        ctx.diagnostics.push(
          mismatch(
            INT,
            left !== INT ? left : right,
            expr.span,
            ctx.qid,
            `operator ${expr.op}`,
          ),
        );
        return ERROR;
      }
      return INT;
    }
    case "field": {
      const objectType = typeExpr(expr.object, ctx);
      if (objectType === ERROR) {
        return ERROR;
      }
      const rec = ctx.records.get(objectType);
      if (!rec) {
        ctx.diagnostics.push({
          severity: "error",
          code: Codes.TYPE_UNKNOWN,
          message: `type '${objectType}' has no fields`,
          span: expr.span,
          qid: ctx.qid,
          received: expr.field,
        });
        return ERROR;
      }
      const fieldType = rec.get(expr.field);
      if (!fieldType) {
        ctx.diagnostics.push({
          severity: "error",
          code: Codes.TYPE_UNKNOWN,
          message: `unknown field '${expr.field}' on ${objectType}`,
          span: expr.span,
          qid: ctx.qid,
        });
        return ERROR;
      }
      return fieldType;
    }
    case "construct": {
      const rec = ctx.records.get(expr.name);
      if (!rec) {
        ctx.diagnostics.push({
          severity: "error",
          code: Codes.TYPE_UNKNOWN_TYPE,
          message: `unknown record '${expr.name}'`,
          span: expr.span,
          qid: ctx.qid,
          received: expr.name,
        });
        return ERROR;
      }
      const seen = new Set<string>();
      for (const init of expr.fields) {
        if (seen.has(init.name)) {
          ctx.diagnostics.push({
            severity: "error",
            code: Codes.TYPE_DUPLICATE,
            message: `duplicate field '${init.name}'`,
            span: init.span,
            qid: ctx.qid,
          });
        }
        seen.add(init.name);
        const expected = rec.get(init.name);
        if (!expected) {
          ctx.diagnostics.push({
            severity: "error",
            code: Codes.TYPE_UNKNOWN,
            message: `unknown field '${init.name}' on ${expr.name}`,
            span: init.span,
            qid: ctx.qid,
          });
          continue;
        }
        const got = typeExpr(init.value, ctx);
        if (got !== ERROR && got !== expected) {
          ctx.diagnostics.push(
            mismatch(expected, got, init.span, ctx.qid, `field ${init.name}`),
          );
        }
      }
      for (const name of rec.keys()) {
        if (!seen.has(name)) {
          ctx.diagnostics.push({
            severity: "error",
            code: Codes.TYPE_MISMATCH,
            message: `missing field '${name}' on ${expr.name}`,
            span: expr.span,
            qid: ctx.qid,
            expected: name,
          });
        }
      }
      return expr.name;
    }
    case "call": {
      const sig = ctx.functions.get(expr.name);
      if (!sig) {
        ctx.diagnostics.push({
          severity: "error",
          code: Codes.TYPE_UNKNOWN,
          message: `unknown function '${expr.name}'`,
          span: expr.span,
          qid: ctx.qid,
        });
        return ERROR;
      }
      if (expr.args.length !== sig.params.length) {
        ctx.diagnostics.push({
          severity: "error",
          code: Codes.TYPE_MISMATCH,
          message: `${expr.name} expects ${sig.params.length} arguments, got ${expr.args.length}`,
          span: expr.span,
          qid: ctx.qid,
          expected: String(sig.params.length),
          received: String(expr.args.length),
        });
      }
      const n = Math.min(expr.args.length, sig.params.length);
      for (let i = 0; i < n; i += 1) {
        const arg = expr.args[i];
        const expected = sig.params[i];
        if (!arg || !expected) {
          continue;
        }
        const got = typeExpr(arg, ctx);
        if (got !== ERROR && got !== expected) {
          ctx.diagnostics.push(
            mismatch(expected, got, arg.span, ctx.qid, `argument ${i + 1}`),
          );
        }
      }
      return sig.ret;
    }
    case "if": {
      const cond = typeExpr(expr.cond, ctx);
      if (cond !== ERROR && cond !== BOOL) {
        ctx.diagnostics.push(
          mismatch(BOOL, cond, expr.cond.span, ctx.qid, "if condition"),
        );
      }
      const thenType = typeExpr(expr.thenBody, ctx);
      const elseType = typeExpr(expr.elseBody, ctx);
      if (thenType === ERROR || elseType === ERROR) {
        return ERROR;
      }
      if (thenType !== elseType) {
        ctx.diagnostics.push(
          mismatch(
            thenType,
            elseType,
            expr.elseBody.span,
            ctx.qid,
            "if else branch",
          ),
        );
        return ERROR;
      }
      return thenType;
    }
    case "match": {
      const scrut = typeExpr(expr.scrutinee, ctx);
      if (scrut !== ERROR && scrut !== INT) {
        ctx.diagnostics.push(
          mismatch(INT, scrut, expr.scrutinee.span, ctx.qid, "match scrutinee"),
        );
      }
      if (expr.arms.length === 0) {
        ctx.diagnostics.push({
          severity: "error",
          code: Codes.TYPE_MISMATCH,
          message: "match needs at least one arm",
          span: expr.span,
          qid: ctx.qid,
        });
        return ERROR;
      }
      let hasWildcard = false;
      const ints = new Set<number>();
      let armType: string | null = null;
      for (const arm of expr.arms) {
        if (arm.pattern.kind === "wildcard") {
          hasWildcard = true;
        } else {
          if (ints.has(arm.pattern.value)) {
            ctx.diagnostics.push({
              severity: "error",
              code: Codes.TYPE_DUPLICATE,
              message: `duplicate match pattern ${arm.pattern.value}`,
              span: arm.pattern.span,
              qid: ctx.qid,
            });
          }
          ints.add(arm.pattern.value);
        }
        const bodyType = typeExpr(arm.body, ctx);
        if (bodyType === ERROR) {
          continue;
        }
        if (armType === null) {
          armType = bodyType;
        } else if (armType !== bodyType) {
          ctx.diagnostics.push(
            mismatch(armType, bodyType, arm.body.span, ctx.qid, "match arm"),
          );
        }
      }
      if (!hasWildcard) {
        ctx.diagnostics.push({
          severity: "error",
          code: Codes.TYPE_MISMATCH,
          message: "int match must include a _ arm",
          span: expr.span,
          qid: ctx.qid,
          expected: "_",
        });
      }
      return armType ?? ERROR;
    }
  }
}
