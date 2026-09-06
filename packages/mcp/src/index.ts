import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { stdin, stdout } from "node:process";
import { report } from "@forgeir/diag";
import {
  type GetDetail,
  getNode,
  indexModule,
  loadLock,
  lockIdsEqual,
  queryGraph,
  saveLock,
} from "@forgeir/ir";
import { type PatchOp, previewPatch } from "@forgeir/patch";
import { analyze } from "@forgeir/sema";
import { parse } from "@forgeir/syntax";

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
  {
    name: "forge_query",
    description:
      "List compact IR nodes by kind and selector (qid prefix or nid). No source dump.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        kind: { type: "string", enum: ["symbol", "expr", "all"] },
        selector: { type: "string" },
        limit: { type: "integer" },
        cursor: { type: "integer" },
      },
      required: ["path"],
      additionalProperties: false,
    },
  },
  {
    name: "forge_get",
    description:
      "Fetch one node. detail=compact|sig|body. body includes a snippet, not the whole file.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        selector: { type: "string" },
        detail: { type: "string", enum: ["compact", "sig", "body"] },
      },
      required: ["path", "selector"],
      additionalProperties: false,
    },
  },
  {
    name: "forge_patch",
    description:
      "Semantic replace_expr or rename. Default mode is preview. apply writes the file and retargets lockfile nids on rename.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        mode: { type: "string", enum: ["preview", "apply"] },
        qid: { type: "string" },
        nid: { type: "string" },
        expr: { type: "string" },
        name: { type: "string" },
        ops: { type: "array" },
      },
      required: ["path"],
      additionalProperties: false,
    },
  },
];

function envelope(
  data: unknown,
  extra: { truncated?: boolean; cursor?: number | null } = {},
) {
  return {
    ok: true,
    schema: "forge.mcp/v1",
    detail: "compact",
    cursor: extra.cursor ?? null,
    truncated: extra.truncated ?? false,
    data,
  };
}

function textResult(body: unknown): JsonRpcResponse["result"] {
  return {
    content: [{ type: "text", text: JSON.stringify(body) }],
  };
}

function rpcError(
  id: number | string | null,
  code: number,
  message: string,
): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

async function loadGraph(path: string) {
  const source = await readFile(path, "utf8");
  const parsed = parse(source, path);
  if (!parsed.module) {
    return {
      source,
      parsed,
      graph: null,
      lock: loadLock(join(process.cwd(), "forge.lock.json")),
    };
  }
  const lock = loadLock(join(process.cwd(), "forge.lock.json"));
  const indexed = indexModule(source, parsed.module, lock);
  return { source, parsed, graph: indexed.graph, lock: indexed.lock };
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
                milestone: "M4",
                version: "0.0.0",
                implemented: [
                  "parse",
                  "check",
                  "emit",
                  "run",
                  "records",
                  "if",
                  "match",
                  "list",
                  "Option",
                  "Result",
                  "lock",
                  "query",
                  "get",
                  "patch-preview",
                  "extern",
                  "effects",
                  "forge.http",
                  "oracles",
                  "rename",
                ],
                experimental: ["patch-apply"],
              }),
            ),
          };
        }
        if (name === "forge_validate") {
          const path = String(args.path ?? "");
          if (!path) {
            return rpcError(id, -32602, "path is required");
          }
          const source = await readFile(path, "utf8");
          const analyzed = analyze(source, path);
          return {
            jsonrpc: "2.0",
            id,
            result: textResult(report(analyzed.diagnostics)),
          };
        }
        if (name === "forge_query") {
          const path = String(args.path ?? "");
          if (!path) {
            return rpcError(id, -32602, "path is required");
          }
          const loaded = await loadGraph(path);
          if (!loaded.graph) {
            return {
              jsonrpc: "2.0",
              id,
              result: textResult(report(loaded.parsed.diagnostics)),
            };
          }
          const kind = args.kind;
          const result = queryGraph(loaded.graph, {
            kind:
              kind === "expr" || kind === "all" || kind === "symbol"
                ? kind
                : "symbol",
            selector: String(args.selector ?? ""),
            limit: typeof args.limit === "number" ? args.limit : 20,
            cursor: typeof args.cursor === "number" ? args.cursor : 0,
          });
          return {
            jsonrpc: "2.0",
            id,
            result: textResult(
              envelope(
                { nodes: result.nodes },
                { cursor: result.cursor, truncated: result.truncated },
              ),
            ),
          };
        }
        if (name === "forge_get") {
          const path = String(args.path ?? "");
          const selector = String(args.selector ?? "");
          if (!path || !selector) {
            return rpcError(id, -32602, "path and selector are required");
          }
          const loaded = await loadGraph(path);
          if (!loaded.graph) {
            return rpcError(id, -32603, "parse failed");
          }
          const detail: GetDetail =
            args.detail === "sig" || args.detail === "body"
              ? args.detail
              : "compact";
          const got = getNode(loaded.graph, selector, detail);
          if (!got) {
            return rpcError(id, -32602, `unknown node ${selector}`);
          }
          return {
            jsonrpc: "2.0",
            id,
            result: textResult(envelope(got.node)),
          };
        }
        if (name === "forge_patch") {
          const path = String(args.path ?? "");
          if (!path) {
            return rpcError(id, -32602, "path is required");
          }
          const loaded = await loadGraph(path);
          const ops = (
            Array.isArray(args.ops)
              ? args.ops
              : args.name && args.expr === undefined
                ? [
                    {
                      op: "rename" as const,
                      qid: args.qid ? String(args.qid) : undefined,
                      nid: args.nid ? String(args.nid) : undefined,
                      name: String(args.name),
                    },
                  ]
                : [
                    {
                      op: "replace_expr" as const,
                      qid: args.qid ? String(args.qid) : undefined,
                      nid: args.nid ? String(args.nid) : undefined,
                      expr: String(args.expr ?? ""),
                    },
                  ]
          ) as PatchOp[];
          const preview = previewPatch(loaded.source, path, loaded.lock, {
            schema: "forge.patch/v1",
            ops,
          });
          const mode = args.mode === "apply" ? "apply" : "preview";
          if (
            mode === "apply" &&
            preview.diagnostics.every((d) => d.code !== "PATCH-001")
          ) {
            const parsedAfter = parse(preview.source, path);
            if (parsedAfter.module) {
              await writeFile(path, preview.source, "utf8");
              preview.wrote = true;
              preview.mode = "apply";
              const lockPath = join(process.cwd(), "forge.lock.json");
              if (!lockIdsEqual(loaded.lock, preview.lock)) {
                saveLock(lockPath, preview.lock);
              }
            }
          }
          return {
            jsonrpc: "2.0",
            id,
            result: textResult(
              envelope({
                ok: preview.ok,
                wrote: preview.wrote,
                mode: preview.mode,
                hunks: preview.hunks,
                diagnostics: preview.report,
              }),
            ),
          };
        }
        return rpcError(id, -32601, `unknown tool ${name}`);
      }
      default:
        return rpcError(id, -32601, `unknown method ${req.method}`);
    }
  } catch (err) {
    return rpcError(
      id,
      -32603,
      err instanceof Error ? err.message : String(err),
    );
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
