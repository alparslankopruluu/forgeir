import { emptyLock } from "@forgeir/ir";
import { previewPatch } from "@forgeir/patch";
import { describe, expect, it } from "vitest";

const ADD = `module examples.add

fn add(a: int, b: int) -> int {
  a + b
}
`;

describe("semantic patch", () => {
  it("previews replace_expr without writing", () => {
    const result = previewPatch(ADD, "add.fir", emptyLock(), {
      schema: "forge.patch/v1",
      ops: [
        { op: "replace_expr", qid: "examples.add.add@body", expr: "a - b" },
      ],
    });
    expect(result.ok).toBe(true);
    expect(result.wrote).toBe(false);
    expect(result.hunks.join("")).toContain("-a + b");
    expect(result.hunks.join("")).toContain("+a - b");
    expect(result.source).toContain("a - b");
    expect(result.source).not.toContain("a + b");
    expect(result.diagnostics).toEqual([]);
  });

  it("reports a type error after a bad replacement", () => {
    const result = previewPatch(ADD, "add.fir", emptyLock(), {
      schema: "forge.patch/v1",
      ops: [{ op: "replace_expr", qid: "examples.add.add", expr: "true" }],
    });
    expect(result.ok).toBe(false);
    expect(result.diagnostics.some((d) => d.code === "TYPE-002")).toBe(true);
  });

  it("rejects an unknown selector", () => {
    const result = previewPatch(ADD, "add.fir", emptyLock(), {
      schema: "forge.patch/v1",
      ops: [{ op: "replace_expr", qid: "nope", expr: "1" }],
    });
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.code).toBe("PATCH-001");
  });
});
