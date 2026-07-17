import pool from "./index.js";
import {
	insertBaseData,
	USERS,
	FOR_COMMENTS,
	AGAINST_COMMENTS,
} from "./seed-data.js";

// Stress seeder — base data plus millions of generated rows for testing
// database queries under load. Wipes and refills users, arguments, comments.
//
// Phase 1 (unique):  30 real users + 30 real statements (seed-data.ts).
// Phase 2 (stress):  10,000 duplicate users and 1,000,000 duplicate statements
//                    via generate_series. Each duplicate clones base row
//                    ((i - 1) % 30) + 1 and gets a random 8-char hex keyword
//                    (e.g. "a1b2c3d4") attached:
//                      username: a1b2c3d4_vector_shif          (hex + 11 chars, fits VARCHAR(20))
//                      email:    a1b2c3d4_vector_shift@example.com
//                      content:  a1b2c3d4 AI should be granted legal personhood.
//                    Then EVERY statement gets 0–12 comments (count, side, text,
//                    commenter, likes, timestamp all random) — ~6M comments total.
//
// Scale via env vars (defaults below), e.g. for a 10M-statement run:
//   SEED_STATEMENTS=10000000 npm run db:seed:stress
// Inserts run in batches of SEED_BATCH rows so big runs log progress as they go.
//
// For a small, realistic dataset (feature development) run seed-dev.ts instead:
//   npm run db:seed:dev

const intEnv = (name: string, fallback: number): number => {
	const raw = process.env[name];
	if (raw === undefined || raw === "") return fallback;
	const n = Number(raw);
	if (!Number.isInteger(n) || n < 0) {
		throw new Error(`${name} must be a non-negative integer, got "${raw}"`);
	}
	return n;
};

const DUP_USERS = intEnv("SEED_USERS", 10_000);
const DUP_STATEMENTS = intEnv("SEED_STATEMENTS", 1_000_000);
const MAX_COMMENTS_PER_STATEMENT = intEnv("SEED_MAX_COMMENTS", 12); // 0..N, uniform → ~N/2 avg
const BATCH_SIZE = Math.max(1, intEnv("SEED_BATCH", 1_000_000));

// ============================================================
// Phase 2 — stress SQL (pure Postgres, generate_series loops)
// ============================================================
const U = USERS.length; // 30 base rows for both users and arguments

// Duplicate users: clone base user ((i - 1) % 30) + 1 with a random hex keyword.
// username is VARCHAR(20), so hex (8) + "_" + first 11 chars of the base username.
// ON CONFLICT DO NOTHING absorbs the astronomically rare hex collision.
const STRESS_USERS_SQL = `
	INSERT INTO users (name, username, email, hashed_password, role, logic_score, description, avatar)
	SELECT
		b.name,
		k.hex || '_' || substr(b.username, 1, 11),
		k.hex || '_' || b.username || '@example.com',
		$1,
		'user',
		floor(random() * 251)::int,
		b.description,
		b.avatar
	FROM generate_series(1, $2::int) AS gs(i)
	JOIN users b ON b.id = (gs.i - 1) % ${U} + 1
	-- gs.i correlates the subquery: without it the planner caches one hex for all rows
	CROSS JOIN LATERAL (SELECT substr(md5(gs.i || random()::text), 1, 8) AS hex) k
	ON CONFLICT DO NOTHING;
`;

// Duplicate statements: hex keyword prepended to content, random author from the
// full user pool, re-randomized vote split (15–85) and created_at (last 45 days).
const STRESS_STATEMENTS_SQL = `
	WITH uids AS (SELECT array_agg(id) AS ids, count(*)::int AS n FROM users)
	INSERT INTO arguments (user_id, content, content_keyword, domain_id, for_analysis, against_analysis, affirmative, negative, created_at)
	SELECT
		u.ids[floor(random() * u.n)::int + 1],
		k.hex || ' ' || b.content,
		b.content_keyword,
		b.domain_id,
		b.for_analysis,
		b.against_analysis,
		k.aff,
		100 - k.aff,
		now() - random() * interval '45 days'
	FROM generate_series($1::int, $2::int) AS gs(i)
	JOIN arguments b ON b.id = (gs.i - 1) % ${U} + 1
	CROSS JOIN uids u
	-- gs.i correlates the subquery: without it the planner caches one value for all rows
	CROSS JOIN LATERAL (
		SELECT
			substr(md5(gs.i || random()::text), 1, 8) AS hex,
			(15 + floor(random() * 71))::int AS aff
	) k;
`;

// Comments: EVERY statement gets a random number of comments (0–12), each with a
// random side, random text from the matching pool ($1 for / $2 against), random
// commenter, random likes, posted 1–96h after the statement.
const STRESS_COMMENTS_SQL = `
	WITH uids AS (SELECT array_agg(id) AS ids, count(*)::int AS n FROM users)
	INSERT INTO comments (user_id, argument_id, side, content, likes, created_at)
	SELECT
		u.ids[floor(random() * u.n)::int + 1],
		a.id,
		CASE WHEN r.is_for THEN 'for' ELSE 'against' END,
		r.hex || ' ' || CASE WHEN r.is_for
			THEN ($1::text[])[floor(random() * ${FOR_COMMENTS.length})::int + 1]
			ELSE ($2::text[])[floor(random() * ${AGAINST_COMMENTS.length})::int + 1]
		END,
		floor(random() * 41)::int,
		least(a.created_at + (1 + floor(random() * 96)) * interval '1 hour', now())
	FROM arguments a
	CROSS JOIN uids u
	-- a.id correlates generate_series so the comment count is re-rolled per statement
	CROSS JOIN LATERAL generate_series(
		1, (a.id * 0 + floor(random() * ${MAX_COMMENTS_PER_STATEMENT + 1}))::int
	) AS g(j)
	-- g.j correlates the subquery: without it the planner caches one value for all rows
	CROSS JOIN LATERAL (
		SELECT
			random() < 0.5 AS is_for,
			substr(md5(g.j || random()::text), 1, 8) AS hex
	) r
	WHERE a.id BETWEEN $3::int AND $4::int;
`;

const seed = async () => {
	const client = await pool.connect();

	try {
		await client.query("BEGIN");

		// ============================================================
		// Phase 1 — 30 unique users + 30 unique statements
		// ============================================================
		const { hashedPassword } = await insertBaseData(client);

		// ============================================================
		// Phase 2 — stress data via generate_series
		// ============================================================
		let t = Date.now();
		const dupUsers = await client.query(STRESS_USERS_SQL, [
			hashedPassword,
			DUP_USERS,
		]);
		console.log(
			`⚡ Stress: +${dupUsers.rowCount} duplicate users (${Date.now() - t}ms)`,
		);

		t = Date.now();
		let argCount = 0;
		for (let lo = 1; lo <= DUP_STATEMENTS; lo += BATCH_SIZE) {
			const hi = Math.min(lo + BATCH_SIZE - 1, DUP_STATEMENTS);
			const batch = await client.query(STRESS_STATEMENTS_SQL, [lo, hi]);
			argCount += batch.rowCount ?? 0;
			console.log(
				`⚡ Stress: duplicate statements ${argCount.toLocaleString()}/${DUP_STATEMENTS.toLocaleString()} (${Date.now() - t}ms)`,
			);
		}

		t = Date.now();
		let commentCount = 0;
		const totalStatements = U + DUP_STATEMENTS;
		for (let lo = 1; lo <= totalStatements; lo += BATCH_SIZE) {
			const hi = Math.min(lo + BATCH_SIZE - 1, totalStatements);
			const batch = await client.query(STRESS_COMMENTS_SQL, [
				FOR_COMMENTS,
				AGAINST_COMMENTS,
				lo,
				hi,
			]);
			commentCount += batch.rowCount ?? 0;
			console.log(
				`⚡ Stress: randomized comments ${commentCount.toLocaleString()} (statements ${Math.min(hi, totalStatements).toLocaleString()}/${totalStatements.toLocaleString()} covered, ${Date.now() - t}ms)`,
			);
		}

		await client.query("COMMIT");
		console.log(
			'🎉 Stress seeding complete! (every user\'s password is "secret")',
		);
	} catch (err) {
		await client.query("ROLLBACK");
		console.error("❌ Seeding failed, rolled back:", err);
		process.exit(1);
	} finally {
		client.release();
		await pool.end();
	}
};

seed();
