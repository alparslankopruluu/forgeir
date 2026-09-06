import { fileURLToPath } from "node:url";
import { handleMcpRequest } from "@forgeir/mcp";
import { describe, expect, it } from "vitest";

const addPath = fileURLToPath(
  new URL("../examples/add/main.fir", import.meta.url),
);

async function call(name: string, args: Record<string, unknown>, id = 1) {
  return handleMcpRequest({
    jsonrpc: "2.0",
    id,
    method: name.startsWith("tools/") ? name : "tools/call",
    params: name.startsWith("tools/") ? args : { name, arguments: args },
  });
}

describe("MCP", () => {
  it("lists query, get, and patch tools", async () => {
    const result = await handleMcpRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
      params: {},
    });
    const tools = (result.result as { tools: { name: string }[] }).tools;
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([
      "forge_get",
      "forge_patch",
      "forge_query",
      "forge_status",
      "forge_validate",
    ]);
  });

  it("returns compact project status", async () => {
    const result = await handleMcpRequest({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "forge_status", arguments: {} },
    });
    const content = (result.result as { content: { text: string }[] }).content;
    const body = JSON.parse(content[0]?.text ?? "{}") as {
      ok: boolean;
      schema: string;
      data: { milestone: string; name: string };
    };
    expect(body.ok).toBe(true);
    expect(body.schema).toBe("forge.mcp/v1");
    expect(body.data.milestone).toBe("M5");
    expect(body.data.name).toBe("ForgeIR");
  });

  it("queries symbols without source", async () => {
    const result = await call("forge_query", {
      path: addPath,
      kind: "symbol",
      selector: "examples.add",
    });
    const content = (result.result as { content: { text: string }[] }).content;
    const body = JSON.parse(content[0]?.text ?? "{}") as {
      data: { nodes: { qid: string; snippet?: string }[] };
    };
    expect(body.data.nodes.some((n) => n.qid === "examples.add.add")).toBe(
      true,
    );
    expect(body.data.nodes.every((n) => n.snippet === undefined)).toBe(true);
  });

  it("previews a replace_expr patch", async () => {
    const result = await call("forge_patch", {
      path: addPath,
      qid: "examples.add.add@body",
      expr: "a - b",
    });
    const content = (result.result as { content: { text: string }[] }).content;
    const body = JSON.parse(content[0]?.text ?? "{}") as {
      data: { ok: boolean; wrote: boolean; hunks: string[] };
    };
    expect(body.data.ok).toBe(true);
    expect(body.data.wrote).toBe(false);
    expect(body.data.hunks.join("")).toContain("a - b");
  });

  it("previews a symbol rename", async () => {
    const result = await call("forge_patch", {
      path: addPath,
      qid: "examples.add.add",
      name: "sum",
    });
    const content = (result.result as { content: { text: string }[] }).content;
    const body = JSON.parse(content[0]?.text ?? "{}") as {
      data: { ok: boolean; wrote: boolean; hunks: string[] };
    };
    expect(body.data.ok).toBe(true);
    expect(body.data.wrote).toBe(false);
    expect(body.data.hunks.join("")).toContain("+sum");
  });
});
