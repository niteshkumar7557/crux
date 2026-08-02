// The Arbiter gate. Nothing is persisted — the composer shows the ruling, and a
// separate POST /motion actually creates the debate.
// Spec: game-theory.md §3, §16

import type { Request, Response } from "express";
import pool from "../db/index.js";
import { llmJson } from "../ai/llm.js";
import { ARBITER_SYSTEM_PROMPT } from "../ai/prompts/arbiter.prompt.js";
import { checkText } from "../lib/validate.js";
import { normaliseArgument } from "../lib/duplicate.logic.js";
import {
	findSimilar,
	fingerprintOf,
	resolveDuplicateOf,
	MOTION_SHORTLIST_SIZE,
	MOTION_SHORTLIST_FLOOR,
} from "../lib/similarity.logic.js";

export async function checkEligibleMotion(req: Request, res: Response) {
	const content = checkText(req.body?.content, { field: "content", max: 1000 });
	if (!content.ok) return res.status(400).json({ error: content.reason });
	const domain = checkText(req.body?.domain, { field: "domain", max: 100 });
	if (!domain.ok) return res.status(400).json({ error: domain.reason });

	// §3: the exploit — a verbatim repost — must never reach the Arbiter LLM
	// call, so this runs before it, mirroring the same check in
	// motion.controller.ts's addNewMotion (the actual persist path).
	const normalisedContent = normaliseArgument(content.value);
	const existingDupe = await pool.query(
		`SELECT id, status FROM motions WHERE normalised_content = $1`,
		[normalisedContent],
	);
	if (existingDupe.rows.length > 0) {
		return res.status(409).json({
			reason: "duplicate_motion",
			motionId: existingDupe.rows[0].id,
			status: existingDupe.rows[0].status,
		});
	}

	// §3, stage one (free): shortlist LIVE motions by trigram similarity — the
	// live population is naturally small (debates die at 48h), so a single
	// query and an in-memory scan is enough; no index, no vector store.
	const { rows: liveMotions } = await pool.query(
		`SELECT id, content FROM motions WHERE status = 'live'`,
	);
	const shortlist = findSimilar(
		fingerprintOf(content.value),
		liveMotions.map((m) => ({ item: m, fingerprint: fingerprintOf(m.content) })),
		{ limit: MOTION_SHORTLIST_SIZE, floor: MOTION_SHORTLIST_FLOOR },
	);

	// §3, stage two (free): the shortlist rides the SAME Arbiter call that
	// already runs — one extra field, at most 5 short sentences added to the
	// prompt. If the shortlist is empty, omit the block entirely rather than
	// sending an empty list, which invites the model to invent a match.
	const liveMotionsBlock =
		shortlist.length > 0
			? `\nLIVE MOTIONS:\n${shortlist.map((s) => `[#${s.item.id}] ${s.item.content}`).join("\n")}`
			: "";

	const userPrompt = `MOTION: "${content.value}"
DOMAIN: "${domain.value}"${liveMotionsBlock}`;

	try {
		const parsed = await llmJson({
			system: ARBITER_SYSTEM_PROMPT,
			user: userPrompt,
			maxTokens: 2000,
		});

		const shortlistIds = shortlist.map((s) => s.item.id);
		const duplicateOf = resolveDuplicateOf(parsed.duplicate_of, shortlistIds);

		if (duplicateOf !== null) {
			const match = shortlist.find((s) => s.item.id === duplicateOf)!;
			return res.status(409).json({
				reason: "similar_motion",
				motionId: duplicateOf,
				content: match.item.content,
			});
		}

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
