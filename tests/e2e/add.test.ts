import { spawnSync } from "node:child_process";
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

describe("e2e add", () => {
  it("checks the add example", () => {
    const result = forge(["check", "examples/add/main.fir"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("ok");
  });

  it("runs add(2, 3) and prints 5", () => {
    const result = forge(["run", "examples/add/main.fir"]);
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe("5");
  });

  it("emits JSON diagnostics on success", () => {
    const result = forge(["check", "--json", "examples/add/main.fir"]);
    expect(result.status).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.schema).toBe("forge.diag/v1");
    expect(report.diagnostics).toEqual([]);
  });
});
