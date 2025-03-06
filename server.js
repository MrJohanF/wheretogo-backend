import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.js";
import authMiddleware from "./middleware/auth.js";
import adminRoutes from "./routes/adminRoutes.js"; 

const app = express();

app.use(cors({ orgin: ["http://localhost:3000"],
  credentials: true
 }));

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes); 

app.get("/api/protected", authMiddleware, (req, res) => {
  res.json({ message: "Protected route" });
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
