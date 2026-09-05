import { readFile } from "node:fs/promises";
import { stdin, stdout } from "node:process";
import { report } from "@forgeir/diag";
import { analyze } from "@forgeir/sema";

export type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: number | string | null;
  method: string;
  params?: Record<string, unknown>;
};

export type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: number | string | null;
  result?: unknown;
  error?: { code: number; message: string };
};

const TOOLS = [
  {
    name: "forge_status",
    description: "Compact ForgeIR project status. Read-only. No source dump.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "forge_validate",
    description:
      "Parse and type-check a .fir file. Returns forge.diag/v1 JSON.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path to a .fir file" },
      },
      required: ["path"],
      additionalProperties: false,
    },
  },
];

function envelope(data: unknown) {
  return {
    ok: true,
    schema: "forge.mcp/v1",
    detail: "compact",
    cursor: null,
    truncated: false,
    data,
  };
}

function textResult(body: unknown): JsonRpcResponse["result"] {
  return {
    content: [{ type: "text", text: JSON.stringify(body) }],
  };
}

export async function handleMcpRequest(
  req: JsonRpcRequest,
): Promise<JsonRpcResponse> {
  const id = req.id ?? null;
  try {
    switch (req.method) {
      case "initialize":
        return {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: { tools: {} },
            serverInfo: { name: "forgeir", version: "0.0.0" },
          },
        };
      case "tools/list":
        return { jsonrpc: "2.0", id, result: { tools: TOOLS } };
      case "tools/call": {
        const name = String(req.params?.name ?? "");
        const args = (req.params?.arguments ?? {}) as Record<string, unknown>;
        if (name === "forge_status") {
          return {
            jsonrpc: "2.0",
            id,
            result: textResult(
              envelope({
                name: "ForgeIR",
                milestone: "M1",
                version: "0.0.0",
                implemented: [
                  "parse",
                  "check",
                  "emit",
                  "run",
                  "records",
                  "if",
                  "match",
                ],
                experimental: ["mcp stub"],
              }),
            ),
          };
        }
        if (name === "forge_validate") {
          const path = String(args.path ?? "");
          if (!path) {
            return {
              jsonrpc: "2.0",
              id,
              error: { code: -32602, message: "path is required" },
            };
          }
          const source = await readFile(path, "utf8");
          const analyzed = analyze(source, path);
          return {
            jsonrpc: "2.0",
            id,
            result: textResult(report(analyzed.diagnostics)),
          };
        }
        return {
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `unknown tool ${name}` },
        };
      }
      default:
        return {
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `unknown method ${req.method}` },
        };
    }
  } catch (err) {
    return {
      jsonrpc: "2.0",
      id,
      error: {
        code: -32603,
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

export async function runMcpStdio(): Promise<void> {
  let buffer = Buffer.alloc(0);

  const write = (msg: unknown) => {
    const json = JSON.stringify(msg);
    const payload = Buffer.from(json, "utf8");
    stdout.write(`Content-Length: ${payload.length}\r\n\r\n`);
    stdout.write(payload);
  };

  stdin.resume();

  stdin.on("data", (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);
    void (async () => {
      while (true) {
        const headerEnd = buffer.indexOf("\r\n\r\n");
        if (headerEnd === -1) {
          break;
        }
        const header = buffer.subarray(0, headerEnd).toString("utf8");
        const match = header.match(/Content-Length:\s*(\d+)/i);
        if (!match?.[1]) {
          buffer = buffer.subarray(headerEnd + 4);
          continue;
        }
        const length = Number(match[1]);
        const bodyStart = headerEnd + 4;
        if (buffer.length < bodyStart + length) {
          break;
        }
        const body = buffer
          .subarray(bodyStart, bodyStart + length)
          .toString("utf8");
        buffer = buffer.subarray(bodyStart + length);
        const parsed = JSON.parse(body) as JsonRpcRequest;
        if (
          parsed.method === "notifications/initialized" ||
          parsed.id === undefined
        ) {
          continue;
        }
        write(await handleMcpRequest(parsed));
      }
    })();
  });

  await new Promise<void>((resolve) => {
    stdin.on("end", () => resolve());
    stdin.on("close", () => resolve());
  });
}
