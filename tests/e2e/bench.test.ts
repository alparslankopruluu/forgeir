import { describe, expect, it } from "vitest";
import { runOracles } from "../../benches/harness.ts";
import { oracles } from "../../benches/oracles.ts";

describe("compiler oracles", () => {
  it("executes at least ten tasks without publishing scores", async () => {
    expect(oracles.length).toBeGreaterThanOrEqual(10);
    const rows = await runOracles();
    const failed = rows.filter((row) => !row.ok);
    expect(failed).toEqual([]);
  }, 30000);
});
