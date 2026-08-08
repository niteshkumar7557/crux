import { describe, expect, it } from "vitest";
import config from "../../src/config/index.js";
import { callJson, videoJudgeLlm } from "./provider.js";

const request = {
  system: "SENTINEL_SYSTEM_PROMPT",
  user: "SENTINEL_USER_BODY",
  maxTokens: 321,
};

const llm = {
  base_url: "https://SENTINEL_ENDPOINT.invalid/v1",
  api_key: "SENTINEL_API_KEY",
  model: "SENTINEL_MODEL",
  timeout_ms: 1_000,
  temperature: 0.2,
};

describe("videoJudgeLlm", () => {
  it("judges on the video-judge model rather than the shared Crux model", () => {
    expect(videoJudgeLlm.model).toBe(config.llm.video_judge_model);
  });

  it("takes every other setting from the shared llm config", () => {
    expect(videoJudgeLlm).toMatchObject({
      base_url: config.llm.base_url,
      timeout_ms: config.llm.timeout_ms,
      temperature: config.llm.temperature,
    });
    // Compared as a boolean on purpose: a failing toBe would print the real key.
    expect(videoJudgeLlm.api_key === config.llm.api_key).toBe(true);
  });
});

describe("callJson request body", () => {
  it("sends the injected model and keeps reasoning disabled", async () => {
    let sent: unknown = null;
    const capturingFetch = (async (_input: unknown, init: { body: string }) => {
      sent = JSON.parse(init.body);
      return new Response(JSON.stringify({ choices: [{ message: { content: "{}" } }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;

    await callJson(request, { llm, fetch: capturingFetch });

    expect(sent).toMatchObject({
      model: "SENTINEL_MODEL",
      max_tokens: 321,
      response_format: { type: "json_object" },
      reasoning: { enabled: false },
    });
  });
});

describe("callJson provider failures", () => {
  it("does not expose an untrusted HTTP error body or request configuration", async () => {
    const body = "SENTINEL_API_KEY SENTINEL_ENDPOINT SENTINEL_MODEL Authorization SENTINEL_SYSTEM_PROMPT SENTINEL_USER_BODY";
    const error = await providerError(new Response(body, { status: 503 }));

    expect(error).toMatchObject({
      code: "provider_http_error",
      status: 503,
      message: "Video judge provider request failed (status 503).",
    });
    expect(JSON.stringify(error)).not.toMatch(/SENTINEL|Authorization/);
  });

  it("does not expose a transport exception", async () => {
    const error = await providerError(async () => {
      throw new Error("SENTINEL_API_KEY SENTINEL_ENDPOINT Authorization");
    });

    expect(error).toMatchObject({
      code: "provider_transport_error",
      message: "Video judge provider request failed.",
    });
    expect(JSON.stringify(error)).not.toMatch(/SENTINEL|Authorization/);
  });

  it("does not expose malformed response-envelope JSON", async () => {
    const error = await providerError(new Response("SENTINEL_NOT_JSON", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));

    expect(error).toMatchObject({
      code: "provider_invalid_response",
      message: "Video judge provider returned an invalid response envelope.",
    });
    expect(JSON.stringify(error)).not.toContain("SENTINEL_NOT_JSON");
  });

  it("does not expose metadata from a response missing content", async () => {
    const error = await providerError(new Response(JSON.stringify({
      choices: [{ message: { refusal: "SENTINEL_API_KEY Authorization" } }],
      model: "SENTINEL_MODEL",
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));

    expect(error).toMatchObject({
      code: "provider_missing_content",
      message: "Video judge provider response did not contain JSON content.",
    });
    expect(JSON.stringify(error)).not.toMatch(/SENTINEL|Authorization/);
  });
});

async function providerError(response: Response | (() => Promise<Response>)): Promise<unknown> {
  const injectedFetch = typeof response === "function" ? response : async () => response;
  try {
    await callJson(request, { llm, fetch: injectedFetch as typeof fetch });
  } catch (error) {
    return error;
  }
  throw new Error("Expected the provider call to fail.");
}
