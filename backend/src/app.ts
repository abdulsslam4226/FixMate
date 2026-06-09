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

const app = express();

app.use(cors());
app.use(morgan("dev"));
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

app.use("/api/v1", v1);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

export default app;
