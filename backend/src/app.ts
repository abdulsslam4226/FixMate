import path from "path";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { attachSession } from "./middleware/auth";
import authRoutes from "./routes/auth.routes";
import providerRoutes from "./routes/provider.routes";
import categoryRoutes from "./routes/category.routes";
import bookingRoutes from "./routes/booking.routes";
import adminRoutes from "./routes/admin.routes";
import automationRoutes from "./routes/automation.routes";
import uploadRoutes from "./routes/upload.routes";
import notificationRoutes from "./routes/notification.routes";
import paymentRoutes from "./routes/payment.routes";
import { handleWebhook } from "./controllers/payment.controller";

const app = express();

const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, "http://localhost:3000"]
  : true; // allow all in dev when FRONTEND_URL is unset
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(morgan("dev"));

// Paystack webhook must receive the raw body for HMAC verification — register
// this route with express.raw() BEFORE the global express.json() middleware.
app.post(
  "/api/v1/payments/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook,
);

app.use(express.json());
app.use(attachSession);

// Serve uploaded selfies as static files (Module 3.2-A)
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

const v1 = express.Router();
v1.use("/auth", authRoutes);
v1.use("/providers", providerRoutes);
v1.use("/categories", categoryRoutes);
v1.use("/bookings", bookingRoutes);
v1.use("/admin", adminRoutes);
v1.use("/automation", automationRoutes);
v1.use("/upload", uploadRoutes);
v1.use("/notifications", notificationRoutes);
v1.use("/payments", paymentRoutes);

app.use("/api/v1", v1);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

export default app;
