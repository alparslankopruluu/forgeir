import { analyze } from "@forgeir/sema";
import { describe, expect, it } from "vitest";

describe("M0 checker", () => {
  it("accepts add with int parameters", () => {
    const result = analyze(
      `module examples.add
fn add(a: int, b: int) -> int {
  a + b
}
`,
      "add.fir",
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.module?.functions[0]?.qid).toBe("examples.add.add");
  });

  it("rejects unknown names with TYPE-001", () => {
    const result = analyze(
      `module m
fn f(a: int) -> int {
  a + c
}
`,
      "unknown.fir",
    );
    expect(result.diagnostics.some((d) => d.code === "TYPE-001")).toBe(true);
  });

  it("rejects non-int types with TYPE-002", () => {
    const result = analyze(
      `module m
fn f(a: str) -> int {
  a
}
`,
      "type.fir",
    );
    const diag = result.diagnostics.find((d) => d.code === "TYPE-002");
    expect(diag).toBeDefined();
    expect(diag?.expected).toBe("int");
    expect(diag?.received).toBe("str");
  });
});
