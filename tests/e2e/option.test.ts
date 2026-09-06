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

describe("e2e option", () => {
  it("returns the first list element", () => {
    const result = forge(["run", "examples/option/main.fir", "demo"]);
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe("10");
  });

  it("falls back on an empty list", () => {
    const result = forge(["run", "examples/option/main.fir", "empty"]);
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe("7");
  });
});
