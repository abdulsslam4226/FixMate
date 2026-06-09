import path from "path";
import { Router, Request, Response } from "express";
import { selfieUpload, selfiePublicUrl } from "../lib/upload";
import { requireRole } from "../middleware/auth";

const router = Router();

// POST /api/v1/upload/selfie — authenticated (any logged-in user becoming a provider)
// Accepts multipart/form-data with a single "selfie" field (JPEG/PNG/WebP, max 5 MB).
// Returns { url } — the caller stores this URL in the onboarding payload's selfieUrl field.
router.post("/selfie", requireRole("CUSTOMER", "PROVIDER"), (req: Request, res: Response) => {
  selfieUpload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file received — send the image as the 'selfie' field" });
    }
    res.json({ url: selfiePublicUrl(req.file.filename) });
  });
});

export default router;
