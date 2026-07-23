import type { Request, Response } from "express";
import { llmJson } from "../ai/llm.js";
import { ARBITER_SYSTEM_PROMPT } from "../ai/prompts/arbiter.prompt.js";

export async function checkEligibleStatement(req: Request, res: Response) {
	const { content, domain } = req.body;

	const userPrompt = `STATEMENT: "${content}"
DOMAIN: "${domain}"`;

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
