import {
  emptyLock,
  getNode,
  indexModule,
  queryGraph,
  upsertNid,
} from "@forgeir/ir";
import { parse } from "@forgeir/syntax";
import { describe, expect, it } from "vitest";

const ADD = `module examples.add

fn add(a: int, b: int) -> int {
  a + b
}
`;

function graphOf(src: string, file: string, lock = emptyLock()) {
  const parsed = parse(src, file);
  if (!parsed.module) {
    throw new Error(parsed.diagnostics.map((d) => d.message).join("\n"));
  }
  return indexModule(src, parsed.module, lock);
}

describe("IR index and lockfile", () => {
  it("reuses symbol nids from the lockfile", () => {
    const first = graphOf(ADD, "add.fir");
    const add = first.graph.byQid.get("examples.add.add");
    expect(add?.kind).toBe("fn");
    expect(first.lock.ids["examples.add.add"]).toBe(add?.nid);

    const lock = {
      schema: "forge.lock/v1" as const,
      ids: { ...first.lock.ids },
    };
    const renamed = ADD.replace("fn add", "fn sum");
    const second = graphOf(renamed, "add.fir", lock);
    expect(second.graph.byQid.get("examples.add.sum")?.nid).not.toBe(add?.nid);
    expect(second.lock.ids["examples.add.add"]).toBe(add?.nid);
  });

  it("keeps a stored nid when the qid is unchanged", () => {
    const lock = emptyLock();
    const nid = upsertNid(lock, "examples.add.add");
    const again = graphOf(ADD, "add.fir", lock);
    expect(again.graph.byQid.get("examples.add.add")?.nid).toBe(nid);
  });

  it("queries symbols without dumping source", () => {
    const { graph } = graphOf(ADD, "add.fir");
    const result = queryGraph(graph, {
      kind: "symbol",
      selector: "examples.add",
    });
    expect(result.nodes.some((n) => n.qid === "examples.add.add")).toBe(true);
    expect(result.nodes.every((n) => !("snippet" in n))).toBe(true);
    expect(result.nodes.every((n) => n.kind !== "expr")).toBe(true);
  });

  it("gets a function body snippet by qid", () => {
    const { graph } = graphOf(ADD, "add.fir");
    const got = getNode(graph, "examples.add.add@body", "body");
    expect(got?.node.kind).toBe("expr");
    expect(got?.node.exprKind).toBe("binary");
    expect(got?.node.snippet).toBe("a + b");
  });
});
