// Dev seed: a browsable arena in one command. Every password is "secret".

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

const seed = async () => {
	const client = await pool.connect();

	try {
		await client.query("BEGIN");

		const { motionTimes } = await insertBaseData(client);

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

		await client.query(`UPDATE motions SET pinned = TRUE WHERE id IN (1, 2)`);
		console.log("✅ Pinned 2 Main Stage debates");

		await client.query(
			`INSERT INTO logic_events (user_id, amount, reason)
			 SELECT id, ROUND(logic_score)::int, 'seed' FROM users WHERE logic_score <> 0`,
		);
		console.log("✅ Seeded logic ledger for the Season board");

		await client.query(
			`INSERT INTO dev_messages (user_id, sender, body, relayed_at, is_read, created_at)
			 VALUES
			   (1, 'user', 'Small thing — I typed "affect" where I meant "effect" in my motion on rent caps. Any chance you can fix it?', NOW() - INTERVAL '3 hours', TRUE,  NOW() - INTERVAL '3 hours'),
			   (1, 'dev',  'Fixed. There is no edit button yet, so keep sending these — it is the fastest way to get a typo corrected.', NULL, TRUE, NOW() - INTERVAL '2 hours'),
			   (1, 'user', 'Also: the verdict page reads great on desktop but the score bar wraps oddly on my phone.', NOW() - INTERVAL '20 minutes', TRUE, NOW() - INTERVAL '20 minutes'),
			   (1, 'dev',  'Good catch, that is a real bug. Looking at it now.', NULL, FALSE, NOW() - INTERVAL '5 minutes')`,
		);
		console.log("✅ Seeded a developer thread on user 1 (1 unread)");

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
