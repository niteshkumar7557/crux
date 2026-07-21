import pool from "./index.js";
import {
	insertBaseData,
	USERS,
	STATEMENTS,
	FOR_COMMENTS,
	AGAINST_COMMENTS,
	randInt,
	pick,
} from "./seed-data.js";

// Dev seeder — small, realistic dataset for feature development.
// Wipes and refills users, arguments, and comments:
//   30 real users + 30 real statements, each statement with 1–6 comments.
// Every account logs in with the password "secret".
//
// For millions of rows (query stress testing) run seed-stress.ts instead:
//   npm run db:seed:stress

const seed = async () => {
	const client = await pool.connect();

	try {
		await client.query("BEGIN");

		const { statementTimes } = await insertBaseData(client);

		// 1–6 comments per statement: random side, text, commenter, likes,
		// posted 1–96h after the statement (clamped to now)
		const now = Date.now();
		const HOUR = 60 * 60 * 1000;
		const commentValues: unknown[] = [];
		const commentRows: string[] = [];
		STATEMENTS.forEach((_, i) => {
			for (let c = randInt(1, 6); c > 0; c--) {
				const isFor = Math.random() < 0.5;
				const postedAt = new Date(
					Math.min(
						statementTimes[i]!.getTime() + randInt(1, 96) * HOUR,
						now,
					),
				);
				commentValues.push(
					randInt(1, USERS.length),
					i + 1, // statement ids are 1-based after TRUNCATE ... RESTART IDENTITY
					isFor ? "for" : "against",
					pick(isFor ? FOR_COMMENTS : AGAINST_COMMENTS),
					randInt(0, 40),
					postedAt,
				);
				const o = commentValues.length - 6;
				commentRows.push(
					`($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4}, $${o + 5}, $${o + 6})`,
				);
			}
		});

		await client.query(
			`
      INSERT INTO comments (user_id, argument_id, side, content, likes, created_at)
      VALUES
        ${commentRows.join(",\n        ")};
      `,
			commentValues,
		);
		console.log(`✅ Seeded ${commentRows.length} comments`);

		// §11: pin two debates onto the Main Stage so a fresh dev DB shows a
		// populated stage immediately (the featuring poller also fills it by heat).
		// User 1 (nitesh_dev) is already seeded with role 'admin' by seed-data.ts.
		await client.query(`UPDATE arguments SET pinned = TRUE WHERE id IN (1, 2)`);
		console.log("✅ Pinned 2 Main Stage debates");

		// §10: seed the logic ledger from each user's all-time score so the Season
		// board is populated on a fresh dev DB (one 'seed' event, dated now).
		await client.query(
			`INSERT INTO logic_events (user_id, amount, reason)
			 SELECT id, ROUND(logic_score)::int, 'seed' FROM users WHERE logic_score <> 0`,
		);
		console.log("✅ Seeded logic ledger for the Season board");

		await client.query("COMMIT");
		console.log('🎉 Dev seeding complete! (every user\'s password is "secret")');
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
