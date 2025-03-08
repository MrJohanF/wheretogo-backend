// routes/auth.js

import express from "express";
import authMiddleware from "../middleware/auth.js";
import { register, login, logout, me } from "../controllers/authController.js";
// Add activity logger to specific routes where you want to track authenticated users
import activityLogger from "../middleware/activityLogger.js";
import {
    getUserPreferences,
    getUserPreference,
    setUserPreference,
    deleteUserPreference,
    deleteAllUserPreferences
  } from "../controllers/preferenceController.js";


const router = express.Router();

// Public routes (no auth required)
router.post("/register", register, activityLogger);
router.post("/login", login, activityLogger);

// Protected routes (auth required)
router.post("/logout", authMiddleware, logout, activityLogger);
router.post("/me", authMiddleware, me, activityLogger);


// Preference routes (auth required)
router.get("/api/preferences", authMiddleware, getUserPreferences);
router.get("/api/preferences/:key", authMiddleware, getUserPreference);
router.post("/api/preferences", authMiddleware, setUserPreference);
router.delete("/api/preferences/:key", authMiddleware, deleteUserPreference);
router.delete("/api/preferences", authMiddleware, deleteAllUserPreferences);

export default router;
