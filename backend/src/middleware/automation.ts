import { Request, Response, NextFunction } from "express";

// Service-to-service auth for n8n callbacks (Module 3.2-C). Distinct from
// attachSession's user JWTs — n8n isn't a FixMate user, it's the automation
// engine calling back to execute the SLA cancellation it scheduled. Guarded
// by a shared secret both sides hold (N8N_AUTOMATION_SECRET).
export function requireAutomationSecret(req: Request, res: Response, next: NextFunction) {
  const secret = req.header("x-automation-secret");
  const expected = process.env.N8N_AUTOMATION_SECRET;

  if (!expected) {
    return res.status(500).json({ error: "N8N_AUTOMATION_SECRET is not configured" });
  }

  if (secret !== expected) {
    return res.status(401).json({ error: "Invalid automation credentials" });
  }

  next();
}
