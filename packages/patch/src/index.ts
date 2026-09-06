import { type Diagnostic, type DiagnosticReport, report } from "@forgeir/diag";
import {
  exprSpan,
  findNode,
  type IrNode,
  indexModule,
  type Lockfile,
  retargetQid,
} from "@forgeir/ir";
import { analyze } from "@forgeir/sema";
import { type Expr, type Module, parse, type TypeRef } from "@forgeir/syntax";

export type PatchOp =
  | {
      op: "replace_expr";
      qid?: string;
      nid?: string;
      expr: string;
    }
  | {
      op: "rename";
      qid?: string;
      nid?: string;
      name: string;
    };

export type PatchDoc = {
  schema: "forge.patch/v1";
  ops: PatchOp[];
};

export type PatchResult = {
  schema: "forge.patch/v1";
  mode: "preview" | "apply";
  ok: boolean;
  wrote: boolean;
  hunks: string[];
  source: string;
  lock: Lockfile;
  diagnostics: Diagnostic[];
  report: DiagnosticReport;
};

const RESERVED = new Set([
  "module",
  "fn",
  "record",
  "if",
  "else",
  "match",
  "extern",
  "use",
  "true",
  "false",
  "int",
  "bool",
  "str",
  "list",
  "Option",
  "Result",
  "Some",
  "None",
  "Ok",
  "Err",
]);

function selectorOf(op: PatchOp): string | undefined {
  return op.nid ?? op.qid;
}

function identSpan(
  span: { file: string; start: number; end: number },
  name: string,
): { file: string; start: number; end: number } {
  return { file: span.file, start: span.start, end: span.start + name.length };
}

function walkType(t: TypeRef, visit: (t: TypeRef) => void): void {
  visit(t);
  for (const arg of t.args) {
    walkType(arg, visit);
  }
}

function walkExpr(expr: Expr, visit: (e: Expr) => void): void {
  visit(expr);
  switch (expr.kind) {
    case "list":
      for (const el of expr.elems) {
        walkExpr(el, visit);
      }
      break;
    case "binary":
      walkExpr(expr.left, visit);
      walkExpr(expr.right, visit);
      break;
    case "field":
      walkExpr(expr.object, visit);
      break;
    case "index":
      walkExpr(expr.object, visit);
      walkExpr(expr.index, visit);
      break;
    case "construct":
      for (const f of expr.fields) {
        walkExpr(f.value, visit);
      }
      break;
    case "call":
      for (const arg of expr.args) {
        walkExpr(arg, visit);
      }
      break;
    case "if":
      walkExpr(expr.cond, visit);
      walkExpr(expr.thenBody, visit);
      walkExpr(expr.elseBody, visit);
      break;
    case "match":
      walkExpr(expr.scrutinee, visit);
      for (const arm of expr.arms) {
        walkExpr(arm.body, visit);
      }
      break;
    default:
      break;
  }
}

function occupiedNames(mod: Module): Set<string> {
  const names = new Set<string>(RESERVED);
  for (const rec of mod.records) {
    names.add(rec.name);
  }
  for (const fn of mod.functions) {
    names.add(fn.name);
  }
  for (const ext of mod.externs) {
    names.add(ext.name);
  }
  return names;
}

function qidOf(modName: string, name: string): string {
  return `${modName}.${name}`;
}

function renameSpans(
  mod: Module,
  node: IrNode,
): { spans: { start: number; end: number }[]; error?: string } {
  if (node.kind === "fn") {
    const decl = mod.functions.find(
      (f) => qidOf(mod.name, f.name) === node.qid,
    );
    if (!decl) {
      return { spans: [], error: `unknown fn ${node.qid}` };
    }
    const spans = [{ start: decl.nameSpan.start, end: decl.nameSpan.end }];
    for (const fn of mod.functions) {
      walkExpr(fn.body, (e) => {
        if (e.kind === "call" && e.name === decl.name) {
          const id = identSpan(e.span, decl.name);
          spans.push({ start: id.start, end: id.end });
        }
      });
    }
    return { spans };
  }
  if (node.kind === "extern") {
    const decl = mod.externs.find((e) => qidOf(mod.name, e.name) === node.qid);
    if (!decl) {
      return { spans: [], error: `unknown extern ${node.qid}` };
    }
    const spans = [{ start: decl.nameSpan.start, end: decl.nameSpan.end }];
    for (const fn of mod.functions) {
      walkExpr(fn.body, (e) => {
        if (e.kind === "call" && e.name === decl.name) {
          const id = identSpan(e.span, decl.name);
          spans.push({ start: id.start, end: id.end });
        }
      });
    }
    return { spans };
  }
  if (node.kind === "record") {
    const decl = mod.records.find((r) => qidOf(mod.name, r.name) === node.qid);
    if (!decl) {
      return { spans: [], error: `unknown record ${node.qid}` };
    }
    const spans = [{ start: decl.nameSpan.start, end: decl.nameSpan.end }];
    const visitType = (t: TypeRef) => {
      if (t.name === decl.name) {
        const id = identSpan(t.span, decl.name);
        spans.push({ start: id.start, end: id.end });
      }
    };
    for (const rec of mod.records) {
      for (const field of rec.fields) {
        walkType(field.type, visitType);
      }
    }
    for (const fn of [...mod.functions, ...mod.externs]) {
      for (const p of fn.params) {
        walkType(p.type, visitType);
      }
      walkType(fn.returnType, visitType);
      if (fn.kind === "fn") {
        walkExpr(fn.body, (e) => {
          if (e.kind === "construct" && e.name === decl.name) {
            const id = identSpan(e.span, decl.name);
            spans.push({ start: id.start, end: id.end });
          }
        });
      }
    }
    return { spans };
  }
  return {
    spans: [],
    error: `rename target ${node.qid} is ${node.kind}, not fn, extern, or record`,
  };
}

function dedupeSpans(
  spans: { start: number; end: number }[],
): { start: number; end: number }[] {
  const seen = new Set<string>();
  const out: { start: number; end: number }[] = [];
  for (const span of spans) {
    const key = `${span.start}:${span.end}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(span);
  }
  return out;
}

function splice(
  source: string,
  file: string,
  edits: { start: number; end: number; text: string; qid: string }[],
): { source: string; hunks: string[] } {
  const ordered = [...edits].sort((a, b) => b.start - a.start);
  let next = source;
  const hunks: string[] = [];
  for (const edit of ordered) {
    const before = source.slice(edit.start, edit.end);
    hunks.push(
      `--- a/${file}\n+++ b/${file}\n@@ ${edit.qid} @@\n-${before}\n+${edit.text}\n`,
    );
    next = next.slice(0, edit.start) + edit.text + next.slice(edit.end);
  }
  hunks.reverse();
  return { source: next, hunks };
}

function patchError(
  message: string,
  lock: Lockfile,
  source: string,
): PatchResult {
  const diagnostics: Diagnostic[] = [
    { severity: "error", code: "PATCH-001", message },
  ];
  return {
    schema: "forge.patch/v1",
    mode: "preview",
    ok: false,
    wrote: false,
    hunks: [],
    source,
    lock,
    diagnostics,
    report: report(diagnostics),
  };
}

export function previewPatch(
  source: string,
  file: string,
  lock: Lockfile,
  doc: PatchDoc,
): PatchResult {
  let current = source;
  let currentLock: Lockfile = { schema: lock.schema, ids: { ...lock.ids } };
  const hunks: string[] = [];

  for (const op of doc.ops) {
    const parsed = parse(current, file);
    if (!parsed.module) {
      return {
        schema: "forge.patch/v1",
        mode: "preview",
        ok: false,
        wrote: false,
        hunks: [],
        source,
        lock: currentLock,
        diagnostics: parsed.diagnostics,
        report: report(parsed.diagnostics),
      };
    }
    const { graph } = indexModule(current, parsed.module, currentLock);
    const selector = selectorOf(op);
    if (!selector) {
      return patchError(`${op.op} needs qid or nid`, currentLock, source);
    }
    const node = findNode(graph, selector);
    if (!node) {
      return patchError(`unknown node ${selector}`, currentLock, source);
    }

    if (op.op === "replace_expr") {
      if (node.kind !== "expr" && node.kind !== "fn") {
        return patchError(
          `replace_expr target ${selector} is ${node.kind}, not an expression`,
          currentLock,
          source,
        );
      }
      const span = exprSpan(graph, node);
      const applied = splice(current, graph.file, [
        { start: span.start, end: span.end, text: op.expr, qid: node.qid },
      ]);
      current = applied.source;
      hunks.push(...applied.hunks);
      continue;
    }

    if (op.op !== "rename") {
      return patchError(
        `unsupported op ${(op as PatchOp).op}`,
        currentLock,
        source,
      );
    }
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(op.name)) {
      return patchError(`invalid name '${op.name}'`, currentLock, source);
    }
    if (RESERVED.has(op.name)) {
      return patchError(`name '${op.name}' is reserved`, currentLock, source);
    }
    const names = occupiedNames(parsed.module);
    const oldName = node.qid.split(".").pop() ?? "";
    if (op.name !== oldName && names.has(op.name)) {
      return patchError(
        `name '${op.name}' is already used`,
        currentLock,
        source,
      );
    }
    const collected = renameSpans(parsed.module, node);
    if (collected.error) {
      return patchError(collected.error, currentLock, source);
    }
    const spans = dedupeSpans(collected.spans);
    const applied = splice(
      current,
      graph.file,
      spans.map((span) => ({
        start: span.start,
        end: span.end,
        text: op.name,
        qid: node.qid,
      })),
    );
    current = applied.source;
    hunks.push(...applied.hunks);
    const parent = node.qid.includes(".")
      ? node.qid.slice(0, node.qid.lastIndexOf("."))
      : "";
    const toQid = parent ? `${parent}.${op.name}` : op.name;
    currentLock = retargetQid(currentLock, node.qid, toQid);
  }

  const checked = analyze(current, file);
  return {
    schema: "forge.patch/v1",
    mode: "preview",
    ok: checked.diagnostics.length === 0,
    wrote: false,
    hunks,
    source: current,
    lock: currentLock,
    diagnostics: checked.diagnostics,
    report: report(checked.diagnostics),
  };
}
