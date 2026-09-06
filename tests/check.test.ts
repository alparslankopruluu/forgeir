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

  it("rejects unknown type names with TYPE-003", () => {
    const result = analyze(
      `module m
fn f(a: Widget) -> int {
  a
}
`,
      "type.fir",
    );
    const diag = result.diagnostics.find((d) => d.code === "TYPE-003");
    expect(diag).toBeDefined();
    expect(diag?.received).toBe("Widget");
  });

  it("rejects bool vs int with TYPE-002 and repair fixes", () => {
    const result = analyze(
      `module m
fn f(a: bool) -> int {
  a
}
`,
      "mismatch.fir",
    );
    const diag = result.diagnostics.find((d) => d.code === "TYPE-002");
    expect(diag).toBeDefined();
    expect(diag?.expected).toBe("int");
    expect(diag?.received).toBe("bool");
    expect(diag?.fixes?.length).toBeGreaterThan(0);
    expect(diag?.fixes?.some((f) => f.kind === "change_type")).toBe(true);
  });

  it("accepts records, field access, and calls", () => {
    const result = analyze(
      `module examples.clamp

record Bounds {
  lo: int
  hi: int
}

fn clamp(x: int, b: Bounds) -> int {
  if x < b.lo {
    b.lo
  } else {
    if x > b.hi {
      b.hi
    } else {
      x
    }
  }
}

fn clamp10(x: int) -> int {
  clamp(x, Bounds { lo: 0, hi: 10 })
}
`,
      "clamp.fir",
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.module?.functions.map((f) => f.qid)).toEqual([
      "examples.clamp.clamp",
      "examples.clamp.clamp10",
    ]);
  });

  it("rejects unknown record fields", () => {
    const result = analyze(
      `module m
record Point { x: int }
fn f(p: Point) -> int {
  p.y
}
`,
      "field.fir",
    );
    expect(result.diagnostics.some((d) => d.code === "TYPE-001")).toBe(true);
  });

  it("rejects if branches with different types", () => {
    const result = analyze(
      `module m
fn f(c: bool) -> int {
  if c { 1 } else { true }
}
`,
      "if.fir",
    );
    expect(result.diagnostics.some((d) => d.code === "TYPE-002")).toBe(true);
  });
});
