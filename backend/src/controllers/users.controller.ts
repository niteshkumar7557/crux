// Register, login, refresh, logout. The refresh cookie is sameSite "lax" because v1
// is same-origin end to end — the browser only ever talks to the frontend's domain.

import type { CookieOptions, Request, Response } from "express";
import type { userLoginData, userRegisterData } from "../types/userInfo.js";
import pool from "../db/index.js";
import bcrypt from "bcrypt";
import config from "../config/index.js";
import {
  createAccessToken,
  createRefreshToken,
  deleteRefreshTokenFromDB,
  findRefreshToken,
  saveRefreshTokenToDB,
} from "../lib/tokens.js";
import { validateUsername } from "../lib/username.logic.js";
import { queueEmail } from "../emails/queue.js";

const isProduction = config.node_env === "production";
const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  // v1 is same-origin end to end (browser -> frontend domain -> /api proxy), so
  // "lax" holds everywhere and blocks cross-site sends.
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 Days
};

export async function addNewUser(req: Request, res: Response) {
  const { name, userName, email, password }: userRegisterData = req.body;

  if (!name || !userName || !email || !password) {
    return res
      .status(400)
      .json({ error: "Please provide every Required field!" });
  }

  const handle = validateUsername(userName);
  if (!handle.ok) {
    return res.status(400).json({ error: handle.reason });
  }

  try {
    const exisiting = await pool.query(
      `
        SELECT id FROM users WHERE email = $1 OR username = $2;
      `,
      [email, handle.value],
    );

    if (exisiting.rows.length > 0) {
      return res
        .status(409)
        .json({ error: "email or username already taken!" });
    }

    const hashedPassword = await bcrypt.hash(password, config.bcrypt_rounds);

    const { rows } = await pool.query(
      `INSERT INTO users(username, name, email, hashed_password) VALUES (
                $1,$2,$3,$4
          ) RETURNING id, role, username, email `,
      [handle.value, name, email, hashedPassword],
    );

    const user = rows[0];

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken();

    await saveRefreshTokenToDB(user.id, refreshToken);

    res.cookie("refresh_token", refreshToken, cookieOptions);
    res.status(201).json({
      accessToken: accessToken,
    });

    // Transactional, and after the response: the account already exists, so a
    // mail failure must not turn a successful signup into an error.
    void queueEmail(user.id, {
      category: "welcome",
      data: { username: user.username },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "registeration failed!" });
  }
}

export async function loginUser(req: Request, res: Response) {
  const { email, password }: userLoginData = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ error: "Please provide every Required field!" });
  }

  try {
    const { rows } = await pool.query(
      "SELECT id, role, username, email, hashed_password FROM users WHERE email = $1 ;",
      [email],
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: "Email not found!" });
    }

    const user: {
      id: number;
      role: string;
      username: string;
      email: string;
      hashed_password: string | null;
    } = rows[0];

    // Nullable since migration 0016: an account created through Google has no
    // password. bcrypt.compare throws on a null hash, so this must come first —
    // and the message has to name the way in, or the user is told their correct
    // password is wrong.
    if (user.hashed_password === null) {
      return res
        .status(400)
        .json({ error: "This account signs in with Google. Use the Google button." });
    }

    const valid = await bcrypt.compare(password, user.hashed_password);
    if (!valid) {
      return res.status(400).json({ error: "Wrong Password!" });
    }

    const payloadData = {
      id: user.id,
      role: user.role,
      username: user.username,
      email: user.email,
    };

    const accessToken = createAccessToken(payloadData);
    const refreshToken = createRefreshToken();

    await saveRefreshTokenToDB(user.id, refreshToken);

    res.cookie("refresh_token", refreshToken, cookieOptions);
    res.json({
      accessToken: accessToken,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "login failed!" });
  }
}

export async function generateNewAccess(req: Request, res: Response) {
  const refreshToken = req.cookies.refresh_token;

  if (!refreshToken) {
    return res.status(200).json({ error: "no refresh token" });
  }

  try {
    const tokenData = await findRefreshToken(refreshToken);

    if (!tokenData) {
      return res
        .status(200)
        .json({ error: "invalid or expired refresh token!" });
    }

    const newAccessToken = createAccessToken({
      id: tokenData.id,
      role: tokenData.role,
      username: tokenData.username,
      email: tokenData.email,
    });

    res.json({ access_token: newAccessToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "token refresh failed" });
  }
}

export async function logoutUser(req: Request, res: Response) {
  const refreshToken = req.cookies.refresh_token;

  if (refreshToken) {
    await deleteRefreshTokenFromDB(refreshToken);
  }

  res.clearCookie("refresh_token", cookieOptions);
  res.json({ message: "logged out successfully" });
}

export async function getUserInfo(req: Request, res: Response) {
  try {
    const { rows } = await pool.query(
      `
        SELECT id, name, username, role, avatar FROM users WHERE id = $1;
      `,
      [req.user!.id],
    );
    res.json({ user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: "failed to fetch user " });
  }
}
