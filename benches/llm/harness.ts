import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { completeOpenAI, loadConfig } from "./client.ts";
import { runLlmTask } from "./run.ts";
import { formatSummary, summarize, type Trace } from "./summary.ts";
import { llmTasks } from "./tasks.ts";

function parseRepeat(argv: string[]): number {
  const idx = argv.indexOf("--repeat");
  if (idx === -1) {
    return 1;
  }
  const n = Number(argv[idx + 1] ?? 1);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export async function runLlmHarness(
  argv: string[] = process.argv.slice(2),
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ skipped: boolean; code: number; output: string }> {
  const config = loadConfig(env);
  if (!config) {
    const output =
      "skipped: set FORGEIR_BENCH_API_KEY (or OPENAI_API_KEY) and FORGEIR_BENCH_MODEL\n";
    return { skipped: true, code: 0, output };
  }
  const repeat = parseRepeat(argv);
  const traces: Trace[] = [];
  const complete = (messages: Parameters<typeof completeOpenAI>[0]) =>
    completeOpenAI(messages, config);
  for (let i = 0; i < repeat; i += 1) {
    for (const task of llmTasks) {
      traces.push(await runLlmTask(task, complete));
    }
  }
  const summary = summarize(traces);
  const output = traces
    .map(
      (t) =>
        `${t.task} ${t.pass ? "pass" : "FAIL"} turns=${t.turns} tokens=${t.promptTokens}+${t.completionTokens}${t.estimated ? " (est)" : ""}`,
    )
    .join("\n")
    .concat("\n", formatSummary(summary));
  const dir = join(process.cwd(), "benches", "artifacts");
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(":", "-");
  writeFileSync(
    join(dir, `llm-${stamp}.json`),
    `${JSON.stringify({ config: { model: config.model, baseUrl: config.baseUrl }, traces, summary }, null, 2)}\n`,
    "utf8",
  );
  return { skipped: false, code: traces.every((t) => t.pass) ? 0 : 1, output };
}

const isMain =
  Boolean(process.argv[1]) &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? "");
if (isMain) {
  const result = await runLlmHarness();
  process.stdout.write(result.output);
  process.exitCode = result.code;
}
