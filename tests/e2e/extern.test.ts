import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
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

describe("e2e extern", () => {
  it("runs a pure Node builtin wrapper", () => {
    const result = forge(["run", "examples/wrap/main.fir", "demo"]);
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe("main.fir");
  });

  it("refuses an env effect without --allow", () => {
    const result = forge(["run", "examples/env/main.fir", "demo"]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("--allow env");
  });

  it("runs homedir when env is allowed", () => {
    const result = forge([
      "run",
      "examples/env/main.fir",
      "demo",
      "--allow",
      "env",
    ]);
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe(homedir());
  });
});
