import type { Request, Response } from "express";

// 200 must mean "a user request would work", so the ping goes through the DB
// pool — an unconditional 200 hides a dead Postgres from every monitor.
export function makeHealthHandler(ping: () => Promise<unknown>) {
  return async (_req: Request, res: Response) => {
    try {
      await ping();
      res.sendStatus(200);
    } catch {
      res.sendStatus(503);
    }
  };
}
