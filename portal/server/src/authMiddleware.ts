import type { NextFunction, Request, Response } from "express";
import { auth } from "./firebaseAdmin.js";

declare global {
  namespace Express {
    interface Request {
      user?: { uid: string; email: string; name: string };
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing Authorization header" });

  try {
    const decoded = await auth.verifyIdToken(token);
    req.user = {
      uid: decoded.uid,
      email: decoded.email ?? "",
      name: decoded.name ?? decoded.email ?? "Unknown",
    };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
