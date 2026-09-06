import { emitTs } from "@forgeir/emit-ts";
import { analyze } from "@forgeir/sema";
import { parse } from "@forgeir/syntax";
import { describe, expect, it } from "vitest";

const CALC = `module examples.calc

use examples.add.{add}

fn twice(x: int) -> int {
  add(x, x)
}
`;

describe("use modules", () => {
  it("parses use Module.{name}", () => {
    const result = parse(CALC, "calc.fir");
    expect(result.diagnostics).toEqual([]);
    expect(result.module?.uses).toEqual([
      expect.objectContaining({
        module: "examples.add",
        names: ["add"],
      }),
    ]);
  });

  it("type-checks a call to an imported function", () => {
    const result = analyze(CALC, "calc.fir", { root: process.cwd() });
    expect(result.diagnostics).toEqual([]);
    expect(result.module?.imports).toEqual([
      expect.objectContaining({
        name: "add",
        from: "examples.add",
        kind: "fn",
      }),
    ]);
    expect(result.program.map((m) => m.name)).toEqual([
      "examples.add",
      "examples.calc",
    ]);
  });

  it("rejects an unknown module", () => {
    const result = analyze(
      `module m
use missing.mod.{f}
fn g() -> int { 1 }
`,
      "m.fir",
      { root: process.cwd() },
    );
    expect(result.diagnostics.some((d) => d.code === "USE-001")).toBe(true);
  });

  it("rejects a missing export", () => {
    const result = analyze(
      `module examples.calc
use examples.add.{nope}
fn g() -> int { 1 }
`,
      "calc.fir",
      { root: process.cwd() },
    );
    expect(result.diagnostics.some((d) => d.code === "USE-002")).toBe(true);
  });

  it("emits an ESM import for used functions", () => {
    const analyzed = analyze(CALC, "calc.fir", { root: process.cwd() });
    if (!analyzed.module) {
      throw new Error("expected module");
    }
    const ts = emitTs(analyzed.module, {
      moduleImports: [{ spec: "./examples.add.mjs", names: ["add"] }],
    });
    expect(ts).toContain('import { add } from "./examples.add.mjs";');
    expect(ts).toContain("export function twice");
    expect(ts).not.toContain("export function add");
  });
});
