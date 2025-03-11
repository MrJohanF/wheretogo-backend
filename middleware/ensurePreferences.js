// middleware/ensurePreferences.js
import { setupDefaultPreferences } from "../utils/userPreferences.js";
import { prisma } from "../prisma/prisma.js";

/**
 * Middleware to ensure a user has preferences set up
 */
export const ensurePreferences = async (req, res, next) => {
  try {
    // Skip if no authenticated user
    if (!req.user || !req.user.id) return next();
    
    // Check if user has any preferences
    const prefsCount = await prisma.userPreference.count({
      where: { userId: req.user.id }
    });
    
    // If no preferences found, set up defaults
    if (prefsCount === 0) {
      await setupDefaultPreferences(req.user.id);
    }
    
    next();
  } catch (error) {
    console.error("Error ensuring preferences:", error);
    next(); // Continue even if there's an error
  }
};