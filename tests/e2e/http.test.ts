import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repo = fileURLToPath(new URL("../../", import.meta.url));

function forge(args: string[]) {
  return spawnSync(
    "pnpm",
    ["exec", "tsx", "packages/cli/src/main.ts", ...args],
    {
      cwd: repo,
      encoding: "utf8",
    },
  );
}

function forgeAsync(args: string[]) {
  return new Promise<{ status: number | null; stdout: string; stderr: string }>(
    (resolve, reject) => {
      const child = spawn(
        "pnpm",
        ["exec", "tsx", "packages/cli/src/main.ts", ...args],
        { cwd: repo },
      );
      let stdout = "";
      let stderr = "";
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        stdout += chunk;
      });
      child.stderr.on("data", (chunk: string) => {
        stderr += chunk;
      });
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error(`timeout running forge ${args.join(" ")}`));
      }, 20000);
      child.on("close", (status) => {
        clearTimeout(timer);
        resolve({ status, stdout, stderr });
      });
    },
  );
}

function withServer(): Promise<{ url: string; close: () => void }> {
  return new Promise((resolve, reject) => {
    const server = createServer((_req, res) => {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("ok");
    });
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        reject(new Error("expected tcp address"));
        return;
      }
      resolve({
        url: `http://127.0.0.1:${addr.port}`,
        close: () => {
          server.close();
        },
      });
    });
  });
}

describe("e2e http", () => {
  it("refuses net without --allow", () => {
    const result = forge([
      "run",
      "examples/http/main.fir",
      "status_ok",
      "http://127.0.0.1:1",
    ]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("--allow net");
  });

  it("GETs a local URL through forge.http", async () => {
    const server = await withServer();
    try {
      const result = await forgeAsync([
        "run",
        "examples/http/main.fir",
        "status_ok",
        server.url,
        "--allow",
        "net",
      ]);
      expect(result.status).toBe(0);
      expect(result.stdout.trim()).toBe("1");
    } finally {
      server.close();
    }
  });
});
