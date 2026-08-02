// JWT verification. Identity always comes from the token, never from the request
// body. requireRole guards the admin routes.

import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import config from "../config/index.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        role: string;
      };
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "no token provided" });
  }

  try {
    const decoded = jwt.verify(token, config.jwt_secret!) as any;

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: "invalid or expired token" });
  }
}

// A request with no token, or an invalid one, still proceeds — req.user is
// simply left unset, so the handler behaves as it would for a spectator. Only
// a VALID token populates req.user, exactly like authMiddleware.
export async function optionalMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.jwt_secret!) as any;

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };
  } catch {
    // Invalid/expired token on an optional route: proceed as a spectator
    // rather than refusing a read nobody required auth for.
  }

  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "access denied" });
    }
    next();
  };
}
