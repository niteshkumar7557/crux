import { jsonrepair } from "jsonrepair";
import config from "../config/index.js";

const { base_url: BASE_URL, api_key: API_KEY } = config.llm;
const MODEL_SMART = config.llm.model_smart;
const MODEL_FAST = config.llm.model_fast;

type LlmOpts = {
  system: string;
  user: string;
  model?: "smart" | "fast";
  temperature?: number;
  maxTokens?: number;
};

async function callOnce(opts: Required<LlmOpts>): Promise<string> {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: opts.model === "fast" ? MODEL_FAST : MODEL_SMART,
      temperature: opts.temperature,
      max_tokens: opts.maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
    }),
    signal: AbortSignal.timeout(config.llm.timeout_ms),
  });

  if (!res.ok) throw new Error(`LLM error: ${res.status} ${await res.text()}`);

  const data = (await res.json()) as any;
  return data.choices[0].message.content;
}

export async function llmJson<T = any>(opts: LlmOpts): Promise<T> {
  const filled: Required<LlmOpts> = {
    system: opts.system,
    user: opts.user,
    model: opts.model ?? "smart",
    temperature: opts.temperature ?? config.llm.temperature,
    // The default "smart" model (gpt-oss-120b) is a reasoning model: reasoning
    // tokens count toward max_tokens and vary a lot (~200-1400), so the ceiling
    // must be generous or JSON mode returns a truncated, invalid body (HTTP 400).
    maxTokens: opts.maxTokens ?? config.llm.max_tokens,
  };

  let lastErr: unknown;
  for (let attempt = 0; attempt <= config.llm.retries; attempt++) {
    try {
      const raw = await callOnce(filled);
      return JSON.parse(jsonrepair(raw)) as T;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}
