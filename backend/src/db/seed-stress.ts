import pool from "./index.js";
import {
	insertBaseData,
	USERS,
	FOR_ARGUMENTS,
	AGAINST_ARGUMENTS,
} from "./seed-data.js";

// Stress seeder — base data plus millions of generated rows for testing
// database queries under load. Wipes and refills users, motions, arguments.
//
// Phase 1 (unique):  30 real users + 30 real motions (seed-data.ts).
// Phase 2 (stress):  10,000 duplicate users and 1,000,000 duplicate motions
//                    via generate_series. Each duplicate clones base row
//                    ((i - 1) % 30) + 1 and gets a random 8-char hex keyword
//                    (e.g. "a1b2c3d4") attached:
//                      username: a1b2c3d4_vector_shif          (hex + 11 chars, fits VARCHAR(20))
//                      email:    a1b2c3d4_vector_shift@example.com
//                      content:  a1b2c3d4 AI should be granted legal personhood.
//                    Then EVERY motion gets 0–12 arguments (count, side, text,
//                    debater, likes, timestamp all random) — ~6M arguments total.
//
// Scale via env vars (defaults below), e.g. for a 10M-motion run:
//   SEED_MOTIONS=10000000 npm run db:seed:stress
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
const DUP_MOTIONS = intEnv("SEED_MOTIONS", 1_000_000);
const MAX_ARGUMENTS_PER_MOTION = intEnv("SEED_MAX_ARGUMENTS", 12); // 0..N, uniform → ~N/2 avg
const BATCH_SIZE = Math.max(1, intEnv("SEED_BATCH", 1_000_000));

// ============================================================
// Phase 2 — stress SQL (pure Postgres, generate_series loops)
// ============================================================
const U = USERS.length; // 30 base rows for both users and motions

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

// Duplicate motions: hex keyword prepended to content, random author from the
// full user pool, re-randomized vote split (15–85) and created_at (last 45 days).
const STRESS_MOTIONS_SQL = `
	WITH uids AS (SELECT array_agg(id) AS ids, count(*)::int AS n FROM users)
	INSERT INTO motions (user_id, content, content_keyword, domain_id, for_analysis, against_analysis, affirmative, negative, created_at)
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
	JOIN motions b ON b.id = (gs.i - 1) % ${U} + 1
	CROSS JOIN uids u
	-- gs.i correlates the subquery: without it the planner caches one value for all rows
	CROSS JOIN LATERAL (
		SELECT
			substr(md5(gs.i || random()::text), 1, 8) AS hex,
			(15 + floor(random() * 71))::int AS aff
	) k;
`;

// Arguments: EVERY motion gets a random number of arguments (0–12), each with a
// random side, random text from the matching pool ($1 for / $2 against), random
// debater, random likes, posted 1–96h after the motion.
const STRESS_ARGUMENTS_SQL = `
	WITH uids AS (SELECT array_agg(id) AS ids, count(*)::int AS n FROM users)
	INSERT INTO arguments (user_id, motion_id, side, content, likes, created_at)
	SELECT
		u.ids[floor(random() * u.n)::int + 1],
		a.id,
		CASE WHEN r.is_for THEN 'for' ELSE 'against' END,
		r.hex || ' ' || CASE WHEN r.is_for
			THEN ($1::text[])[floor(random() * ${FOR_ARGUMENTS.length})::int + 1]
			ELSE ($2::text[])[floor(random() * ${AGAINST_ARGUMENTS.length})::int + 1]
		END,
		floor(random() * 41)::int,
		least(a.created_at + (1 + floor(random() * 96)) * interval '1 hour', now())
	FROM motions a
	CROSS JOIN uids u
	-- a.id correlates generate_series so the argument count is re-rolled per motion
	CROSS JOIN LATERAL generate_series(
		1, (a.id * 0 + floor(random() * ${MAX_ARGUMENTS_PER_MOTION + 1}))::int
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
		// Phase 1 — 30 unique users + 30 unique motions
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
		let motionCount = 0;
		for (let lo = 1; lo <= DUP_MOTIONS; lo += BATCH_SIZE) {
			const hi = Math.min(lo + BATCH_SIZE - 1, DUP_MOTIONS);
			const batch = await client.query(STRESS_MOTIONS_SQL, [lo, hi]);
			motionCount += batch.rowCount ?? 0;
			console.log(
				`⚡ Stress: duplicate motions ${motionCount.toLocaleString()}/${DUP_MOTIONS.toLocaleString()} (${Date.now() - t}ms)`,
			);
		}

		t = Date.now();
		let argumentCount = 0;
		const totalMotions = U + DUP_MOTIONS;
		for (let lo = 1; lo <= totalMotions; lo += BATCH_SIZE) {
			const hi = Math.min(lo + BATCH_SIZE - 1, totalMotions);
			const batch = await client.query(STRESS_ARGUMENTS_SQL, [
				FOR_ARGUMENTS,
				AGAINST_ARGUMENTS,
				lo,
				hi,
			]);
			argumentCount += batch.rowCount ?? 0;
			console.log(
				`⚡ Stress: randomized arguments ${argumentCount.toLocaleString()} (motions ${Math.min(hi, totalMotions).toLocaleString()}/${totalMotions.toLocaleString()} covered, ${Date.now() - t}ms)`,
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
