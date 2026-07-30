// The Arbiter gate. Nothing is persisted — the composer shows the ruling, and a
// separate POST /motion actually creates the debate.
// Spec: game-theory.md §3, §16

import type { Request, Response } from "express";
import { llmJson } from "../ai/llm.js";
import { ARBITER_SYSTEM_PROMPT } from "../ai/prompts/arbiter.prompt.js";
import { checkText } from "../lib/validate.js";

export async function checkEligibleMotion(req: Request, res: Response) {
	const content = checkText(req.body?.content, { field: "content", max: 1000 });
	if (!content.ok) return res.status(400).json({ error: content.reason });
	const domain = checkText(req.body?.domain, { field: "domain", max: 100 });
	if (!domain.ok) return res.status(400).json({ error: domain.reason });

	const userPrompt = `MOTION: "${content.value}"
DOMAIN: "${domain.value}"`;

	try {
		const parsed = await llmJson({
			system: ARBITER_SYSTEM_PROMPT,
			user: userPrompt,
			maxTokens: 2000,
		});

		res.status(200).json({
			eligibility: parsed.eligibility,
			improved: parsed.improved,
			feedback: parsed.feedback,
			keyword: parsed.keyword,
			domain: parsed.domain,
		});
	} catch (err) {
		console.error(err);
		res.status(502).json({ error: "arbiter_unavailable" });
	}
}
