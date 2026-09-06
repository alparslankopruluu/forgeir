import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { emitTs } from "@forgeir/emit-ts";
import { analyze } from "@forgeir/sema";
import type { ChatMessage, CompleteFn } from "./client.ts";
import { extractFir } from "./extract.ts";
import type { Trace } from "./summary.ts";
import { type LlmTask, systemPrompt, taskUserMessage } from "./tasks.ts";

export type TaskResult = Trace & {
  source: string;
  lastError: string;
};

function formatDiags(source: string, file: string): string {
  const result = analyze(source, file);
  if (result.diagnostics.length === 0) {
    return "";
  }
  return JSON.stringify(
    result.diagnostics.map((d) => ({
      code: d.code,
      message: d.message,
      expected: d.expected,
      received: d.received,
    })),
  );
}

async function runProgram(
  source: string,
  file: string,
  fnName: string,
  args: unknown[],
): Promise<{ stdout: string; error: string }> {
  const analyzed = analyze(source, file);
  if (!analyzed.module) {
    return { stdout: "", error: formatDiags(source, file) };
  }
  const js = emitTs(analyzed.module, { types: false });
  const dir = join(tmpdir(), "forgeir-llm");
  mkdirSync(dir, { recursive: true });
  const tmp = join(dir, `run-${randomUUID()}.mjs`);
  writeFileSync(tmp, js, "utf8");
  const ns = (await import(pathToFileURL(tmp).href)) as Record<
    string,
    (...xs: unknown[]) => unknown
  >;
  const fn = ns[fnName];
  if (typeof fn !== "function") {
    return { stdout: "", error: `no exported function ${fnName}` };
  }
  const value = await fn(...args);
  return { stdout: String(value), error: "" };
}

export async function runLlmTask(
  task: LlmTask,
  complete: CompleteFn,
): Promise<TaskResult> {
  const file = `${task.id}.fir`;
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt() },
    { role: "user", content: taskUserMessage(task, task.startSource) },
  ];
  let source = task.startSource;
  let promptTokens = 0;
  let completionTokens = 0;
  let estimated = false;
  let lastError = "no model output";
  let turns = 0;

  for (let turn = 1; turn <= task.maxTurns; turn += 1) {
    turns = turn;
    const completion = await complete(messages);
    promptTokens += completion.promptTokens;
    completionTokens += completion.completionTokens;
    estimated = estimated || completion.estimated;
    messages.push({ role: "assistant", content: completion.text });
    const extracted = extractFir(completion.text);
    if (!extracted) {
      lastError = "no .fir program in model output";
      messages.push({
        role: "user",
        content: "Reply with a complete .fir program in a fir fence.",
      });
      continue;
    }
    source = extracted;
    if (task.expect.kind === "check_ok") {
      const err = formatDiags(source, file);
      if (!err) {
        return {
          task: task.id,
          pass: true,
          turns,
          promptTokens,
          completionTokens,
          estimated,
          source,
          lastError: "",
        };
      }
      lastError = err;
      messages.push({
        role: "user",
        content: `forge check failed:\n${err}\nRepair the .fir.`,
      });
      continue;
    }
    const ran = await runProgram(
      source,
      file,
      task.expect.fn,
      task.expect.args,
    );
    if (!ran.error && ran.stdout === task.expect.stdout) {
      return {
        task: task.id,
        pass: true,
        turns,
        promptTokens,
        completionTokens,
        estimated,
        source,
        lastError: "",
      };
    }
    lastError = ran.error || `stdout ${JSON.stringify(ran.stdout)}`;
    messages.push({
      role: "user",
      content: `forge run failed: ${lastError}\nRepair the .fir.`,
    });
  }

  return {
    task: task.id,
    pass: false,
    turns,
    promptTokens,
    completionTokens,
    estimated,
    source,
    lastError,
  };
}
