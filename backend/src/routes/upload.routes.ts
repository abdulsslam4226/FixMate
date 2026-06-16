import path from "path";
import { Router, Request, Response } from "express";
import { selfieUpload, selfiePublicUrl, portfolioUpload, portfolioPublicUrl } from "../lib/upload";
import { requireRole } from "../middleware/auth";

const router = Router();

// POST /api/v1/upload/selfie — authenticated (any logged-in user becoming a provider)
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

// POST /api/v1/upload/portfolio — Provider only
// Accepts multipart/form-data with a single "image" field (JPEG/PNG/WebP, max 5 MB).
router.post("/portfolio", requireRole("PROVIDER"), (req: Request, res: Response) => {
  portfolioUpload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file received — send the image as the 'image' field" });
    }
    res.json({ url: portfolioPublicUrl(req.file.filename) });
  });
});

export default router;
