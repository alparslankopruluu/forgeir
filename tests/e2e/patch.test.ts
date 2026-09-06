import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repo = fileURLToPath(new URL("../../", import.meta.url));
const addSrc = readFileSync(join(repo, "examples/add/main.fir"), "utf8");

function forge(cwd: string, args: string[]) {
  return spawnSync(
    "pnpm",
    ["exec", "tsx", "packages/cli/src/main.ts", ...args],
    {
      cwd,
      encoding: "utf8",
    },
  );
}

describe("e2e patch", () => {
  it("applies replace_expr and runs the new body", () => {
    const dir = mkdtempSync(join(tmpdir(), "forgeir-patch-"));
    const file = join(dir, "main.fir");
    writeFileSync(file, addSrc);
    const preview = forge(repo, [
      "patch",
      file,
      "--qid",
      "examples.add.add@body",
      "--expr",
      "a - b",
      "--apply",
    ]);
    expect(preview.status).toBe(0);
    expect(readFileSync(file, "utf8")).toContain("a - b");
    const run = forge(repo, ["run", file, "add", "2", "3"]);
    expect(run.status).toBe(0);
    expect(run.stdout.trim()).toBe("-1");
  });
});
