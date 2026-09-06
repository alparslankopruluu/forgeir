import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

describe("e2e rename", () => {
  it("renames a function and runs call sites under the new name", () => {
    const dir = mkdtempSync(join(tmpdir(), "forgeir-rename-"));
    const file = join(dir, "main.fir");
    writeFileSync(
      file,
      `module examples.calc

fn add(a: int, b: int) -> int {
  a + b
}

fn twice(x: int) -> int {
  add(x, x)
}
`,
    );
    const patched = forge([
      "patch",
      file,
      "--qid",
      "examples.calc.add",
      "--rename",
      "plus",
      "--apply",
    ]);
    expect(patched.status).toBe(0);
    const src = readFileSync(file, "utf8");
    expect(src).toContain("fn plus(");
    expect(src).toContain("plus(x, x)");
    const run = forge(["run", file, "twice", "3"]);
    expect(run.status).toBe(0);
    expect(run.stdout.trim()).toBe("6");
  });
});
