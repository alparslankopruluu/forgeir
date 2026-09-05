import { parse } from "@forgeir/syntax";
import { describe, expect, it } from "vitest";

const ADD = `module examples.add

fn add(a: int, b: int) -> int {
  a + b
}
`;

describe("M0 parser", () => {
  it("parses the add example", () => {
    const result = parse(ADD, "examples/add/main.fir");
    expect(result.diagnostics).toEqual([]);
    expect(result.module?.name).toBe("examples.add");
    expect(result.module?.functions).toHaveLength(1);
    const fn = result.module?.functions[0];
    expect(fn?.name).toBe("add");
    expect(fn?.params.map((p) => [p.name, p.type.name])).toEqual([
      ["a", "int"],
      ["b", "int"],
    ]);
    expect(fn?.returnType.name).toBe("int");
    expect(fn?.body).toMatchObject({
      kind: "binary",
      op: "+",
      left: { kind: "name", name: "a" },
      right: { kind: "name", name: "b" },
    });
  });

  it("parses integer literals and operator precedence", () => {
    const src = `module m
fn f() -> int {
  1 + 2 * 3
}
`;
    const result = parse(src, "prec.fir");
    expect(result.diagnostics).toEqual([]);
    expect(result.module?.functions[0]?.body).toMatchObject({
      kind: "binary",
      op: "+",
      left: { kind: "int", value: 1 },
      right: {
        kind: "binary",
        op: "*",
        left: { kind: "int", value: 2 },
        right: { kind: "int", value: 3 },
      },
    });
  });

  it("emits PARSE-001 on unknown syntax instead of dropping it", () => {
    const src = `module m
fn f() -> int {
  a + b
}
class Bad {}
`;
    const result = parse(src, "bad.fir");
    expect(result.module).toBeNull();
    expect(result.diagnostics[0]?.code).toBe("PARSE-001");
    expect(result.diagnostics[0]?.severity).toBe("error");
  });

  it("ignores line comments", () => {
    const src = `// hello
module m
fn f() -> int { // body
  1
}
`;
    const result = parse(src, "comment.fir");
    expect(result.diagnostics).toEqual([]);
    expect(result.module?.functions[0]?.body).toMatchObject({
      kind: "int",
      value: 1,
    });
  });

  it("parses records, field access, construct, and calls", () => {
    const src = `module examples.clamp

record Bounds {
  lo: int
  hi: int
}

fn clamp(x: int, b: Bounds) -> int {
  clamp10(x)
}

fn clamp10(x: int) -> int {
  clamp(x, Bounds { lo: 0, hi: 10 })
}
`;
    const result = parse(src, "clamp.fir");
    expect(result.diagnostics).toEqual([]);
    expect(result.module?.records).toHaveLength(1);
    expect(result.module?.records[0]?.name).toBe("Bounds");
    expect(result.module?.records[0]?.fields.map((f) => f.name)).toEqual([
      "lo",
      "hi",
    ]);
    expect(result.module?.functions[1]?.body).toMatchObject({
      kind: "call",
      name: "clamp",
      args: [
        { kind: "name", name: "x" },
        {
          kind: "construct",
          name: "Bounds",
          fields: [{ name: "lo" }, { name: "hi" }],
        },
      ],
    });
  });

  it("parses if, match, comparisons, and bool literals", () => {
    const src = `module m

fn pick(x: int, flag: bool) -> int {
  if flag {
    x
  } else {
    match x {
      0 => 1
      _ => x
    }
  }
}

fn pos(x: int) -> bool {
  x > 0
}
`;
    const result = parse(src, "if.fir");
    expect(result.diagnostics).toEqual([]);
    expect(result.module?.functions[0]?.body).toMatchObject({
      kind: "if",
      cond: { kind: "name", name: "flag" },
      thenBody: { kind: "name", name: "x" },
      elseBody: {
        kind: "match",
        scrutinee: { kind: "name", name: "x" },
        arms: [
          { pattern: { kind: "int", value: 0 } },
          { pattern: { kind: "wildcard" } },
        ],
      },
    });
    expect(result.module?.functions[1]?.body).toMatchObject({
      kind: "binary",
      op: ">",
      left: { kind: "name", name: "x" },
      right: { kind: "int", value: 0 },
    });
  });
});
