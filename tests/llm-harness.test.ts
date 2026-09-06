import { describe, expect, it } from "vitest";
import { completeOpenAI, loadConfig } from "../benches/llm/client.ts";
import { extractFir } from "../benches/llm/extract.ts";
import { runLlmHarness } from "../benches/llm/harness.ts";
import { runLlmTask } from "../benches/llm/run.ts";
import { formatSummary, summarize } from "../benches/llm/summary.ts";
import { llmTasks } from "../benches/llm/tasks.ts";

const ADD = `module examples.add

fn add(a: int, b: int) -> int {
  a + b
}
`;

describe("llm harness pieces", () => {
  it("extracts a fir fence", () => {
    expect(
      extractFir("here\n```fir\nmodule m\nfn f() -> int { 1 }\n```\n"),
    ).toBe("module m\nfn f() -> int { 1 }\n");
  });

  it("refuses means when N < 3", () => {
    const summary = summarize([
      {
        task: "T01",
        pass: true,
        turns: 1,
        promptTokens: 10,
        completionTokens: 5,
        estimated: false,
      },
    ]);
    expect(summary.okToReportMeans).toBe(false);
    expect(summary.meanPromptTokens).toBeNull();
    expect(formatSummary(summary)).toContain("N < 3");
    expect(formatSummary(summary)).toContain("README must not cite");
  });

  it("reports means only for N ≥ 3 measured traces", () => {
    const traces = [1, 2, 3].map((n) => ({
      task: "T01",
      pass: true,
      turns: n,
      promptTokens: 10,
      completionTokens: 5,
      estimated: false,
    }));
    const summary = summarize(traces);
    expect(summary.okToReportMeans).toBe(true);
    expect(summary.meanPromptTokens).toBe(10);
    expect(summary.meanTurns).toBe(2);
  });

  it("skips the live harness without API config", async () => {
    const result = await runLlmHarness([], {});
    expect(result.skipped).toBe(true);
    expect(result.code).toBe(0);
    expect(result.output).toContain("skipped");
  });

  it("loads config only when key and model are set", () => {
    expect(loadConfig({})).toBeNull();
    expect(
      loadConfig({ FORGEIR_BENCH_API_KEY: "k", FORGEIR_BENCH_MODEL: "m" }),
    ).toMatchObject({ apiKey: "k", model: "m" });
  });

  it("uses API usage when present", async () => {
    const completion = await completeOpenAI(
      [{ role: "user", content: "hi" }],
      { apiKey: "k", baseUrl: "https://example.test/v1", model: "m" },
      async () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { content: "ok" } }],
            usage: { prompt_tokens: 3, completion_tokens: 1 },
          }),
          { status: 200 },
        ),
    );
    expect(completion).toEqual({
      text: "ok",
      promptTokens: 3,
      completionTokens: 1,
      estimated: false,
    });
  });

  it("runs T01 against a stub model that returns add", async () => {
    const t01 = llmTasks.find((t) => t.id === "T01");
    if (!t01) {
      throw new Error("missing T01");
    }
    const result = await runLlmTask(t01, async () => ({
      text: `\`\`\`fir\n${ADD}\`\`\``,
      promptTokens: 8,
      completionTokens: 4,
      estimated: false,
    }));
    expect(result.pass).toBe(true);
    expect(result.turns).toBe(1);
    expect(result.promptTokens).toBe(8);
  });
});
