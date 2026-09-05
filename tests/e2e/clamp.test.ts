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

describe("e2e clamp", () => {
  it("clamps 15 to 10", () => {
    const result = forge(["run", "examples/clamp/main.fir", "clamp10", "15"]);
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe("10");
  });

  it("clamps -1 to 0", () => {
    const result = forge(["run", "examples/clamp/main.fir", "clamp10", "-1"]);
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe("0");
  });
});
