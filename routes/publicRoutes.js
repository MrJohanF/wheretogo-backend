// routes/publicRoutes.js
import express from "express";
import { getAllCategories } from "../controllers/categoryController.js";
import { getAllPlaces, getPlaceById } from "../controllers/placeController.js";
import { getCategoryPlaces } from "../controllers/placeCategoryController.js";

const router = express.Router();

// Public category endpoints
router.get("/categories", getAllCategories);

// Public place endpoints
router.get("/places", getAllPlaces);
router.get("/places/:id", getPlaceById);

// Public get all places by category
router.get("/categories/:id/places", getCategoryPlaces);

export default router; 