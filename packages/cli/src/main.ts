import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { formatReport, report } from "@forgeir/diag";
import { emitTs } from "@forgeir/emit-ts";
import { runMcpStdio } from "@forgeir/mcp";
import { analyze } from "@forgeir/sema";
import { parse } from "@forgeir/syntax";

async function main(argv: string[]): Promise<number> {
  const json = argv.includes("--json");
  const args = argv.filter((a) => a !== "--json");
  const cmd = args[0];

  if (!cmd || cmd === "--help" || cmd === "-h") {
    process.stdout.write(help());
    return cmd ? 0 : 2;
  }

  if (cmd === "mcp") {
    await runMcpStdio();
    return 0;
  }

  if (cmd === "parse") {
    const file = requireFile(args[1]);
    const source = await readFile(file, "utf8");
    const parsed = parse(source, file);
    if (json) {
      process.stdout.write(
        `${JSON.stringify(report(parsed.diagnostics), null, 2)}\n`,
      );
    } else {
      process.stdout.write(`${formatReport(parsed.diagnostics)}\n`);
    }
    return parsed.diagnostics.length > 0 ? 1 : 0;
  }

  if (cmd === "check") {
    const file = requireFile(args[1]);
    const source = await readFile(file, "utf8");
    const analyzed = analyze(source, file);
    if (json) {
      process.stdout.write(
        `${JSON.stringify(report(analyzed.diagnostics), null, 2)}\n`,
      );
    } else {
      process.stdout.write(`${formatReport(analyzed.diagnostics)}\n`);
    }
    return analyzed.diagnostics.length > 0 ? 1 : 0;
  }

  if (cmd === "emit") {
    const outIndex = args.indexOf("-o");
    let out: string | undefined;
    const rest = [...args];
    if (outIndex !== -1) {
      out = rest[outIndex + 1];
      rest.splice(outIndex, 2);
    }
    const file = requireFile(rest[1]);
    const source = await readFile(file, "utf8");
    const analyzed = analyze(source, file);
    if (!analyzed.module) {
      process.stderr.write(`${formatReport(analyzed.diagnostics)}\n`);
      return 1;
    }
    const ts = emitTs(analyzed.module);
    if (out) {
      const dest = resolve(out);
      await mkdir(dirname(dest), { recursive: true });
      await writeFile(dest, ts, "utf8");
    } else {
      process.stdout.write(ts);
    }
    return 0;
  }

  if (cmd === "run") {
    const file = requireFile(args[1]);
    const fnName = args[2] ?? "add";
    const fnArgs = (args.slice(3).length > 0 ? args.slice(3) : ["2", "3"]).map(
      Number,
    );
    const source = await readFile(file, "utf8");
    const analyzed = analyze(source, file);
    if (!analyzed.module) {
      process.stderr.write(`${formatReport(analyzed.diagnostics)}\n`);
      return 1;
    }
    const js = emitTs(analyzed.module, { types: false });
    const tmp = resolve(tmpdir(), `forgeir-run-${randomUUID()}.mjs`);
    await writeFile(tmp, js, "utf8");
    const ns = (await import(pathToFileURL(tmp).href)) as Record<
      string,
      (...xs: number[]) => number
    >;
    const fn = ns[fnName];
    if (typeof fn !== "function") {
      process.stderr.write(`error: no exported function ${fnName}\n`);
      return 1;
    }
    process.stdout.write(`${fn(...fnArgs)}\n`);
    return 0;
  }

  process.stderr.write(`unknown command ${cmd}\n${help()}`);
  return 2;
}

function requireFile(path: string | undefined): string {
  if (!path) {
    throw new UsageError("missing file path");
  }
  return resolve(path);
}

function help(): string {
  return `ForgeIR M1 compiler

Usage:
  forge parse <file>
  forge check [--json] <file>
  forge emit [-o file] <file>
  forge run <file> [fn] [args...]
  forge mcp
`;
}

class UsageError extends Error {}

main(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err: unknown) => {
    if (err instanceof UsageError) {
      process.stderr.write(`${err.message}\n${help()}`);
      process.exitCode = 2;
      return;
    }
    process.stderr.write(
      `${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exitCode = 1;
  });
