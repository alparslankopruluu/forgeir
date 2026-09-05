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
record Bad {}
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
});
