import {
  type Hid,
  hidOf,
  type Nid,
  nidFrom,
  type Qid,
  qidJoin,
  type Span,
} from "@forgeir/core";
import type { Expr, Module } from "@forgeir/syntax";
import { type Lockfile, upsertNid } from "./lock.ts";

export type IrKind =
  | "module"
  | "record"
  | "field"
  | "fn"
  | "extern"
  | "param"
  | "expr";

export type IrNode = {
  nid: Nid;
  qid: Qid;
  hid: Hid;
  kind: IrKind;
  exprKind?: string;
  span: Span;
  children: Nid[];
};

export type Graph = {
  file: string;
  source: string;
  nodes: IrNode[];
  byQid: Map<Qid, IrNode>;
  byNid: Map<Nid, IrNode>;
};

export function indexModule(
  source: string,
  mod: Module,
  lock: Lockfile,
): { graph: Graph; lock: Lockfile } {
  const next = { schema: lock.schema, ids: { ...lock.ids } };
  const nodes: IrNode[] = [];

  const sliceHid = (span: Span): Hid =>
    hidOf(source.slice(span.start, span.end));

  const push = (node: IrNode): IrNode => {
    nodes.push(node);
    return node;
  };

  const exprNid = (qid: Qid): Nid => nidFrom(qid);

  const walkExpr = (expr: Expr, qid: Qid): Nid => {
    const kids: Nid[] = [];
    switch (expr.kind) {
      case "int":
      case "bool":
      case "str":
      case "name":
        break;
      case "list":
        expr.elems.forEach((el, i) => {
          kids.push(walkExpr(el, `${qid}.elems.${i}`));
        });
        break;
      case "binary":
        kids.push(walkExpr(expr.left, `${qid}.left`));
        kids.push(walkExpr(expr.right, `${qid}.right`));
        break;
      case "field":
        kids.push(walkExpr(expr.object, `${qid}.object`));
        break;
      case "index":
        kids.push(walkExpr(expr.object, `${qid}.object`));
        kids.push(walkExpr(expr.index, `${qid}.index`));
        break;
      case "construct":
        expr.fields.forEach((f, i) => {
          kids.push(walkExpr(f.value, `${qid}.fields.${i}`));
        });
        break;
      case "call":
        expr.args.forEach((arg, i) => {
          kids.push(walkExpr(arg, `${qid}.args.${i}`));
        });
        break;
      case "if":
        kids.push(walkExpr(expr.cond, `${qid}.cond`));
        kids.push(walkExpr(expr.thenBody, `${qid}.thenBody`));
        kids.push(walkExpr(expr.elseBody, `${qid}.elseBody`));
        break;
      case "match":
        kids.push(walkExpr(expr.scrutinee, `${qid}.scrutinee`));
        expr.arms.forEach((arm, i) => {
          kids.push(walkExpr(arm.body, `${qid}.arms.${i}`));
        });
        break;
    }
    const nid = exprNid(qid);
    push({
      nid,
      qid,
      hid: sliceHid(expr.span),
      kind: "expr",
      exprKind: expr.kind,
      span: expr.span,
      children: kids,
    });
    return nid;
  };

  const childNids: Nid[] = [];
  const moduleQid = mod.name;
  const moduleNid = upsertNid(next, moduleQid);

  for (const rec of mod.records) {
    const recQid = qidJoin(mod.name, rec.name);
    const recNid = upsertNid(next, recQid);
    const fieldNids: Nid[] = [];
    for (const field of rec.fields) {
      const fieldQid = qidJoin(mod.name, rec.name, field.name);
      const fieldNid = upsertNid(next, fieldQid);
      push({
        nid: fieldNid,
        qid: fieldQid,
        hid: sliceHid(field.span),
        kind: "field",
        span: field.span,
        children: [],
      });
      fieldNids.push(fieldNid);
    }
    push({
      nid: recNid,
      qid: recQid,
      hid: sliceHid(rec.span),
      kind: "record",
      span: rec.span,
      children: fieldNids,
    });
    childNids.push(recNid);
  }

  for (const ext of mod.externs) {
    const extQid = qidJoin(mod.name, ext.name);
    const extNid = upsertNid(next, extQid);
    const extKids: Nid[] = [];
    for (const param of ext.params) {
      const paramQid = `${extQid}/param/${param.name}`;
      const paramNid = upsertNid(next, paramQid);
      push({
        nid: paramNid,
        qid: paramQid,
        hid: sliceHid(param.span),
        kind: "param",
        span: param.span,
        children: [],
      });
      extKids.push(paramNid);
    }
    push({
      nid: extNid,
      qid: extQid,
      hid: sliceHid(ext.span),
      kind: "extern",
      span: ext.span,
      children: extKids,
    });
    childNids.push(extNid);
  }

  for (const fn of mod.functions) {
    const fnQid = qidJoin(mod.name, fn.name);
    const fnNid = upsertNid(next, fnQid);
    const fnKids: Nid[] = [];
    for (const param of fn.params) {
      const paramQid = `${fnQid}/param/${param.name}`;
      const paramNid = upsertNid(next, paramQid);
      push({
        nid: paramNid,
        qid: paramQid,
        hid: sliceHid(param.span),
        kind: "param",
        span: param.span,
        children: [],
      });
      fnKids.push(paramNid);
    }
    fnKids.push(walkExpr(fn.body, `${fnQid}@body`));
    push({
      nid: fnNid,
      qid: fnQid,
      hid: sliceHid(fn.span),
      kind: "fn",
      span: fn.span,
      children: fnKids,
    });
    childNids.push(fnNid);
  }

  push({
    nid: moduleNid,
    qid: moduleQid,
    hid: sliceHid(mod.span),
    kind: "module",
    span: mod.span,
    children: childNids,
  });

  const byQid = new Map<Qid, IrNode>();
  const byNid = new Map<Nid, IrNode>();
  for (const node of nodes) {
    byQid.set(node.qid, node);
    byNid.set(node.nid, node);
  }
  return {
    graph: { file: mod.span.file, source, nodes, byQid, byNid },
    lock: next,
  };
}

export function isSymbol(node: IrNode): boolean {
  return node.kind !== "expr";
}

export function matchesSelector(node: IrNode, selector: string): boolean {
  if (node.nid === selector || node.qid === selector) {
    return true;
  }
  return (
    node.qid.startsWith(`${selector}.`) ||
    node.qid.startsWith(`${selector}@`) ||
    node.qid.startsWith(`${selector}/`)
  );
}

export type QueryOpts = {
  kind?: "symbol" | "expr" | "all";
  selector?: string;
  limit?: number;
  cursor?: number;
};

export type CompactNode = {
  nid: Nid;
  qid: Qid;
  hid: Hid;
  kind: IrKind;
  exprKind?: string;
};

export function compactNode(node: IrNode): CompactNode {
  const out: CompactNode = {
    nid: node.nid,
    qid: node.qid,
    hid: node.hid,
    kind: node.kind,
  };
  if (node.exprKind) {
    out.exprKind = node.exprKind;
  }
  return out;
}

export function queryGraph(
  graph: Graph,
  opts: QueryOpts = {},
): { nodes: CompactNode[]; cursor: number | null; truncated: boolean } {
  const kind = opts.kind ?? "symbol";
  const selector = opts.selector ?? "";
  const limit = opts.limit ?? 20;
  const cursor = opts.cursor ?? 0;
  const matched = graph.nodes.filter((node) => {
    if (kind === "symbol" && !isSymbol(node)) {
      return false;
    }
    if (kind === "expr" && node.kind !== "expr") {
      return false;
    }
    if (selector && !matchesSelector(node, selector)) {
      return false;
    }
    return true;
  });
  const slice = matched.slice(cursor, cursor + limit);
  const next = cursor + slice.length;
  return {
    nodes: slice.map(compactNode),
    cursor: next < matched.length ? next : null,
    truncated: matched.length > next,
  };
}

export type GetDetail = "compact" | "sig" | "body";

export function getNode(
  graph: Graph,
  selector: string,
  detail: GetDetail,
): {
  node: CompactNode & { snippet?: string; children?: CompactNode[] };
} | null {
  const found =
    graph.byNid.get(selector) ??
    graph.byQid.get(selector) ??
    graph.nodes.find((n) => matchesSelector(n, selector) && n.qid === selector);
  if (!found) {
    return null;
  }
  const node: CompactNode & { snippet?: string; children?: CompactNode[] } =
    compactNode(found);
  if (detail === "sig" || detail === "body") {
    node.children = found.children.flatMap((nid) => {
      const child = graph.byNid.get(nid);
      return child ? [compactNode(child)] : [];
    });
  }
  if (detail === "body") {
    const snippet = graph.source.slice(found.span.start, found.span.end);
    node.snippet =
      snippet.length > 8192 ? `${snippet.slice(0, 8192)}…` : snippet;
  }
  return { node };
}

export function findNode(graph: Graph, selector: string): IrNode | undefined {
  return graph.byNid.get(selector) ?? graph.byQid.get(selector);
}

export function exprSpan(graph: Graph, node: IrNode): Span {
  if (node.kind === "fn") {
    const body = node.children
      .map((nid) => graph.byNid.get(nid))
      .find((child) => child?.kind === "expr" && child.qid.endsWith("@body"));
    if (body) {
      return body.span;
    }
  }
  return node.span;
}
