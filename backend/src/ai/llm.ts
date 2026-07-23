import { jsonrepair } from "jsonrepair";
import config from "../config/index.js";

const { base_url: BASE_URL, api_key: API_KEY, model: MODEL } = config.llm;

// OpenRouter's shape: `{ enabled: false }` suppresses thinking entirely,
// `{ effort }` picks a budget. Anything else and we send no field at all,
// leaving the model on its own default.
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

async function callOnce(opts: Required<LlmOpts>): Promise<string> {
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
  return data.choices[0].message.content;
}

export async function llmJson<T = any>(opts: LlmOpts): Promise<T> {
  const filled: Required<LlmOpts> = {
    system: opts.system,
    user: opts.user,
    temperature: opts.temperature ?? config.llm.temperature,
    // Keep this ceiling generous. If LLM_REASONING is turned back on, thinking
    // tokens count toward max_tokens and vary a lot, so a tight value returns
    // truncated, invalid JSON rather than a clean error.
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
