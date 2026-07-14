import type { Request, Response } from "express";
import pool from "../db/index.js";

export async function getDomains(req: Request, res: Response) {
  try {
    const { rows } = await pool.query(`
                SELECT id, name
                FROM domains
                ORDER BY id ASC;
            `);
    res.status(200).json({ domains: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ domains: [] });
  }
}
