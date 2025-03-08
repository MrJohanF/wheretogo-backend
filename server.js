import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.js";
import authMiddleware from "./middleware/auth.js";
import adminRoutes from "./routes/adminRoutes.js"; 
import publicRoutes from "./routes/publicRoutes.js";
import activityRoutes from "./routes/activityRoutes.js";
import activityLogger from "./middleware/activityLogger.js";

const app = express();

const isProd = process.env.NODE_ENV === 'production';

app.use(cors({ 
  origin: isProd 
    ? [
        `${process.env.CLIENT_URL}`, 
        "https://mywheretogo.com"
      ]
    : [
        "https://localhost:3443",
        "http://localhost:3000",
        `${process.env.CLIENT_URL}`
      ],
  credentials: true
 }));

app.use(express.json());
app.use(cookieParser());

// Public routes (no authentication required)
app.use("/api", publicRoutes);

// Auth routes (some protected, some public)
app.use("/api/auth", authRoutes);

// Admin routes (all protected)
app.use("/api/admin", authMiddleware, adminRoutes); 

// Activity tracking routes (all protected)
app.use("/api", activityRoutes);

app.get("/api/protected", (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  res.json({ message: "Protected route", user: req.user });
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
