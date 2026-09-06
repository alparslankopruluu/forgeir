import { emitTs } from "@forgeir/emit-ts";
import { analyze } from "@forgeir/sema";
import { parse } from "@forgeir/syntax";
import { describe, expect, it } from "vitest";

const SRC = `module examples.option

fn first_or(xs: list[int], fallback: int) -> int {
  match xs[0] {
    Some(v) => v
    None => fallback
  }
}

fn parse_pos(x: int) -> Result[int, str] {
  if x > 0 {
    Ok(x)
  } else {
    Err("not positive")
  }
}

fn demo() -> int {
  first_or([10, 20], 0)
}
`;

describe("list/Option/Result", () => {
  it("parses generic types, list literals, and variant patterns", () => {
    const result = parse(SRC, "option.fir");
    expect(result.diagnostics).toEqual([]);
    const first = result.module?.functions[0];
    expect(first?.params[0]?.type).toMatchObject({
      name: "list",
      args: [{ name: "int" }],
    });
    expect(first?.body).toMatchObject({
      kind: "match",
      scrutinee: { kind: "index" },
      arms: [
        { pattern: { kind: "variant", name: "Some", bind: "v" } },
        { pattern: { kind: "variant", name: "None", bind: null } },
      ],
    });
    expect(result.module?.functions[1]?.body).toMatchObject({
      kind: "if",
      elseBody: {
        kind: "call",
        name: "Err",
        args: [{ kind: "str", value: "not positive" }],
      },
    });
  });

  it("type-checks first_or and demo", () => {
    const result = analyze(SRC, "option.fir");
    expect(result.diagnostics).toEqual([]);
  });

  it("rejects a heterogeneous list", () => {
    const result = analyze(
      `module m
fn f() -> list[int] {
  [1, true]
}
`,
      "het.fir",
    );
    expect(result.diagnostics.some((d) => d.code === "TYPE-002")).toBe(true);
  });

  it("rejects uninferred None", () => {
    const result = analyze(
      `module m
fn f() -> int {
  None
}
`,
      "none.fir",
    );
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });

  it("emits Option/Result aliases and tagged values", () => {
    const parsed = parse(SRC, "option.fir");
    if (!parsed.module) {
      throw new Error("expected module");
    }
    const ts = emitTs(parsed.module);
    expect(ts).toContain("export type Result<T, E>");
    expect(ts).toContain('{ tag: "ok", value:');
    expect(ts).toContain('{ tag: "err", value:');
    expect(ts).toContain('{ tag: "some"');
    expect(ts).toContain('{ tag: "none"');
    expect(ts).toContain("[10, 20]");
  });
});
