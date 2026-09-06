import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { formatReport, report } from "@forgeir/diag";
import { emitTs } from "@forgeir/emit-ts";
import {
  type GetDetail,
  getNode,
  indexModule,
  loadLock,
  queryGraph,
  saveLock,
} from "@forgeir/ir";
import { runMcpStdio } from "@forgeir/mcp";
import { previewPatch } from "@forgeir/patch";
import { analyze } from "@forgeir/sema";
import { parse } from "@forgeir/syntax";

type Flags = {
  json: boolean;
  apply: boolean;
  kind: "symbol" | "expr" | "all";
  detail: GetDetail;
  qid?: string;
  expr?: string;
  limit: number;
  allow: string[];
};

function parseArgv(argv: string[]): { flags: Flags; rest: string[] } {
  const flags: Flags = {
    json: false,
    apply: false,
    kind: "symbol",
    detail: "compact",
    limit: 20,
    allow: [],
  };
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] ?? "";
    if (arg === "--json") {
      flags.json = true;
    } else if (arg === "--apply") {
      flags.apply = true;
    } else if (arg === "--kind") {
      const value = argv[i + 1];
      i += 1;
      if (value === "symbol" || value === "expr" || value === "all") {
        flags.kind = value;
      }
    } else if (arg === "--detail") {
      const value = argv[i + 1];
      i += 1;
      if (value === "compact" || value === "sig" || value === "body") {
        flags.detail = value;
      }
    } else if (arg === "--qid") {
      const value = argv[i + 1];
      i += 1;
      if (value !== undefined) {
        flags.qid = value;
      }
    } else if (arg === "--expr") {
      const value = argv[i + 1];
      i += 1;
      if (value !== undefined) {
        flags.expr = value;
      }
    } else if (arg === "--limit") {
      flags.limit = Number(argv[i + 1] ?? 20);
      i += 1;
    } else if (arg === "--allow") {
      const value = argv[i + 1];
      i += 1;
      if (value !== undefined) {
        flags.allow.push(value);
      }
    } else {
      rest.push(arg);
    }
  }
  return { flags, rest };
}

async function main(argv: string[]): Promise<number> {
  const { flags, rest } = parseArgv(argv);
  const cmd = rest[0];

  if (!cmd || cmd === "--help" || cmd === "-h") {
    process.stdout.write(help());
    return cmd ? 0 : 2;
  }

  if (cmd === "mcp") {
    await runMcpStdio();
    return 0;
  }

  if (cmd === "parse") {
    const file = requireFile(rest[1]);
    const source = await readFile(file, "utf8");
    const parsed = parse(source, file);
    if (flags.json) {
      process.stdout.write(
        `${JSON.stringify(report(parsed.diagnostics), null, 2)}\n`,
      );
    } else {
      process.stdout.write(`${formatReport(parsed.diagnostics)}\n`);
    }
    return parsed.diagnostics.length > 0 ? 1 : 0;
  }

  if (cmd === "check") {
    const file = requireFile(rest[1]);
    const source = await readFile(file, "utf8");
    const analyzed = analyze(source, file);
    if (flags.json) {
      process.stdout.write(
        `${JSON.stringify(report(analyzed.diagnostics), null, 2)}\n`,
      );
    } else {
      process.stdout.write(`${formatReport(analyzed.diagnostics)}\n`);
    }
    return analyzed.diagnostics.length > 0 ? 1 : 0;
  }

  if (cmd === "emit") {
    const outIndex = rest.indexOf("-o");
    let out: string | undefined;
    const emitArgs = [...rest];
    if (outIndex !== -1) {
      out = emitArgs[outIndex + 1];
      emitArgs.splice(outIndex, 2);
    }
    const file = requireFile(emitArgs[1]);
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
    const file = requireFile(rest[1]);
    const fnName = rest[2] ?? "add";
    const extra = rest.slice(3);
    const fnArgs =
      extra.length > 0
        ? extra.map(parseRunArg)
        : fnName === "add"
          ? [2, 3]
          : [];
    const source = await readFile(file, "utf8");
    const analyzed = analyze(source, file);
    if (!analyzed.module) {
      process.stderr.write(`${formatReport(analyzed.diagnostics)}\n`);
      return 1;
    }
    const target = analyzed.module.functions.find((fn) => fn.name === fnName);
    const required = target?.effects ?? [];
    const missing = required.filter((e) => !flags.allow.includes(e));
    if (missing.length > 0) {
      process.stderr.write(
        `error: ${fnName} requires ${missing.join(", ")}; pass ${missing
          .map((e) => `--allow ${e}`)
          .join(" ")}\n`,
      );
      return 1;
    }
    const js = emitTs(analyzed.module, { types: false });
    const cacheDir = join(process.cwd(), ".forge", "cache");
    await mkdir(cacheDir, { recursive: true });
    const tmp = resolve(cacheDir, `run-${randomUUID()}.mjs`);
    await writeFile(tmp, js, "utf8");
    const ns = (await import(pathToFileURL(tmp).href)) as Record<
      string,
      (...xs: unknown[]) => unknown
    >;
    const fn = ns[fnName];
    if (typeof fn !== "function") {
      process.stderr.write(`error: no exported function ${fnName}\n`);
      return 1;
    }
    process.stdout.write(`${formatValue(await fn(...fnArgs))}\n`);
    return 0;
  }

  if (cmd === "lock" || cmd === "query" || cmd === "get" || cmd === "patch") {
    const file = requireFile(rest[1]);
    const source = await readFile(file, "utf8");
    const parsed = parse(source, file);
    if (!parsed.module) {
      process.stderr.write(`${formatReport(parsed.diagnostics)}\n`);
      return 1;
    }
    const lockPath = join(process.cwd(), "forge.lock.json");
    const lock = loadLock(lockPath);
    const indexed = indexModule(source, parsed.module, lock);

    if (cmd === "lock") {
      saveLock(lockPath, indexed.lock);
      process.stdout.write(
        `wrote ${Object.keys(indexed.lock.ids).length} ids to ${lockPath}\n`,
      );
      return 0;
    }

    if (cmd === "query") {
      const result = queryGraph(indexed.graph, {
        kind: flags.kind,
        selector: rest[2] ?? "",
        limit: flags.limit,
      });
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return 0;
    }

    if (cmd === "get") {
      const selector = rest[2];
      if (!selector) {
        throw new UsageError("missing selector");
      }
      const got = getNode(indexed.graph, selector, flags.detail);
      if (!got) {
        process.stderr.write(`error: unknown node ${selector}\n`);
        return 1;
      }
      process.stdout.write(`${JSON.stringify(got.node, null, 2)}\n`);
      return 0;
    }

    const qid = flags.qid ?? rest[2];
    const expr = flags.expr ?? rest[3];
    if (!qid || expr === undefined) {
      throw new UsageError("patch needs --qid and --expr");
    }
    const preview = previewPatch(source, file, lock, {
      schema: "forge.patch/v1",
      ops: [{ op: "replace_expr", qid, expr }],
    });
    if (
      flags.apply &&
      preview.diagnostics.every((d) => d.code !== "PATCH-001")
    ) {
      const parsedAfter = parse(preview.source, file);
      if (parsedAfter.module) {
        await writeFile(file, preview.source, "utf8");
        preview.wrote = true;
        preview.mode = "apply";
      }
    }
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: preview.ok,
          wrote: preview.wrote,
          hunks: preview.hunks,
          diagnostics: preview.report,
        },
        null,
        2,
      )}\n`,
    );
    return preview.ok || preview.wrote ? 0 : 1;
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

function parseRunArg(raw: string): unknown {
  if (/^-?\d+$/.test(raw)) {
    return Number(raw);
  }
  return raw;
}

function formatValue(value: unknown): string {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  return JSON.stringify(value);
}

function help(): string {
  return `ForgeIR M4 compiler

Usage:
  forge parse <file>
  forge check [--json] <file>
  forge emit [-o file] <file>
  forge run <file> [fn] [args...] [--allow net|fs|env]
  forge lock <file>
  forge query <file> [selector] [--kind symbol|expr|all]
  forge get <file> <selector> [--detail compact|sig|body]
  forge patch <file> --qid <qid> --expr <source> [--apply]
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
