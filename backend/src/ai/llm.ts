// The only outbound LLM client: one OpenAI-compatible /chat/completions call, JSON
// mode, repaired and parsed, retried LLM_RETRIES times. A failing call therefore
// bills up to three times.
// Spec: game-theory.md §16

import { jsonrepair } from "jsonrepair";
import config from "../config/index.js";
import logger from "../lib/logger.js";

const { base_url: BASE_URL, api_key: API_KEY, model: MODEL } = config.llm;

const REASONING =
  config.llm.reasoning === "off"
    ? { enabled: false }
    : config.llm.reasoning === "high" || config.llm.reasoning === "xhigh"
      ? { effort: config.llm.reasoning }
      : undefined;

type LlmOpts = {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
};

async function callOnce(opts: Required<LlmOpts>): Promise<{
  content: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number } | undefined;
}> {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: opts.temperature,
      max_tokens: opts.maxTokens,
      response_format: { type: "json_object" },
      ...(REASONING ? { reasoning: REASONING } : {}),
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
    }),
    signal: AbortSignal.timeout(config.llm.timeout_ms),
  });

  if (!res.ok) throw new Error(`LLM error: ${res.status} ${await res.text()}`);

  const data = (await res.json()) as any;
  return {
    content: data.choices[0].message.content as string,
    usage: data.usage as
      | { prompt_tokens?: number; completion_tokens?: number }
      | undefined,
  };
}

export async function llmJson<T = any>(opts: LlmOpts): Promise<T> {
  const filled: Required<LlmOpts> = {
    system: opts.system,
    user: opts.user,
    temperature: opts.temperature ?? config.llm.temperature,
    maxTokens: opts.maxTokens ?? config.llm.max_tokens,
  };

  let lastErr: unknown;
  for (let attempt = 0; attempt <= config.llm.retries; attempt++) {
    const t0 = Date.now();
    try {
      const { content, usage } = await callOnce(filled);
      logger.info(
        {
          ms: Date.now() - t0,
          model: MODEL,
          prompt_tokens: usage?.prompt_tokens,
          completion_tokens: usage?.completion_tokens,
          attempt,
        },
        "llm call",
      );
      return JSON.parse(jsonrepair(content)) as T;
    } catch (err) {
      logger.warn(
        { ms: Date.now() - t0, attempt, err: String(err) },
        "llm attempt failed",
      );
      lastErr = err;
    }
  }
  throw lastErr;
}
