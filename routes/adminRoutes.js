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
  getAllCategories,
  updateCategory,
  deleteCategory
} from "../controllers/categoryController.js";

import { 
  createPlace,
} from "../controllers/placeController.js";

// PlaceCategory endpoints
import {
  addCategoryToPlace,
  getPlaceCategories,
  getCategoryPlaces,
  removeCategoryFromPlace
} from "../controllers/placeCategoryController.js";

// PlaceFeature endpoints
import {
  addFeatureToPlace,
  getPlaceFeatures,
  getFeaturePlaces,
  removeFeatureFromPlace
} from "../controllers/placeFeatureController.js";

// PlaceSubcategory endpoints
import {
  addSubcategoryToPlace,
  getPlaceSubcategories,
  getSubcategoryPlaces,
  removeSubcategoryFromPlace
} from "../controllers/placeSubcategoryController.js";

// Subcategory endpoints
import { 
  createSubcategory, 
  getAllSubcategories, 
  getSubcategoryById, 
  updateSubcategory, 
  deleteSubcategory 
} from "../controllers/subcategoryController.js";

// Feature endpoints
import { 
  createFeature,
  getAllFeatures,
  getFeatureById,
  updateFeature,
  deleteFeature
} from "../controllers/featureController.js";

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
router.put("/categories/:id", updateCategory);
router.delete("/categories/:id", deleteCategory);

// PlaceCategory endpoints
router.post("/place-categories/add", addCategoryToPlace);
router.get("/places/:placeId/categories", getPlaceCategories);
router.get("/categories/:categoryId/places", getCategoryPlaces);
router.delete("/places/:placeId/categories/:categoryId", removeCategoryFromPlace);

// PlaceFeature endpoints
router.post("/place-features/add", addFeatureToPlace);
router.get("/places/:placeId/features", getPlaceFeatures);
router.get("/features/:featureId/places", getFeaturePlaces);
router.delete("/places/:placeId/features/:featureId", removeFeatureFromPlace);

// PlaceSubcategory endpoints
router.post("/place-subcategories/add", addSubcategoryToPlace);
router.get("/places/:placeId/subcategories", getPlaceSubcategories);
router.get("/subcategories/:subcategoryId/places", getSubcategoryPlaces);
router.delete("/places/:placeId/subcategories/:subcategoryId", removeSubcategoryFromPlace);

// Subcategory endpoints
router.post("/subcategories/add", createSubcategory);
router.get("/subcategories", getAllSubcategories);
router.get("/subcategories/:id", getSubcategoryById);
router.put("/subcategories/:id", updateSubcategory);
router.delete("/subcategories/:id", deleteSubcategory);

// Feature endpoints
router.post("/features/add", createFeature);
router.get("/features", getAllFeatures);
router.get("/features/:id", getFeatureById);
router.put("/features/:id", updateFeature);
router.delete("/features/:id", deleteFeature);

export default router;