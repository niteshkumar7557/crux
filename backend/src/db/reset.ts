import { Pool } from "pg";
import config from "../config/index.js";

// Drops the entire public schema and recreates it empty.
//
// v1 migrations are edited IN PLACE rather than stacked (the product is not
// live), and migrate.ts skips any filename already recorded in _migrations --
// so an in-place edit is invisible to an existing database. This is the reset
// that makes the edit take effect:
//
//   npm run db:reset:dev && npm run db-init
//
// It destroys every row. That is the point.

const pool = new Pool({ connectionString: config.db.url });

async function reset() {
  if (config.node_env === "production") {
    console.error("❌ refusing to reset the schema with NODE_ENV=production");
    process.exit(1);
  }

  try {
    await pool.query("DROP SCHEMA public CASCADE");
    await pool.query("CREATE SCHEMA public");
    console.log("✅ public schema dropped and recreated — run db-init next");
  } catch (err) {
    console.error("❌ reset failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

reset();
