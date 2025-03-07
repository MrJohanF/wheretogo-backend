// routes/adminRoutes.js
import express from "express";
import adminMiddleware from "../middleware/admin.js";
import { 
  getUserActivity, 
  getActiveUsers, 
  getDashboardStats 
} from "../controllers/userActivityController.js";
import { 
  createCategory,
  getAllCategories
} from "../controllers/categoryController.js";

import { 
  createPlace,
} from "../controllers/placeController.js";

const router = express.Router();

// Only check for admin privileges
router.use(adminMiddleware);

// User activity endpoints
router.get("/user-activity", getUserActivity);
router.get("/active-users", getActiveUsers);
router.get("/dashboard-stats", getDashboardStats);

// Place endpoints
//router.get("/places", getPlaces);
//router.get("/places/:id", getPlaceById);
router.post("/places/add", createPlace);
//router.put("/places/:id", updatePlace);
//router.delete("/places/:id", deletePlace);

// Category endpoints
router.post("/categories/add", createCategory);
router.get("/categories", getAllCategories);

export default router;