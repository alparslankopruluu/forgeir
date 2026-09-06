export type Trace = {
  task: string;
  pass: boolean;
  turns: number;
  promptTokens: number;
  completionTokens: number;
  estimated: boolean;
};

export type Summary = {
  n: number;
  passed: number;
  okToReportMeans: boolean;
  reason: string;
  meanPromptTokens: number | null;
  meanCompletionTokens: number | null;
  meanTurns: number | null;
};

export const MIN_N = 3;

export function summarize(traces: Trace[]): Summary {
  const n = traces.length;
  if (n === 0) {
    return {
      n: 0,
      passed: 0,
      okToReportMeans: false,
      reason: "no traces",
      meanPromptTokens: null,
      meanCompletionTokens: null,
      meanTurns: null,
    };
  }
  if (n < MIN_N) {
    return {
      n,
      passed: traces.filter((t) => t.pass).length,
      okToReportMeans: false,
      reason: `N < ${MIN_N} (have ${n})`,
      meanPromptTokens: null,
      meanCompletionTokens: null,
      meanTurns: null,
    };
  }
  if (traces.some((t) => t.estimated)) {
    return {
      n,
      passed: traces.filter((t) => t.pass).length,
      okToReportMeans: false,
      reason: "token counts include estimates; API usage required",
      meanPromptTokens: null,
      meanCompletionTokens: null,
      meanTurns: null,
    };
  }
  const passed = traces.filter((t) => t.pass).length;
  const mean = (sel: (t: Trace) => number) =>
    traces.reduce((sum, t) => sum + sel(t), 0) / n;
  return {
    n,
    passed,
    okToReportMeans: true,
    reason: `N = ${n}; stdout/artifacts only, not README`,
    meanPromptTokens: mean((t) => t.promptTokens),
    meanCompletionTokens: mean((t) => t.completionTokens),
    meanTurns: mean((t) => t.turns),
  };
}

export function formatSummary(summary: Summary): string {
  const lines = [
    `traces ${summary.n} passed ${summary.passed}`,
    summary.okToReportMeans
      ? `means prompt=${summary.meanPromptTokens} completion=${summary.meanCompletionTokens} turns=${summary.meanTurns} (${summary.reason})`
      : `no means: ${summary.reason}`,
    "README must not cite these figures until a tagged bench-vX with N ≥ 3",
  ];
  return `${lines.join("\n")}\n`;
}
