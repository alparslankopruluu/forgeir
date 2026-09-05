import { emitTs } from "@forgeir/emit-ts";
import { parse } from "@forgeir/syntax";
import { describe, expect, it } from "vitest";

describe("TypeScript emit", () => {
  it("emits a deterministic add function", () => {
    const parsed = parse(
      `module examples.add
fn add(a: int, b: int) -> int {
  a + b
}
`,
      "add.fir",
    );
    expect(parsed.module).not.toBeNull();
    if (!parsed.module) {
      throw new Error("expected module");
    }
    const ts = emitTs(parsed.module);
    expect(ts).toBe(
      [
        "export function add(a: number, b: number): number {",
        "  return (a + b);",
        "}",
        "",
      ].join("\n"),
    );
  });

  it("emits record types, if, and object literals", () => {
    const parsed = parse(
      `module examples.clamp
record Bounds {
  lo: int
  hi: int
}
fn clamp10(x: int) -> int {
  if x < 0 {
    0
  } else {
    x
  }
}
`,
      "clamp.fir",
    );
    if (!parsed.module) {
      throw new Error("expected module");
    }
    const ts = emitTs(parsed.module);
    expect(ts).toContain("export type Bounds = {");
    expect(ts).toContain("lo: number;");
    expect(ts).toContain("((x < 0) ? 0 : x)");
  });
});
