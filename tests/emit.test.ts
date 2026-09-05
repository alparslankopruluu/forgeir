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
});
