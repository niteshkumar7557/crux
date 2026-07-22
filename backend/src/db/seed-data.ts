import bcrypt from "bcrypt";
import type { PoolClient } from "pg";
import { listPresets } from "../lib/avatars.js";
import config from "../config/index.js";

// Shared base dataset for both seeders:
//   seed-dev.ts    — small, realistic data for feature development
//   seed-stress.ts — base data + millions of generated rows for query stress tests
//
// insertBaseData() wipes the tables and inserts the 30 real users + 30 real
// statements. Every account logs in with the password "secret".
// Refresh tokens are NOT seeded — they're created on login/register.

export const randInt = (min: number, max: number) =>
	Math.floor(Math.random() * (max - min + 1)) + min;
export const pick = <T>(arr: T[]): T => arr[randInt(0, arr.length - 1)]!;
export const sample = <T>(arr: T[], n: number): T[] =>
	[...arr].sort(() => Math.random() - 0.5).slice(0, n);

// ============================================================
// USERS — [name, username, logicScore, description]
// (first entry is the admin; scores spread across every tier B → M)
// ============================================================
type SeedUser = [string, string, number, string];
export const USERS: SeedUser[] = [
	["Nitesh Kumar", "nitesh_dev", 245, "Founder of the arena. Argues with receipts."],
	["Vector Shift", "vector_shift", 182, "Systems thinker. Allergic to unfalsifiable claims."],
	["Logic Lord", "logic_lord", 158, "If it doesn't follow, I will say so."],
	["Debater X", "debater_x", 141, "Steelman first, strike second."],
	["Tara Voss", "tara_voss", 133, "Argues in good faith, wins anyway."],
	["Alex Carter", "alex_prime", 126, "Economist by day, contrarian by night."],
	["Nova Singh", "nova_thinker", 112, "Here for the ideas, not the applause."],
	["Hugo Reyes", "hugo_rebuts", 104, "Your premise called. It wants a source."],
	["Iron Wallace", "iron_clause", 97, "Reads the footnotes so you don't have to."],
	["Ada Novak", "ada_novak", 88, "Statistician. Suspicious of round numbers."],
	["Pete Paradox", "paradox_pete", 84, "Both sides are wrong. Ask me how."],
	["Sam Okafor", "sam_okafor", 76, "Engineer. Argues in failure modes."],
	["Zara Khan", "zara_argues", 71, "Policy nerd with a soft spot for hard data."],
	["Ivy Chen", "ivy_chen", 64, "Changes her mind in public. On purpose."],
	["Baron Byte", "byte_baron", 58, "Ships code, breaks arguments."],
	["Maya Ortiz", "maya_reasons", 52, "Slow to post, hard to refute."],
	["Leo Brandt", "leo_brandt", 48, "Collects bad analogies as a hobby."],
	["Felix Grant", "felix_counter", 44, "Professional devil's advocate."],
	["Priya Anand", "priya_logic", 39, "Biologist. Citations or it didn't happen."],
	["Nina Petrov", "nina_petrov", 36, "Will read your source before you do."],
	["Omar Farouk", "omar_debates", 31, "Debating since the group chat era."],
	["Lena Weiss", "lena_w", 26, "Asks the question everyone was avoiding."],
	["Tom Hale", "tom_hale", 22, "Here to lose arguments and learn faster."],
	["Kai Tanaka", "kai_rebuts", 19, "Short arguments. Sharp edges."],
	["Sofia Marino", "sofia_says", 14, "New here. Unimpressed by credentials."],
	["Rita Gomez", "rita_gomez", 11, "Lurked for a year. Posting era begins."],
	["David Osei", "osei_thinks", 9, "Testing ideas in public, on purpose."],
	["Emma Lind", "emma_lind", 5, "Reads everything. Posts when it matters."],
	["Yuki Sato", "yuki_sato", 2, "First statement loading…"],
	["Ravi Menon", "ravi_menon", 0, "Post some Statements to get to know about you."],
];

// ============================================================
// STATEMENTS — [author index, claim, keyword, domain, affirmative]
// (negative = 100 - affirmative; analyses and comments are templated below)
// ============================================================
type SeedStatement = [number, string, string, string, number];
export const STATEMENTS: SeedStatement[] = [
	[0, "AI should be granted legal personhood.", "legal personhood", "Technology & AI", 54],
	[1, "Social media does more harm than good to society.", "more harm", "Society & Culture", 62],
	[2, "Universal basic income is necessary for the future of work.", "basic income", "Economics & Business", 48],
	[3, "Space exploration is a waste of resources.", "Space exploration", "Science", 33],
	[4, "Cryptocurrency will replace traditional banking systems.", "Cryptocurrency", "Economics & Business", 41],
	[5, "Climate change action should be prioritized over economic growth.", "prioritized", "Environment & Energy", 68],
	[6, "Artificial intelligence will cause more unemployment than it creates.", "unemployment", "Technology & AI", 57],
	[7, "Social media platforms should be held liable for misinformation.", "misinformation", "Law & Justice", 52],
	[8, "Nuclear energy is the cleanest solution to the global energy crisis.", "cleanest solution", "Environment & Energy", 71],
	[9, "Governments should regulate big tech companies like public utilities.", "big tech companies", "Politics & Governance", 46],
	[10, "Standardized exams fail to measure real intelligence.", "real intelligence", "Education", 61],
	[11, "Junk food should be taxed like tobacco.", "taxed", "Health & Medicine", 54],
	[12, "Mass surveillance is never justified, even for national security.", "Mass surveillance", "Law & Justice", 57],
	[13, "Streaming has made music worse.", "Streaming", "Society & Culture", 44],
	[14, "University degrees are becoming obsolete.", "University degrees", "Education", 39],
	[15, "Esports deserve the same recognition as traditional sports.", "Esports", "Sports & Gaming", 47],
	[16, "Remote work should be the default for knowledge jobs.", "Remote work", "Society & Culture", 63],
	[17, "Gene editing of human embryos should be legal.", "Gene editing", "Science", 41],
	[18, "Open-weight AI models make the world safer, not more dangerous.", "Open-weight", "Technology & AI", 45],
	[19, "Self-driving cars will make roads safer than human drivers ever could.", "Self-driving", "Technology & AI", 66],
	[20, "Encryption backdoors should be illegal, no matter the justification.", "backdoors", "Technology & AI", 72],
	[21, "Targeted advertising should be banned outright.", "Targeted advertising", "Technology & AI", 43],
	[22, "Artificial general intelligence will arrive before 2040.", "general intelligence", "Technology & AI", 38],
	[23, "Brain-computer interfaces will be mainstream consumer tech within twenty years.", "Brain-computer", "Technology & AI", 31],
	[24, "Passwords should be abolished in favor of biometric authentication.", "biometric", "Technology & AI", 58],
	[25, "Learning to code is no longer a safe career bet.", "safe career", "Technology & AI", 49],
	[26, "Peer review is broken beyond repair.", "Peer review", "Science", 42],
	[27, "Animal testing is still scientifically necessary.", "Animal testing", "Science", 55],
	[28, "Aging should be classified and treated as a disease.", "Aging", "Science", 47],
	[29, "The replication crisis has invalidated most of social psychology.", "replication crisis", "Science", 36],
];

// ============================================================
// Templated analyses & comments — dev data, doesn't need to be unique
// ============================================================
const FOR_POINTS = [
	"The empirical evidence consistently supports this position",
	"Early adopters and case studies already demonstrate the claim in practice",
	"The main objections rely on worst-case scenarios, not likely ones",
	"Historical precedent shows similar shifts succeeded",
	"The costs of inaction outweigh the costs of being wrong",
	"Expert consensus has been steadily moving toward this view",
	"The counterarguments conflate short-term friction with long-term outcomes",
];
const AGAINST_POINTS = [
	"The supporting evidence is thinner than advocates admit",
	"Second-order effects would likely cancel out the claimed benefits",
	"The claim generalizes from a few unrepresentative examples",
	"Implementation costs are systematically underestimated",
	"Historical attempts at similar changes have failed quietly",
	"The burden of proof has not been met for a change this large",
	"Real trade-offs are being hidden, not resolved",
];
export const FOR_COMMENTS = [
	"The against side keeps attacking a strawman version of this claim.",
	"Once you separate the hype from the data, the case for this is solid.",
	"Every serious objection here has already been answered upthread.",
	"The precedent already exists — we're just arguing about the label.",
	"Follow the incentives of whoever opposes this and the picture gets clearer.",
	"The burden of proof was met; refusing to update is the real bias.",
];
export const AGAINST_COMMENTS = [
	"Extraordinary claims need extraordinary evidence, and this isn't it.",
	"This confuses a trend with an inevitability.",
	"The for side is pricing in the benefits and ignoring the costs.",
	"One good counterexample breaks this, and there are several.",
	"Sounds compelling until you ask who actually pays for it.",
	"The steelman of the opposing view is stronger than anything argued here.",
];

const analysis = (lead: string, points: string[]) =>
	`${lead}\n\n### Key Points\n${sample(points, 3)
		.map((p) => `- ${p}`)
		.join("\n")}`;

// ============================================================
// Base insert — truncate everything, then seed the 30 real users
// and 30 real statements. Returns what the callers build on:
// the shared bcrypt hash and each statement's created_at.
// ============================================================
export const insertBaseData = async (
	client: PoolClient,
): Promise<{ hashedPassword: string; statementTimes: Date[] }> => {
	const presets = await listPresets();
	if (presets.length === 0) {
		throw new Error("no preset avatars found — cannot assign user avatars");
	}

	// Idempotent: re-running a seed resets the dummy data (and ids)
	await client.query(
		"TRUNCATE users, arguments, comments, refresh_tokens RESTART IDENTITY CASCADE",
	);

	// One shared hash: bcrypt-ing thousands of passwords individually would take minutes
	const hashedPassword = await bcrypt.hash("secret", config.bcrypt_rounds);

	const userValues: unknown[] = [];
	const userRows = USERS.map(([name, username, logicScore, description], i) => {
		userValues.push(
			name,
			username,
			`${username}@example.com`,
			hashedPassword,
			i === 0 ? "admin" : "user",
			logicScore,
			description,
			pick(presets).url,
		);
		const o = i * 8;
		return `($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4}, $${o + 5}, $${o + 6}, $${o + 7}, $${o + 8})`;
	}).join(",\n        ");

	await client.query(
		`
      INSERT INTO users (name, username, email, hashed_password, role, logic_score, description, avatar)
      VALUES
        ${userRows};
      `,
		userValues,
	);
	console.log(`✅ Seeded ${USERS.length} unique users`);

	// Statements staggered over the last ~45 days
	const now = Date.now();
	const HOUR = 60 * 60 * 1000;
	const statementTimes = STATEMENTS.map(
		() => new Date(now - randInt(3, 45 * 24) * HOUR),
	);

	const domainRows = await client.query("SELECT id, name FROM domains");
	const domainIds = new Map<string, number>(
		domainRows.rows.map((r: { id: number; name: string }) => [r.name, r.id]),
	);

	const argValues: unknown[] = [];
	const argRows = STATEMENTS.map(
		([author, content, keyword, domain, affirmative], i) => {
			const domainId = domainIds.get(domain);
			if (!domainId) {
				throw new Error(
					`Unknown seed domain: ${domain} — run migrations first`,
				);
			}
			argValues.push(
				author + 1, // ids are 1-based after TRUNCATE ... RESTART IDENTITY
				content,
				keyword,
				domainId,
				analysis("The case in favor holds up under scrutiny.", FOR_POINTS),
				analysis("The claim does not survive close inspection.", AGAINST_POINTS),
				affirmative,
				100 - affirmative,
				statementTimes[i],
				"live",
			);
			const o = i * 10;
			return `($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4}, $${o + 5}, $${o + 6}, $${o + 7}, $${o + 8}, $${o + 9}, $${o + 10}, NOW() + INTERVAL '48 hours')`;
		},
	).join(",\n        ");

	await client.query(
		`
      INSERT INTO arguments (user_id, content, content_keyword, domain_id, for_analysis, against_analysis, affirmative, negative, created_at, status, closes_at)
      VALUES
        ${argRows};
      `,
		argValues,
	);
	console.log(`✅ Seeded ${STATEMENTS.length} unique statements`);

	return { hashedPassword, statementTimes };
};
