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

describe("e2e use", () => {
  it("runs a function that calls another module", () => {
    const result = forge(["run", "examples/calc/main.fir", "twice", "3"]);
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe("6");
  });

  it("checks the calc example", () => {
    const result = forge(["check", "examples/calc/main.fir"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("ok");
  });
});
