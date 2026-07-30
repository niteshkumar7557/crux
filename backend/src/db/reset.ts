// Drops and recreates the public schema. Dev only — refuses under NODE_ENV=production.

import { Pool } from "pg";
import config from "../config/index.js";

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
