// The only outbound LLM client: one OpenAI-compatible /chat/completions call, JSON
// mode, repaired and parsed, retried LLM_RETRIES times. A failing call therefore
// bills twice — the budget is deliberately tight, because the whole chain
// (server → the client's own deadline → Cloudflare at ~100s) has to fit inside
// 100 seconds. A longer retry budget means a post that commits after the
// composer has already given up on it.
//
// Reasoning is off for all five personas: thinking tokens bill as output AND
// count against max_tokens, so leaving it on truncates the shorter calls into
// invalid JSON — and on the argument judge it cost seconds a user waits through
// with the composer locked. The per-call override below is the escape hatch and
// is currently unused; what replaces thinking is decode-first prompting.
// Spec: game-theory.md §16

import { jsonrepair } from "jsonrepair";
import config from "../config/index.js";
import logger from "../lib/logger.js";

const { base_url: BASE_URL, api_key: API_KEY, model: MODEL } = config.llm;

type ReasoningLevel = "off" | "high" | "xhigh";

function resolveReasoning(level: ReasoningLevel | undefined) {
  const l = level ?? config.llm.reasoning;
  if (l === "off") return { enabled: false };
  if (l === "high" || l === "xhigh") return { effort: l };
  return undefined;
}

type LlmOpts = {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  reasoning?: ReasoningLevel;
};

type FilledOpts = LlmOpts & { temperature: number; maxTokens: number };

async function callOnce(opts: FilledOpts): Promise<{
  content: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number } | undefined;
}> {
  const reasoning = resolveReasoning(opts.reasoning);

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
      ...(reasoning ? { reasoning } : {}),
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
  const filled: FilledOpts = {
    system: opts.system,
    user: opts.user,
    temperature: opts.temperature ?? config.llm.temperature,
    maxTokens: opts.maxTokens ?? config.llm.max_tokens,
    ...(opts.reasoning ? { reasoning: opts.reasoning } : {}),
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
