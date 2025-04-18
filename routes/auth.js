// routes/auth.js
import express from "express";
import authMiddleware from "../middleware/auth.js";
import activityLogger from "../middleware/activityLogger.js";
import { register, login, logout, me } from "../controllers/authController.js";
import { 
  setup2FA, 
  verify2FA, 
  disable2FA,
  getUserSessions, 
  getSessionById,
  endSession,
  endAllOtherSessions
} from "../controllers/twoFactorController.js";
import {
    getUserPreferences,
    getUserPreference,
    setUserPreference,
    deleteUserPreference,
    deleteAllUserPreferences
} from "../controllers/preferenceController.js";
import { 
  getFullUserProfile, 
  updatePersonalInfo,
  updatePassword,
  updatePreferences,
  updateSecuritySettings
} from "../controllers/userProfileController.js";
import { ensurePreferences } from "../middleware/ensurePreferences.js";

const router = express.Router();

// Public routes (no auth required)
router.post("/register", register);
router.post("/login", login);

// Auth middleware chain
const auth = [authMiddleware, activityLogger];

// Protected routes
router.post("/logout", ...auth, logout);
router.get("/me", ...auth, ensurePreferences, me);

// User profile route
router.get("/profile/:userId", ...auth, ensurePreferences, getFullUserProfile);
router.put("/profile/:userId/personal", ...auth, updatePersonalInfo);
router.put("/profile/:userId/password", ...auth, updatePassword);
router.put("/profile/:userId/preferences", ...auth, updatePreferences);
router.put("/profile/:userId/security", ...auth, updateSecuritySettings);


// 2FA routes
router.post("/2fa/setup", ...auth, setup2FA);
router.post("/2fa/verify", ...auth, verify2FA);
router.post("/2fa/disable", ...auth, disable2FA);

// Session management
router.get("/sessions", ...auth, getUserSessions);
router.delete("/sessions/:sessionId", ...auth, endSession);
router.delete("/sessions", ...auth, endAllOtherSessions);

// Session by user id
router.get("/sessions/:userId", ...auth, getSessionById);


// Existing preference routes
router.get("/preferences/:userId", ...auth, getUserPreferences);
router.get("/preferences/:userId/:key", ...auth, getUserPreference);
router.post("/preferences/:userId", ...auth, setUserPreference);
router.delete("/preferences/:userId/:key", ...auth, deleteUserPreference);
router.delete("/preferences/:userId", ...auth, deleteAllUserPreferences);

export default router;