import { createServer } from "node:http";
import { emitTs } from "@forgeir/emit-ts";
import { get } from "@forgeir/http";
import { analyze } from "@forgeir/sema";
import { parse } from "@forgeir/syntax";
import { describe, expect, it } from "vitest";

function listen(
  handler: (
    req: import("node:http").IncomingMessage,
    res: import("node:http").ServerResponse,
  ) => void,
): Promise<{ url: string; close: () => Promise<void> }> {
  const server = createServer(handler);
  return new Promise((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        reject(new Error("expected tcp address"));
        return;
      }
      resolve({
        url: `http://127.0.0.1:${addr.port}`,
        close: () =>
          new Promise((done, fail) => {
            server.close((err) => (err ? fail(err) : done()));
          }),
      });
    });
  });
}

describe("@forgeir/http", () => {
  it("returns ok text from fetch", async () => {
    const server = await listen((_req, res) => {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("pong");
    });
    try {
      expect(await get(`${server.url}/`)).toEqual({
        tag: "ok",
        value: "pong",
      });
    } finally {
      await server.close();
    }
  });

  it("returns err on http errors", async () => {
    const server = await listen((_req, res) => {
      res.writeHead(404);
      res.end("missing");
    });
    try {
      expect(await get(`${server.url}/nope`)).toEqual({
        tag: "err",
        value: "http 404",
      });
    } finally {
      await server.close();
    }
  });
});

describe("net emit", () => {
  it("lowers net functions to async TypeScript and awaits calls", () => {
    const parsed = parse(
      `module examples.http
extern fn http_get(url: str) -> Result[str, str] ! { net } = "@forgeir/http.get"
fn ping(url: str) -> Result[str, str] ! { net } {
  http_get(url)
}
`,
      "http.fir",
    );
    if (!parsed.module) {
      throw new Error("expected module");
    }
    expect(
      analyze(
        `module examples.http
extern fn http_get(url: str) -> Result[str, str] ! { net } = "@forgeir/http.get"
fn ping(url: str) -> Result[str, str] ! { net } {
  http_get(url)
}
`,
        "http.fir",
      ).diagnostics,
    ).toEqual([]);
    const ts = emitTs(parsed.module);
    expect(ts).toContain('import { get as http_get } from "@forgeir/http";');
    expect(ts).toContain(
      "export async function ping(url: string): Promise<Result<string, string>> {",
    );
    expect(ts).toContain("return await http_get(url);");
  });
});
