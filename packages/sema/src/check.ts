import type { Span } from "@forgeir/core";
import { qidJoin } from "@forgeir/core";
import { Codes, type Diagnostic } from "@forgeir/diag";
import {
  type Expr,
  type Fn,
  type Module,
  parse,
  type RecordDecl,
  type TypeRef,
} from "@forgeir/syntax";
import {
  TBool,
  TError,
  TInt,
  TStr,
  type Type,
  typeEq,
  typeStr,
} from "./type.ts";

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

const COMPARE = new Set(["==", "!=", "<", "<=", ">", ">="]);
const RESERVED = new Set(["int", "bool", "str", "list", "Option", "Result"]);
const BUILTIN_FNS = new Set(["Some", "Ok", "Err", "None"]);

type FnSig = { params: Type[]; ret: Type };
type RecordSig = Map<string, Type>;

type CheckCtx = {
  qid: string;
  env: Map<string, Type>;
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
    if (RESERVED.has(rec.name)) {
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
    records.set(rec.name, new Map());
  }

  for (const rec of mod.records) {
    const fields = records.get(rec.name);
    if (!fields) {
      continue;
    }
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
      const ty = resolveType(
        field.type,
        qidJoin(mod.name, rec.name, field.name),
        records,
        diagnostics,
      );
      fields.set(field.name, ty ?? TError);
    }
  }

  for (const fn of mod.functions) {
    if (BUILTIN_FNS.has(fn.name)) {
      diagnostics.push({
        severity: "error",
        code: Codes.TYPE_DUPLICATE,
        message: `function name '${fn.name}' is reserved`,
        span: fn.span,
        qid: qidJoin(mod.name, fn.name),
      });
      continue;
    }
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
    const qid = qidJoin(mod.name, fn.name);
    const params = fn.params.map(
      (p) => resolveType(p.type, qid, records, diagnostics) ?? TError,
    );
    const ret = resolveType(fn.returnType, qid, records, diagnostics) ?? TError;
    functions.set(fn.name, { params, ret });
  }

  const checked: CheckedFn[] = [];
  for (const fn of mod.functions) {
    const qid = qidJoin(mod.name, fn.name);
    const sig = functions.get(fn.name);
    if (!sig) {
      continue;
    }
    const env = new Map<string, Type>();
    for (let i = 0; i < fn.params.length; i += 1) {
      const param = fn.params[i];
      const ty = sig.params[i];
      if (param && ty) {
        env.set(param.name, ty);
      }
    }
    const ctx: CheckCtx = { qid, env, records, functions, diagnostics };
    const bodyType = typeExpr(fn.body, ctx, sig.ret);
    if (bodyType.tag !== "error" && !typeEq(bodyType, sig.ret)) {
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

function resolveType(
  ref: TypeRef,
  qid: string,
  records: Map<string, RecordSig>,
  diagnostics: Diagnostic[],
): Type | null {
  if (ref.name === "int" && ref.args.length === 0) {
    return TInt;
  }
  if (ref.name === "bool" && ref.args.length === 0) {
    return TBool;
  }
  if (ref.name === "str" && ref.args.length === 0) {
    return TStr;
  }
  if (ref.name === "list") {
    if (ref.args.length !== 1 || !ref.args[0]) {
      diagnostics.push({
        severity: "error",
        code: Codes.TYPE_MISMATCH,
        message: "list expects 1 type argument",
        span: ref.span,
        qid,
        expected: "1",
        received: String(ref.args.length),
      });
      return null;
    }
    const elem = resolveType(ref.args[0], qid, records, diagnostics);
    return elem ? { tag: "list", elem } : null;
  }
  if (ref.name === "Option") {
    if (ref.args.length !== 1 || !ref.args[0]) {
      diagnostics.push({
        severity: "error",
        code: Codes.TYPE_MISMATCH,
        message: "Option expects 1 type argument",
        span: ref.span,
        qid,
        expected: "1",
        received: String(ref.args.length),
      });
      return null;
    }
    const inner = resolveType(ref.args[0], qid, records, diagnostics);
    return inner ? { tag: "option", inner } : null;
  }
  if (ref.name === "Result") {
    if (ref.args.length !== 2 || !ref.args[0] || !ref.args[1]) {
      diagnostics.push({
        severity: "error",
        code: Codes.TYPE_MISMATCH,
        message: "Result expects 2 type arguments",
        span: ref.span,
        qid,
        expected: "2",
        received: String(ref.args.length),
      });
      return null;
    }
    const ok = resolveType(ref.args[0], qid, records, diagnostics);
    const err = resolveType(ref.args[1], qid, records, diagnostics);
    return ok && err ? { tag: "result", ok, err } : null;
  }
  if (ref.args.length === 0 && records.has(ref.name)) {
    return { tag: "named", name: ref.name };
  }
  diagnostics.push({
    severity: "error",
    code: Codes.TYPE_UNKNOWN_TYPE,
    message: `unknown type '${ref.name}'`,
    span: ref.span,
    qid,
    received: ref.name,
  });
  return null;
}

function mismatch(
  expected: Type,
  received: Type,
  span: Span,
  qid: string,
  what: string,
): Diagnostic {
  return {
    severity: "error",
    code: Codes.TYPE_MISMATCH,
    message: `${what} has type ${typeStr(received)}, expected ${typeStr(expected)}`,
    span,
    qid,
    expected: typeStr(expected),
    received: typeStr(received),
    fixes: [
      {
        kind: "change_type",
        message: `change this type to ${typeStr(expected)}`,
      },
      {
        kind: "change_expected",
        message: `change the expected type to ${typeStr(received)}`,
      },
    ],
  };
}

function typeExpr(expr: Expr, ctx: CheckCtx, expected?: Type): Type {
  switch (expr.kind) {
    case "int":
      return TInt;
    case "bool":
      return TBool;
    case "str":
      return TStr;
    case "name": {
      if (expr.name === "None") {
        if (expected?.tag === "option") {
          return expected;
        }
        ctx.diagnostics.push({
          severity: "error",
          code: Codes.TYPE_MISMATCH,
          message: "cannot infer type of None",
          span: expr.span,
          qid: ctx.qid,
        });
        return TError;
      }
      const found = ctx.env.get(expr.name);
      if (!found) {
        ctx.diagnostics.push({
          severity: "error",
          code: Codes.TYPE_UNKNOWN,
          message: `unknown name '${expr.name}'`,
          span: expr.span,
          qid: ctx.qid,
        });
        return TError;
      }
      return found;
    }
    case "list": {
      const elemExpected = expected?.tag === "list" ? expected.elem : undefined;
      if (expr.elems.length === 0) {
        if (elemExpected) {
          return { tag: "list", elem: elemExpected };
        }
        ctx.diagnostics.push({
          severity: "error",
          code: Codes.TYPE_MISMATCH,
          message: "cannot infer type of []",
          span: expr.span,
          qid: ctx.qid,
        });
        return TError;
      }
      let elem: Type = TError;
      for (const item of expr.elems) {
        const got = typeExpr(item, ctx, elemExpected);
        if (got.tag === "error") {
          continue;
        }
        if (elem.tag === "error") {
          elem = got;
        } else if (!typeEq(elem, got)) {
          ctx.diagnostics.push(
            mismatch(elem, got, item.span, ctx.qid, "list element"),
          );
        }
      }
      return elem.tag === "error" ? TError : { tag: "list", elem };
    }
    case "binary": {
      const left = typeExpr(expr.left, ctx, TInt);
      const right = typeExpr(expr.right, ctx, TInt);
      if (left.tag === "error" || right.tag === "error") {
        return TError;
      }
      if (COMPARE.has(expr.op)) {
        if (left.tag !== "int" || right.tag !== "int") {
          ctx.diagnostics.push(
            mismatch(
              TInt,
              left.tag !== "int" ? left : right,
              expr.span,
              ctx.qid,
              `operator ${expr.op}`,
            ),
          );
          return TError;
        }
        return TBool;
      }
      if (left.tag !== "int" || right.tag !== "int") {
        ctx.diagnostics.push(
          mismatch(
            TInt,
            left.tag !== "int" ? left : right,
            expr.span,
            ctx.qid,
            `operator ${expr.op}`,
          ),
        );
        return TError;
      }
      return TInt;
    }
    case "field": {
      const objectType = typeExpr(expr.object, ctx);
      if (objectType.tag === "error") {
        return TError;
      }
      if (objectType.tag !== "named") {
        ctx.diagnostics.push({
          severity: "error",
          code: Codes.TYPE_UNKNOWN,
          message: `type '${typeStr(objectType)}' has no fields`,
          span: expr.span,
          qid: ctx.qid,
          received: expr.field,
        });
        return TError;
      }
      const rec = ctx.records.get(objectType.name);
      const fieldType = rec?.get(expr.field);
      if (!fieldType) {
        ctx.diagnostics.push({
          severity: "error",
          code: Codes.TYPE_UNKNOWN,
          message: `unknown field '${expr.field}' on ${objectType.name}`,
          span: expr.span,
          qid: ctx.qid,
        });
        return TError;
      }
      return fieldType;
    }
    case "index": {
      const objectType = typeExpr(expr.object, ctx);
      const indexType = typeExpr(expr.index, ctx, TInt);
      if (objectType.tag === "error") {
        return TError;
      }
      if (objectType.tag !== "list") {
        ctx.diagnostics.push(
          mismatch(
            { tag: "list", elem: TInt },
            objectType,
            expr.object.span,
            ctx.qid,
            "index target",
          ),
        );
        return TError;
      }
      if (indexType.tag !== "error" && indexType.tag !== "int") {
        ctx.diagnostics.push(
          mismatch(TInt, indexType, expr.index.span, ctx.qid, "index"),
        );
      }
      return { tag: "option", inner: objectType.elem };
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
        return TError;
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
        const fieldExpected = rec.get(init.name);
        if (!fieldExpected) {
          ctx.diagnostics.push({
            severity: "error",
            code: Codes.TYPE_UNKNOWN,
            message: `unknown field '${init.name}' on ${expr.name}`,
            span: init.span,
            qid: ctx.qid,
          });
          continue;
        }
        const got = typeExpr(init.value, ctx, fieldExpected);
        if (got.tag !== "error" && !typeEq(got, fieldExpected)) {
          ctx.diagnostics.push(
            mismatch(
              fieldExpected,
              got,
              init.span,
              ctx.qid,
              `field ${init.name}`,
            ),
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
      return { tag: "named", name: expr.name };
    }
    case "call": {
      if (expr.name === "Some") {
        return typeVariantCall(expr, ctx, expected, "option");
      }
      if (expr.name === "Ok") {
        return typeVariantCall(expr, ctx, expected, "ok");
      }
      if (expr.name === "Err") {
        return typeVariantCall(expr, ctx, expected, "err");
      }
      const sig = ctx.functions.get(expr.name);
      if (!sig) {
        ctx.diagnostics.push({
          severity: "error",
          code: Codes.TYPE_UNKNOWN,
          message: `unknown function '${expr.name}'`,
          span: expr.span,
          qid: ctx.qid,
        });
        return TError;
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
        const argExpected = sig.params[i];
        if (!arg || !argExpected) {
          continue;
        }
        const got = typeExpr(arg, ctx, argExpected);
        if (got.tag !== "error" && !typeEq(got, argExpected)) {
          ctx.diagnostics.push(
            mismatch(argExpected, got, arg.span, ctx.qid, `argument ${i + 1}`),
          );
        }
      }
      return sig.ret;
    }
    case "if": {
      const cond = typeExpr(expr.cond, ctx, TBool);
      if (cond.tag !== "error" && cond.tag !== "bool") {
        ctx.diagnostics.push(
          mismatch(TBool, cond, expr.cond.span, ctx.qid, "if condition"),
        );
      }
      const thenType = typeExpr(expr.thenBody, ctx, expected);
      const elseType = typeExpr(expr.elseBody, ctx, expected);
      if (thenType.tag === "error" || elseType.tag === "error") {
        return TError;
      }
      if (!typeEq(thenType, elseType)) {
        ctx.diagnostics.push(
          mismatch(
            thenType,
            elseType,
            expr.elseBody.span,
            ctx.qid,
            "if else branch",
          ),
        );
        return TError;
      }
      return thenType;
    }
    case "match":
      return typeMatch(expr, ctx, expected);
  }
}

function typeVariantCall(
  expr: Extract<Expr, { kind: "call" }>,
  ctx: CheckCtx,
  expected: Type | undefined,
  which: "option" | "ok" | "err",
): Type {
  if (expr.args.length !== 1 || !expr.args[0]) {
    ctx.diagnostics.push({
      severity: "error",
      code: Codes.TYPE_MISMATCH,
      message: `${expr.name} expects 1 argument`,
      span: expr.span,
      qid: ctx.qid,
      expected: "1",
      received: String(expr.args.length),
    });
    return TError;
  }
  if (which === "option") {
    const innerExpected =
      expected?.tag === "option" ? expected.inner : undefined;
    const inner = typeExpr(expr.args[0], ctx, innerExpected);
    if (inner.tag === "error") {
      return TError;
    }
    return { tag: "option", inner };
  }
  if (which === "ok") {
    const okExpected = expected?.tag === "result" ? expected.ok : undefined;
    const ok = typeExpr(expr.args[0], ctx, okExpected);
    if (ok.tag === "error") {
      return TError;
    }
    if (expected?.tag === "result") {
      return expected;
    }
    return { tag: "result", ok, err: TError };
  }
  const errExpected = expected?.tag === "result" ? expected.err : undefined;
  const err = typeExpr(expr.args[0], ctx, errExpected);
  if (err.tag === "error") {
    return TError;
  }
  if (expected?.tag === "result") {
    return expected;
  }
  return { tag: "result", ok: TError, err };
}

function typeMatch(
  expr: Extract<Expr, { kind: "match" }>,
  ctx: CheckCtx,
  expected?: Type,
): Type {
  const scrut = typeExpr(expr.scrutinee, ctx);
  if (expr.arms.length === 0) {
    ctx.diagnostics.push({
      severity: "error",
      code: Codes.TYPE_MISMATCH,
      message: "match needs at least one arm",
      span: expr.span,
      qid: ctx.qid,
    });
    return TError;
  }
  if (scrut.tag === "int") {
    return typeIntMatch(expr, ctx, expected);
  }
  if (scrut.tag === "option") {
    return typeVariantMatch(expr, ctx, expected, "option", scrut.inner);
  }
  if (scrut.tag === "result") {
    return typeVariantMatch(expr, ctx, expected, "result", scrut);
  }
  if (scrut.tag !== "error") {
    ctx.diagnostics.push({
      severity: "error",
      code: Codes.TYPE_MISMATCH,
      message: `cannot match on ${typeStr(scrut)}`,
      span: expr.scrutinee.span,
      qid: ctx.qid,
      received: typeStr(scrut),
    });
  }
  return TError;
}

function typeIntMatch(
  expr: Extract<Expr, { kind: "match" }>,
  ctx: CheckCtx,
  expected?: Type,
): Type {
  let hasWildcard = false;
  const ints = new Set<number>();
  let armType: Type | null = null;
  for (const arm of expr.arms) {
    if (arm.pattern.kind === "wildcard") {
      hasWildcard = true;
    } else if (arm.pattern.kind === "int") {
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
    } else {
      ctx.diagnostics.push(
        mismatch(TInt, TError, arm.pattern.span, ctx.qid, "match pattern"),
      );
    }
    const bodyType = typeExpr(arm.body, ctx, expected);
    if (bodyType.tag === "error") {
      continue;
    }
    if (armType === null) {
      armType = bodyType;
    } else if (!typeEq(armType, bodyType)) {
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
  return armType ?? TError;
}

function typeVariantMatch(
  expr: Extract<Expr, { kind: "match" }>,
  ctx: CheckCtx,
  expected: Type | undefined,
  which: "option" | "result",
  payload: Type | Extract<Type, { tag: "result" }>,
): Type {
  let hasWildcard = false;
  const seen = new Set<string>();
  let armType: Type | null = null;
  for (const arm of expr.arms) {
    const armEnv = new Map(ctx.env);
    if (arm.pattern.kind === "wildcard") {
      hasWildcard = true;
    } else if (arm.pattern.kind === "variant") {
      seen.add(arm.pattern.name);
      if (which === "option") {
        if (arm.pattern.name === "Some" && arm.pattern.bind) {
          armEnv.set(arm.pattern.bind, payload as Type);
        } else if (arm.pattern.name !== "Some" && arm.pattern.name !== "None") {
          ctx.diagnostics.push({
            severity: "error",
            code: Codes.TYPE_MISMATCH,
            message: `unexpected pattern ${arm.pattern.name} for Option`,
            span: arm.pattern.span,
            qid: ctx.qid,
          });
        }
      } else {
        const resultType = payload as Extract<Type, { tag: "result" }>;
        if (arm.pattern.name === "Ok" && arm.pattern.bind) {
          armEnv.set(arm.pattern.bind, resultType.ok);
        } else if (arm.pattern.name === "Err" && arm.pattern.bind) {
          armEnv.set(arm.pattern.bind, resultType.err);
        } else if (arm.pattern.name !== "Ok" && arm.pattern.name !== "Err") {
          ctx.diagnostics.push({
            severity: "error",
            code: Codes.TYPE_MISMATCH,
            message: `unexpected pattern ${arm.pattern.name} for Result`,
            span: arm.pattern.span,
            qid: ctx.qid,
          });
        }
      }
    } else {
      ctx.diagnostics.push({
        severity: "error",
        code: Codes.TYPE_MISMATCH,
        message: "variant match cannot use int patterns",
        span: arm.pattern.span,
        qid: ctx.qid,
      });
    }
    const bodyType = typeExpr(arm.body, { ...ctx, env: armEnv }, expected);
    if (bodyType.tag === "error") {
      continue;
    }
    if (armType === null) {
      armType = bodyType;
    } else if (!typeEq(armType, bodyType)) {
      ctx.diagnostics.push(
        mismatch(armType, bodyType, arm.body.span, ctx.qid, "match arm"),
      );
    }
  }
  const required = which === "option" ? ["Some", "None"] : ["Ok", "Err"];
  const covered = required.every((name) => seen.has(name));
  if (!hasWildcard && !covered) {
    ctx.diagnostics.push({
      severity: "error",
      code: Codes.TYPE_MISMATCH,
      message: `${which} match must cover ${required.join(" and ")} or include _`,
      span: expr.span,
      qid: ctx.qid,
    });
  }
  return armType ?? TError;
}
