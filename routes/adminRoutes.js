// routes/adminRoutes.js
import express from "express";
import adminMiddleware from "../middleware/admin.js";
import { 
  getUserActivity, 
  getActiveUsers, 
  getDashboardStats 
} from "../controllers/userActivityController.js";

const router = express.Router();

// Only check for admin privileges
router.use(adminMiddleware);

// User activity endpoints
router.get("/user-activity", getUserActivity);
router.get("/active-users", getActiveUsers);
router.get("/dashboard-stats", getDashboardStats);

export default router;