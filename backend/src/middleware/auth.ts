import { Request, Response, NextFunction } from "express";
import { jwtVerify } from "jose";
import { UserRole } from "@prisma/client";

export interface AuthenticatedRequest extends Request {
  user?: { id: string; role: UserRole };
}

const encodedSecret = (() => {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET must be set — it has to match the frontend's Auth.js secret");
  }
  return new TextEncoder().encode(secret);
})();

// Reads the bridge token Auth.js mints on sign-in (Module 1.1: "Session data
// injected with User Roles"). The Next.js app signs a compact HS256 JWT with
// `sub` (user id) and `role` claims using the same AUTH_SECRET, and sends it
// as `Authorization: Bearer <token>` on every API call — see
// frontend/src/lib/auth.ts's `jwt` callback for the minting side.
export async function attachSession(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, encodedSecret);
      const id = payload.sub;
      const role = payload.role;
      if (typeof id === "string" && (role === "CUSTOMER" || role === "PROVIDER" || role === "ADMIN")) {
        req.user = { id, role };
      }
    } catch {
      // Invalid/expired token — leave req.user unset, requireAuth will 401
    }
  }

  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}
