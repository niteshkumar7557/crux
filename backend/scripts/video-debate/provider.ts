// Calls the workstation's OpenAI-compatible model and preserves its raw JSON response.

import { jsonrepair } from "jsonrepair";
import config from "../../src/config/index.js";
import type { JudgmentCallResponse, TokenUsage } from "../../src/video-debates/judgment.logic.js";

type UnknownRecord = Record<string, unknown>;

export type JsonRequest = {
  system: string;
  user: string;
  maxTokens: number;
};

type ProviderErrorCode =
  | "provider_unconfigured"
  | "provider_transport_error"
  | "provider_http_error"
  | "provider_invalid_response"
  | "provider_missing_content";

type ProviderLlmConfig = Pick<
  typeof config.llm,
  "base_url" | "api_key" | "model" | "timeout_ms" | "temperature"
>;

export type ProviderPorts = {
  llm: ProviderLlmConfig;
  fetch: typeof fetch;
};

export class VideoJudgeProviderError extends Error {
  readonly status: number | undefined;

  constructor(readonly code: ProviderErrorCode, message: string, status?: number) {
    super(message);
    this.name = "VideoJudgeProviderError";
    this.status = status;
  }
}

function object(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : null;
}

function tokenCount(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

function tokenUsage(value: unknown): TokenUsage | undefined {
  const usage = object(value);
  if (!usage) return undefined;
  const prompt_tokens = tokenCount(usage.prompt_tokens);
  const completion_tokens = tokenCount(usage.completion_tokens);
  const total_tokens = tokenCount(usage.total_tokens);
  if (prompt_tokens === undefined && completion_tokens === undefined && total_tokens === undefined) return undefined;
  return {
    ...(prompt_tokens === undefined ? {} : { prompt_tokens }),
    ...(completion_tokens === undefined ? {} : { completion_tokens }),
    ...(total_tokens === undefined ? {} : { total_tokens }),
  };
}

const systemPorts: ProviderPorts = {
  llm: config.llm,
  fetch: (input, init) => globalThis.fetch(input, init),
};

export async function callJson(
  request: JsonRequest,
  ports: ProviderPorts = systemPorts,
): Promise<JudgmentCallResponse> {
  const llm = ports.llm;
  if (!llm.api_key) throw new VideoJudgeProviderError("provider_unconfigured", "Video judge provider is not configured.");
  let response: Response;
  try {
    response = await ports.fetch(`${llm.base_url}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${llm.api_key}`,
      },
      body: JSON.stringify({
        model: llm.model,
        temperature: llm.temperature,
        max_tokens: request.maxTokens,
        response_format: { type: "json_object" },
        reasoning: { enabled: false },
        messages: [
          { role: "system", content: request.system },
          { role: "user", content: request.user },
        ],
      }),
      signal: AbortSignal.timeout(llm.timeout_ms),
    });
  } catch {
    throw new VideoJudgeProviderError("provider_transport_error", "Video judge provider request failed.");
  }
  if (!response.ok) {
    throw new VideoJudgeProviderError(
      "provider_http_error",
      `Video judge provider request failed (status ${response.status}).`,
      response.status,
    );
  }

  let document: unknown;
  try {
    document = await response.json();
  } catch {
    throw new VideoJudgeProviderError("provider_invalid_response", "Video judge provider returned an invalid response envelope.");
  }
  const root = object(document);
  const choices = root && Array.isArray(root.choices) ? root.choices : null;
  const choice = choices?.length === 1 ? object(choices[0]) : null;
  const message = choice ? object(choice.message) : null;
  const raw = message?.content;
  if (typeof raw !== "string") {
    throw new VideoJudgeProviderError("provider_missing_content", "Video judge provider response did not contain JSON content.");
  }

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(jsonrepair(raw));
  } catch {
    // The raw response remains available to the runner's validation log.
  }
  const usage = tokenUsage(root?.usage);
  return { raw, parsed, ...(usage ? { usage } : {}) };
}
