import { handleMcpRequest } from "@forgeir/mcp";
import { describe, expect, it } from "vitest";

describe("MCP stub", () => {
  it("lists forge_status and forge_validate", async () => {
    const result = await handleMcpRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
      params: {},
    });
    const tools = (result.result as { tools: { name: string }[] }).tools;
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(["forge_status", "forge_validate"]);
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
    expect(body.data.milestone).toBe("M0");
    expect(body.data.name).toBe("ForgeIR");
  });
});
