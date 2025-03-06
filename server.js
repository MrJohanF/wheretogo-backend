import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.js";
import authMiddleware from "./middleware/auth.js";
import adminRoutes from "./routes/adminRoutes.js"; 
import activityLogger from "./middleware/activityLogger.js";

const app = express();

app.use(cors({ 
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
 }));

app.use(express.json());
app.use(cookieParser());

// Apply auth middleware globally to identify users
app.use(authMiddleware);

// Apply activity logger after auth middleware
app.use(activityLogger);


app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes); 

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
