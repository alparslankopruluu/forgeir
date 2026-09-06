import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const prompts = join(root, "benches", "prompts");

export type LlmTask = {
  id: string;
  promptPath: string;
  startSource: string;
  maxTurns: number;
  expect:
    | { kind: "run"; fn: string; args: unknown[]; stdout: string }
    | { kind: "check_ok" };
};

function readPrompt(name: string): string {
  return readFileSync(join(prompts, name), "utf8");
}

function readFixture(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

export function systemPrompt(): string {
  return readPrompt("system.md");
}

export function renderPrompt(template: string, source: string): string {
  return template.replaceAll("{{source}}", source.trimEnd());
}

export const llmTasks: LlmTask[] = [
  {
    id: "T01",
    promptPath: "T01.md",
    startSource: "",
    maxTurns: 4,
    expect: { kind: "run", fn: "add", args: [2, 3], stdout: "5" },
  },
  {
    id: "T17",
    promptPath: "T17.md",
    startSource: readFixture("benches/fixtures/type_mismatch.fir"),
    maxTurns: 4,
    expect: { kind: "check_ok" },
  },
  {
    id: "T21",
    promptPath: "T21.md",
    startSource: readFixture("benches/fixtures/fs_in_pure.fir"),
    maxTurns: 4,
    expect: { kind: "check_ok" },
  },
];

export function taskUserMessage(task: LlmTask, source: string): string {
  return renderPrompt(readPrompt(task.promptPath), source);
}
