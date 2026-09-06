import { emptyLock, indexModule, retargetQid } from "@forgeir/ir";
import { previewPatch } from "@forgeir/patch";
import { parse } from "@forgeir/syntax";
import { describe, expect, it } from "vitest";

const SRC = `module examples.calc

fn add(a: int, b: int) -> int {
  a + b
}

fn twice(x: int) -> int {
  add(x, x)
}
`;

describe("rename patch", () => {
  it("previews a function rename and updates call sites", () => {
    const result = previewPatch(SRC, "calc.fir", emptyLock(), {
      schema: "forge.patch/v1",
      ops: [{ op: "rename", qid: "examples.calc.add", name: "plus" }],
    });
    expect(result.ok).toBe(true);
    expect(result.wrote).toBe(false);
    expect(result.source).toContain("fn plus(");
    expect(result.source).toContain("plus(x, x)");
    expect(result.source).not.toContain("fn add(");
    expect(result.hunks.join("")).toContain("-add");
    expect(result.hunks.join("")).toContain("+plus");
  });

  it("keeps the symbol nid when retargeting the lockfile", () => {
    const parsed = parse(SRC, "calc.fir");
    if (!parsed.module) {
      throw new Error("parse");
    }
    const indexed = indexModule(SRC, parsed.module, emptyLock());
    const oldNid = indexed.lock.ids["examples.calc.add"];
    const oldParam = indexed.lock.ids["examples.calc.add/param/a"];
    const result = previewPatch(SRC, "calc.fir", indexed.lock, {
      schema: "forge.patch/v1",
      ops: [{ op: "rename", qid: "examples.calc.add", name: "plus" }],
    });
    expect(result.ok).toBe(true);
    expect(result.lock.ids["examples.calc.plus"]).toBe(oldNid);
    expect(result.lock.ids["examples.calc.plus/param/a"]).toBe(oldParam);
    expect(result.lock.ids["examples.calc.add"]).toBeUndefined();
    const moved = retargetQid(
      indexed.lock,
      "examples.calc.add",
      "examples.calc.plus",
    );
    expect(moved.ids["examples.calc.plus"]).toBe(oldNid);
  });

  it("refuses a colliding or reserved name", () => {
    const clash = previewPatch(SRC, "calc.fir", emptyLock(), {
      schema: "forge.patch/v1",
      ops: [{ op: "rename", qid: "examples.calc.add", name: "twice" }],
    });
    expect(clash.diagnostics[0]?.code).toBe("PATCH-001");
    const reserved = previewPatch(SRC, "calc.fir", emptyLock(), {
      schema: "forge.patch/v1",
      ops: [{ op: "rename", qid: "examples.calc.add", name: "fn" }],
    });
    expect(reserved.diagnostics[0]?.code).toBe("PATCH-001");
  });

  it("renames a record and its constructs", () => {
    const src = `module examples.box
record Bounds { lo: int }
fn origin() -> Bounds {
  Bounds { lo: 0 }
}
`;
    const result = previewPatch(src, "box.fir", emptyLock(), {
      schema: "forge.patch/v1",
      ops: [{ op: "rename", qid: "examples.box.Bounds", name: "Limit" }],
    });
    expect(result.ok).toBe(true);
    expect(result.source).toContain("record Limit");
    expect(result.source).toContain("-> Limit");
    expect(result.source).toContain("Limit { lo: 0 }");
    expect(result.source).not.toContain("Bounds");
  });
});
