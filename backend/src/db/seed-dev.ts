import pool from "./index.js";
import {
	insertBaseData,
	USERS,
	MOTIONS,
	FOR_ARGUMENTS,
	AGAINST_ARGUMENTS,
	randInt,
	pick,
} from "./seed-data.js";

// Dev seeder — small, realistic dataset for feature development.
// Wipes and refills users, motions, and arguments:
//   30 real users + 30 real motions, each motion with 1–6 arguments.
// Every account logs in with the password "secret".
//
// For millions of rows (query stress testing) run seed-stress.ts instead:
//   npm run db:seed:stress

const seed = async () => {
	const client = await pool.connect();

	try {
		await client.query("BEGIN");

		const { motionTimes } = await insertBaseData(client);

		// 1–6 arguments per motion: random side, text, debater, likes,
		// posted 1–96h after the motion (clamped to now)
		const now = Date.now();
		const HOUR = 60 * 60 * 1000;
		const argumentValues: unknown[] = [];
		const argumentRows: string[] = [];
		MOTIONS.forEach((_, i) => {
			for (let c = randInt(1, 6); c > 0; c--) {
				const isFor = Math.random() < 0.5;
				const postedAt = new Date(
					Math.min(
						motionTimes[i]!.getTime() + randInt(1, 96) * HOUR,
						now,
					),
				);
				argumentValues.push(
					randInt(1, USERS.length),
					i + 1, // motion ids are 1-based after TRUNCATE ... RESTART IDENTITY
					isFor ? "for" : "against",
					pick(isFor ? FOR_ARGUMENTS : AGAINST_ARGUMENTS),
					randInt(0, 40),
					postedAt,
				);
				const o = argumentValues.length - 6;
				argumentRows.push(
					`($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4}, $${o + 5}, $${o + 6})`,
				);
			}
		});

		await client.query(
			`
      INSERT INTO arguments (user_id, motion_id, side, content, likes, created_at)
      VALUES
        ${argumentRows.join(",\n        ")};
      `,
			argumentValues,
		);
		console.log(`✅ Seeded ${argumentRows.length} arguments`);

		// §11: pin two debates onto the Main Stage so a fresh dev DB shows a
		// populated stage immediately (the featuring poller also fills it by heat).
		// User 1 (nitesh_dev) is already seeded with role 'admin' by seed-data.ts.
		await client.query(`UPDATE motions SET pinned = TRUE WHERE id IN (1, 2)`);
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
