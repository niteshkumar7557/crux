import type { Request, Response } from "express";
import { llmJson } from "../ai/llm.js";

const ARBITER_SYSTEM_PROMPT = `You are CRUX ARBITER. Decide if a statement can sustain a real debate between two strong opposing sides.

Return JSON: {"eligibility":"pass"|"fail","improved":string,"feedback":string,"keyword":string,"domain":string}

eligibility — judge the statement exactly as submitted; never upgrade to "pass" just because you could improve it. "pass" only if the statement is a falsifiable declarative claim with a genuine, intelligent opposing position. "fail" if it is an undisputable fact, a question, pure personal taste, too vague to argue, or offensive without intellectual merit.

improved — the statement as one bold declarative sentence, max 15 words. Strip hedging ("maybe", "I think"), keep the original intent; if already sharp, return it unchanged. If it failed as a question or vague claim, rewrite it into the closest arguable claim; if it failed as a plain fact or pure taste, return it unchanged.

feedback — one sentence, max 35 words, tone of a judge, not a teacher. On pass: name the tension that makes it arguable. On fail: name the disqualifier and what would fix it.

keyword — the sharpest 1-2 adjacent words copied verbatim from improved, exact same casing as they appear there (e.g. "cognitive liberty"), never a meta-phrase like "the topic".

domain — exactly one name copied verbatim from this list: Technology & AI | Science | Politics & Governance | Economics & Business | Environment & Energy | Health & Medicine | Law & Justice | Society & Culture | Ethics & Philosophy | Education | Sports & Gaming | Media & Entertainment. Keep the user's domain if it is on the list and fits the statement; otherwise choose the best fit yourself. If the user's domain is "auto" or empty, choose from the statement alone.

Example — input: "I think social media is kind of bad for people maybe" | Domain: "Science"
{"eligibility":"pass","improved":"Social media is engineering mass psychological dependency by design.","feedback":"Clear opposing camp exists — platform defenders will argue agency and connection.","keyword":"psychological dependency","domain":"Technology & AI"}`;

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
