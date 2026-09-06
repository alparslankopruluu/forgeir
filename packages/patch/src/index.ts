import { type Diagnostic, type DiagnosticReport, report } from "@forgeir/diag";
import {
  exprSpan,
  findNode,
  type Graph,
  indexModule,
  type Lockfile,
} from "@forgeir/ir";
import { analyze } from "@forgeir/sema";
import { parse } from "@forgeir/syntax";

export type PatchOp = {
  op: "replace_expr";
  qid?: string;
  nid?: string;
  expr: string;
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
  diagnostics: Diagnostic[];
  report: DiagnosticReport;
};

function selectorOf(op: PatchOp): string | undefined {
  return op.nid ?? op.qid;
}

function applyOps(
  source: string,
  graph: Graph,
  ops: PatchOp[],
): {
  source: string;
  hunks: string[];
  error?: string;
} {
  const edits: { start: number; end: number; expr: string; qid: string }[] = [];
  for (const op of ops) {
    if (op.op !== "replace_expr") {
      return { source, hunks: [], error: `unsupported op ${op.op}` };
    }
    const selector = selectorOf(op);
    if (!selector) {
      return { source, hunks: [], error: "replace_expr needs qid or nid" };
    }
    const node = findNode(graph, selector);
    if (!node) {
      return { source, hunks: [], error: `unknown node ${selector}` };
    }
    if (node.kind !== "expr" && node.kind !== "fn") {
      return {
        source,
        hunks: [],
        error: `replace_expr target ${selector} is ${node.kind}, not an expression`,
      };
    }
    const span = exprSpan(graph, node);
    edits.push({
      start: span.start,
      end: span.end,
      expr: op.expr,
      qid: node.qid,
    });
  }
  edits.sort((a, b) => b.start - a.start);
  let next = source;
  const hunks: string[] = [];
  for (const edit of edits) {
    const before = source.slice(edit.start, edit.end);
    hunks.push(
      `--- a/${graph.file}\n+++ b/${graph.file}\n@@ ${edit.qid} @@\n-${before}\n+${edit.expr}\n`,
    );
    next = next.slice(0, edit.start) + edit.expr + next.slice(edit.end);
  }
  hunks.reverse();
  return { source: next, hunks };
}

export function previewPatch(
  source: string,
  file: string,
  lock: Lockfile,
  doc: PatchDoc,
): PatchResult {
  const parsed = parse(source, file);
  if (!parsed.module) {
    return {
      schema: "forge.patch/v1",
      mode: "preview",
      ok: false,
      wrote: false,
      hunks: [],
      source,
      diagnostics: parsed.diagnostics,
      report: report(parsed.diagnostics),
    };
  }
  const { graph } = indexModule(source, parsed.module, lock);
  const applied = applyOps(source, graph, doc.ops);
  if (applied.error) {
    const diagnostics: Diagnostic[] = [
      {
        severity: "error",
        code: "PATCH-001",
        message: applied.error,
      },
    ];
    return {
      schema: "forge.patch/v1",
      mode: "preview",
      ok: false,
      wrote: false,
      hunks: [],
      source,
      diagnostics,
      report: report(diagnostics),
    };
  }
  const checked = analyze(applied.source, file);
  return {
    schema: "forge.patch/v1",
    mode: "preview",
    ok: checked.diagnostics.length === 0,
    wrote: false,
    hunks: applied.hunks,
    source: applied.source,
    diagnostics: checked.diagnostics,
    report: report(checked.diagnostics),
  };
}
