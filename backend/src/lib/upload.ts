// Selfie upload — Module 3.2-A (Localized Trust Engine)
// Stores files to disk under uploads/ and returns a URL the admin queue and
// provider profile page can render.  Swap the storage engine for S3/Cloudinary
// in production without changing any controller code.

import path from "path";
import crypto from "crypto";
import multer, { StorageEngine } from "multer";

const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

const storage: StorageEngine = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const unique = crypto.randomBytes(16).toString("hex");
    cb(null, `selfie-${unique}${ext}`);
  },
});

export const selfieUpload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG and WebP images are accepted"));
    }
  },
}).single("selfie");

const portfolioStorage: StorageEngine = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const unique = crypto.randomBytes(16).toString("hex");
    cb(null, `portfolio-${unique}${ext}`);
  },
});

export const portfolioUpload = multer({
  storage: portfolioStorage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG and WebP images are accepted"));
    }
  },
}).single("image");

function publicUrl(filename: string): string {
  const base = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 4000}`;
  return `${base}/uploads/${filename}`;
}

export function selfiePublicUrl(filename: string): string {
  return publicUrl(filename);
}

export function portfolioPublicUrl(filename: string): string {
  return publicUrl(filename);
}
