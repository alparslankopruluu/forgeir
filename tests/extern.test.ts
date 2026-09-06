import { emitTs } from "@forgeir/emit-ts";
import { analyze } from "@forgeir/sema";
import { parse } from "@forgeir/syntax";
import { describe, expect, it } from "vitest";

const WRAP = `module examples.wrap

extern fn basename(p: str) -> str = "node:path.basename"

fn demo() -> str {
  basename("/tmp/main.fir")
}
`;

const ENV = `module examples.env

extern fn homedir() -> str ! { env } = "node:os.homedir"

fn demo() -> str ! { env } {
  homedir()
}
`;

describe("extern and effects", () => {
  it("parses extern targets and omitted vs declared effects", () => {
    const wrap = parse(WRAP, "wrap.fir");
    expect(wrap.diagnostics).toEqual([]);
    expect(wrap.module?.externs).toHaveLength(1);
    expect(wrap.module?.externs[0]).toMatchObject({
      kind: "extern",
      name: "basename",
      target: "node:path.basename",
      effects: [],
    });
    expect(wrap.module?.functions[0]?.effects).toEqual([]);

    const env = parse(ENV, "env.fir");
    expect(env.diagnostics).toEqual([]);
    expect(env.module?.externs[0]?.effects).toEqual(["env"]);
    expect(env.module?.functions[0]?.effects).toEqual(["env"]);
  });

  it("accepts a pure wrapper around a Node builtin", () => {
    const result = analyze(WRAP, "wrap.fir");
    expect(result.diagnostics).toEqual([]);
    expect(result.module?.externs[0]?.target).toBe("node:path.basename");
  });

  it("rejects calling an env extern from a pure function", () => {
    const result = analyze(
      `module m
extern fn homedir() -> str ! { env } = "node:os.homedir"
fn demo() -> str {
  homedir()
}
`,
      "pure.fir",
    );
    const diag = result.diagnostics.find((d) => d.code === "EFFECT-001");
    expect(diag).toBeDefined();
    expect(diag?.expected).toBe("! { env }");
    expect(diag?.received).toBe("pure");
    expect(diag?.fixes?.some((f) => f.kind === "add_effect")).toBe(true);
  });

  it("rejects unknown effect names", () => {
    const result = analyze(
      `module m
fn demo() -> int ! { gpu } {
  1
}
`,
      "gpu.fir",
    );
    expect(result.diagnostics.some((d) => d.code === "EFFECT-002")).toBe(true);
  });

  it("rejects an extern target that is not module.export", () => {
    const result = analyze(
      `module m
extern fn bad() -> int = "nopath"
fn demo() -> int {
  bad()
}
`,
      "target.fir",
    );
    expect(result.diagnostics.some((d) => d.code === "EXTERN-001")).toBe(true);
  });

  it("emits a merged ESM import for externs", () => {
    const parsed = parse(WRAP, "wrap.fir");
    if (!parsed.module) {
      throw new Error("expected module");
    }
    const ts = emitTs(parsed.module);
    expect(ts).toContain('import { basename } from "node:path";');
    expect(ts).toContain("export function demo(): string {");
    expect(ts).not.toContain("export function basename");
  });

  it("aliases the import when the ForgeIR name differs", () => {
    const parsed = parse(
      `module m
extern fn file_name(p: str) -> str = "node:path.basename"
fn demo() -> str {
  file_name("/tmp/x")
}
`,
      "alias.fir",
    );
    if (!parsed.module) {
      throw new Error("expected module");
    }
    expect(emitTs(parsed.module)).toContain(
      'import { basename as file_name } from "node:path";',
    );
  });
});
