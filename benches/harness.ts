import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type Oracle, oracles } from "./oracles.ts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");

export type OracleResult = {
  id: string;
  ok: boolean;
  detail: string;
};

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

function localUrl(): Promise<{ url: string; close: () => void }> {
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

async function runOne(task: Oracle): Promise<OracleResult> {
  if (task.kind === "check_ok") {
    const result = forge(["check", task.file]);
    const ok = result.status === 0 && result.stdout.includes("ok");
    return {
      id: task.id,
      ok,
      detail: ok ? "ok" : result.stderr || result.stdout,
    };
  }
  if (task.kind === "check_code") {
    const result = forge(["check", "--json", task.file]);
    let codes: string[] = [];
    try {
      const body = JSON.parse(result.stdout) as {
        diagnostics?: { code: string }[];
      };
      codes = (body.diagnostics ?? []).map((d) => d.code);
    } catch {
      codes = [];
    }
    const ok = codes.includes(task.code);
    return {
      id: task.id,
      ok,
      detail: ok ? task.code : codes.join(",") || result.stderr,
    };
  }
  if (task.kind === "run") {
    const args = [
      "run",
      task.file,
      ...(task.fn ? [task.fn] : []),
      ...(task.args ?? []),
      ...(task.allow ?? []).flatMap((e) => ["--allow", e]),
    ];
    const result = forge(args);
    const got = result.stdout.trim();
    const ok = result.status === 0 && got === task.stdout;
    return {
      id: task.id,
      ok,
      detail: ok ? got : `${result.status} ${got || result.stderr}`,
    };
  }
  if (task.kind === "run_homedir") {
    const result = forge([
      "run",
      task.file,
      task.fn,
      ...task.allow.flatMap((e) => ["--allow", e]),
    ]);
    const got = result.stdout.trim();
    const ok = result.status === 0 && got === homedir();
    return { id: task.id, ok, detail: ok ? "homedir" : got || result.stderr };
  }
  const server = await localUrl();
  try {
    const result = await forgeAsync([
      "run",
      task.file,
      task.fn,
      server.url,
      "--allow",
      "net",
    ]);
    const got = result.stdout.trim();
    const ok = result.status === 0 && got === "1";
    return {
      id: task.id,
      ok,
      detail: ok ? "1" : `${result.status} ${got || result.stderr}`,
    };
  } finally {
    server.close();
  }
}

export async function runOracles(
  tasks: Oracle[] = oracles,
): Promise<OracleResult[]> {
  const out: OracleResult[] = [];
  for (const task of tasks) {
    out.push(await runOne(task));
  }
  return out;
}

const isMain =
  Boolean(process.argv[1]) &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? "");
if (isMain) {
  const results = await runOracles();
  let failed = 0;
  for (const row of results) {
    process.stdout.write(
      `${row.id} ${row.ok ? "pass" : "FAIL"} ${row.detail}\n`,
    );
    if (!row.ok) {
      failed += 1;
    }
  }
  process.stdout.write(
    `oracles ${results.length - failed}/${results.length} passed\n`,
  );
  process.stdout.write(
    "no scores; LLM token metrics require a tagged bench-vX with N ≥ 3\n",
  );
  process.exitCode = failed === 0 ? 0 : 1;
}
