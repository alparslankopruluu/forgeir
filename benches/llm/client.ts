export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type Completion = {
  text: string;
  promptTokens: number;
  completionTokens: number;
  estimated: boolean;
};

export type BenchConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

export type CompleteFn = (messages: ChatMessage[]) => Promise<Completion>;

export function loadConfig(
  env: NodeJS.ProcessEnv = process.env,
): BenchConfig | null {
  const apiKey = env.FORGEIR_BENCH_API_KEY ?? env.OPENAI_API_KEY;
  const model = env.FORGEIR_BENCH_MODEL;
  if (!apiKey || !model) {
    return null;
  }
  return {
    apiKey,
    baseUrl: (
      env.FORGEIR_BENCH_BASE_URL ?? "https://api.openai.com/v1"
    ).replace(/\/$/, ""),
    model,
  };
}

export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export async function completeOpenAI(
  messages: ChatMessage[],
  config: BenchConfig,
  fetchFn: typeof fetch = fetch,
): Promise<Completion> {
  const res = await fetchFn(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`chat completions ${res.status}: ${body}`);
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const text = json.choices?.[0]?.message?.content ?? "";
  const prompt = json.usage?.prompt_tokens;
  const completion = json.usage?.completion_tokens;
  if (typeof prompt === "number" && typeof completion === "number") {
    return {
      text,
      promptTokens: prompt,
      completionTokens: completion,
      estimated: false,
    };
  }
  const joined = messages.map((m) => m.content).join("\n");
  return {
    text,
    promptTokens: estimateTokens(joined),
    completionTokens: estimateTokens(text),
    estimated: true,
  };
}
