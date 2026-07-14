import type { Response, Request } from "express";
import pool from "../db/index.js";
import { groqGPT, groqLlama } from "../ai/groq.js";
import { jsonrepair } from "jsonrepair";

async function updateDesciption(user_id: number) {
  const { rows } = await pool.query(
    `
            SELECT content
            FROM arguments
            WHERE user_id = $1;
        `,
    [user_id],
  );
  const allPastArguments = rows;

  const systemPrompt = `You are a behavioral analyst for CRUX — a high-stakes intellectual debate arena.

        You will be given a list of argument statements posted by a debater.
        Your job: infer who this person is as a thinker — their intellectual identity, not a summary of their topics.

        RETURN ONLY raw JSON: {"newDescription": "string"}
        No markdown. No explanation.

        RULES:
        - 2 sentences maximum. Hard limit.
        - Do NOT mention any specific argument, topic, or subject they debated.
        - DO infer: how they think, what kind of mind they have, what drives their positions
        - Read between the lines — are they a systems thinker? A moral absolutist? A contrarian? A pragmatist?
        - Write in third person. Present tense.
        - Tone: sharp, editorial, like a profile in a serious magazine
        - It should read like a character description, not a resume

        GOOD EXAMPLE:
        "Operates at the intersection of moral philosophy and structural power, where idealism meets institutional reality. Drawn instinctively to the arguments others refuse to make."

        BAD EXAMPLE:
        "Has debated topics related to AI, economics, and climate policy across multiple sessions."`;

  const userPrompt = `ARGUMENTS POSTED:
        ${allPastArguments.map((r: { content: string }, i: number) => `${i + 1}. "${r.content}"`).join("\n")}

        Analyze the pattern. Write the debater's intellectual identity. Return raw JSON only.`;

  const raw = await groqLlama(systemPrompt, userPrompt);

  const repaired = jsonrepair(raw);
  const parsed = JSON.parse(repaired);

  await pool.query(
    `
            UPDATE users
            SET description = $2
            WHERE id = $1;
        `,
    [user_id, parsed.newDescription],
  );
}

export async function addNewArgument(req: Request, res: Response) {
  const data: {
    user_id: number;
    content: string;
    content_keyword: string;
    domain: string;
    selected_domain?: string;
  } = req.body;

  const domainResult = await pool.query(
    `
        SELECT id, name FROM domains
        WHERE name = $1 OR name = $2
        ORDER BY (name = $1) DESC
        LIMIT 1;
        `,
    [data.domain, data.selected_domain ?? ""],
  );
  if (domainResult.rows.length === 0) {
    return res.status(400).json({ error: "Unknown domain." });
  }
  const { id: domainId, name: domainName } = domainResult.rows[0];

  const systemPrompt = `
            You are an expert debate judge and analyst with deep knowledge across technology, law, economics, science, and policy.

            Given a debate argument and its domain, generate a concise but substantive analysis for both sides.

            Rules:
            - for_analysis: argue strongly IN FAVOUR of the statement — present the best-case reasoning, evidence, and logic that supports it.
            - against_analysis: argue strongly AGAINST the statement — present the strongest counterpoints, risks, and flaws.
            - Each analysis should be 25-40 words: sharp, specific, and grounded — avoid vague generalities.
            - Do not hedge or balance within a single analysis. Each side should be fully committed to its position.
            - Format each analysis in clean Markdown:
            - Start directly with content — no top-level heading
            - One short opening sentence as a plain paragraph
            - Then ### Key Points as a section heading
            - 2-3 bullet points, each a sharp specific reason
            - Output must be raw JSON only — no outer markdown, no backticks, no explanation.
            - The values inside the JSON are Markdown strings — escape newlines as \\n.

            Output format:
            {"for_analysis": "...", "against_analysis": "..."}

            Examples:

            Argument: AI should be granted legal personhood.
            Domain: technology
            {"for_analysis": "Autonomous systems need legal standing to function as independent agents in society.\\n\\n### Key Points\\n- Enables AI to enter contracts and own intellectual property\\n- Creates clear accountability as AI grows more capable\\n- Establishes liability frameworks before systems become uncontrollable", "against_analysis": "AI lacks the consciousness and moral agency that legal personhood was designed to protect.\\n\\n### Key Points\\n- Dilutes rights meant exclusively for humans and living beings\\n- Corporations could exploit AI personhood to evade liability\\n- No ethical basis for rights without genuine autonomy or suffering"}

            Argument: Social media platforms should be held liable for misinformation.
            Domain: law
            {"for_analysis": "Platforms profit from engagement driven by falsehoods while bearing no consequences for the harm caused.\\n\\n### Key Points\\n- Legal liability creates strong incentives for serious content moderation\\n- Platforms already curate content — liability follows editorial control\\n- Victims of misinformation currently have no legal recourse", "against_analysis": "Liability for user-generated content would trigger over-censorship and chill free speech at scale.\\n\\n### Key Points\\n- Conflates platforms with publishers — a legally and functionally false equivalence\\n- Governments could exploit liability laws to suppress dissent\\n- Moderation at scale is technically impossible without mass collateral censorship"}

            Argument: Nuclear energy is the cleanest solution to the global energy crisis.
            Domain: energy
            {"for_analysis": "Nuclear produces near-zero carbon emissions and operates independently of weather or daylight.\\n\\n### Key Points\\n- Smallest land footprint of any major energy source\\n- Modern reactor designs have dramatically reduced safety and waste risks\\n- Only proven baseload power source compatible with full decarbonization", "against_analysis": "Nuclear plants are too expensive and slow to build to address the urgency of the climate crisis.\\n\\n### Key Points\\n- Average construction time exceeds 10 years — renewables scale in months\\n- Waste storage remains an unsolved generational problem\\n- Rare failures like Fukushima carry consequences no other energy source matches"}
        `;

  const userPrompt = `
        Argument: ${data.content}
        Domain: ${domainName}
        `;

  try {
    const aiResponse = await groqGPT(systemPrompt, userPrompt);

    const repaired = jsonrepair(aiResponse);
    const parsed = JSON.parse(repaired);

    const { rows } = await pool.query(
      `
        INSERT INTO arguments (user_id, content_keyword, content, domain_id, for_analysis, against_analysis) VALUES ($1,$2,$3,$4,$5,$6)
        RETURNING id;
        `,
      [
        data.user_id,
        data.content_keyword,
        data.content,
        domainId,
        parsed.for_analysis,
        parsed.against_analysis,
      ],
    );

    await updateDesciption(data.user_id);

    return res
      .status(200)
      .json({ message: `Argument with id: ${rows[0].id} added successfully!` });
  } catch (err) {
    console.error(err);
  }
}

export async function getArgumentById(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      `
                SELECT a.*, d.name AS domain
                FROM arguments a
                JOIN domains d ON d.id = a.domain_id
                WHERE a.id = $1;
            `,
      [id],
    );
    res.status(200).json({
      data: rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error!" });
  }
}
