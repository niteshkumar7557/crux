import { expect, it } from "vitest";
import app from "./app.js";

async function postAdminJson(body: string): Promise<Response> {
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind TCP.");
    return await fetch(`http://127.0.0.1:${address.port}/admin/video-debates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

async function getJson(path: string, headers: Record<string, string> = {}): Promise<Response> {
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind TCP.");
    return await fetch(`http://127.0.0.1:${address.port}${path}`, { headers });
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

it("the programme archive is refused without a pass and admits one that is valid", async () => {
  const refused = await getJson("/video-debates");
  expect(refused.status).toBe(401);
  await expect(refused.json()).resolves.toEqual({ error: "video_pass_required" });

  const { issueVideoPass, VIDEO_PASS_COOKIE } = await import("./video-debates/access.logic.js");
  const config = (await import("./config/index.js")).default;
  if (!config.jwt_secret) return;
  const admitted = await getJson("/video-debates", {
    cookie: `${VIDEO_PASS_COOKIE}=${issueVideoPass(config.jwt_secret)}`,
  });
  expect(admitted.status).not.toBe(401);
});

it("the one-megabyte JSON ceiling reaches auth for valid bodies and rejects oversized bodies first", async () => {
  const validSized = await postAdminJson(JSON.stringify({ padding: "x".repeat(200_000) }));
  const oversized = await postAdminJson(JSON.stringify({ padding: "x".repeat(1_050_000) }));

  expect(validSized.status).toBe(401);
  await expect(validSized.json()).resolves.toEqual({ error: "no token provided" });
  expect(oversized.status).toBe(413);
});
