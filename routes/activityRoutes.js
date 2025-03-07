import express from "express";
import authMiddleware from "../middleware/auth.js";
import { 
  recordActivity,
  recordPageView,
  recordSearchHistory
} from "../controllers/userActivityController.js";

const router = express.Router();

// All activity tracking routes require authentication
// Activity tracking endpoints
router.post("/activity/record", authMiddleware, recordActivity);

// Page view endpoints
router.post("/pageview/record", authMiddleware, recordPageView);

// Search history endpoints
router.post("/search/record", authMiddleware, recordSearchHistory);

export default router; 