
import { prisma } from "../prisma/prisma.js";
import { DEFAULT_PREFERENCES } from "./defaultPreferences.js";

/**
 * Sets up default preferences for a new user
 * @param {string} userId - The ID of the user
 * @returns {Promise<Array>} - Array of created preferences
 */
export const setupDefaultPreferences = async (userId) => {
  try {
    const preferencesToCreate = [];
    
    // Add each preference as a separate entry
    for (const [key, value] of Object.entries(DEFAULT_PREFERENCES)) {
      preferencesToCreate.push({
        userId,
        key,
        value
      });
    }
    
    // Insert all preferences at once
    await prisma.userPreference.createMany({
      data: preferencesToCreate,
      skipDuplicates: true // Skip if any already exist
    });
    
    console.log(`Default preferences set up for user ${userId}`);
    return preferencesToCreate;
    
  } catch (error) {
    console.error("Error setting up default preferences:", error);
    throw error;
  }
};

/**
 * Gets user preferences with defaults as fallback
 * @param {string} userId - The ID of the user
 * @returns {Promise<object>} - Object containing all preferences
 */
export const getUserPreferencesWithDefaults = async (userId) => {
  try {
    const userPrefs = await prisma.userPreference.findMany({
      where: { userId }
    });
    
    // Convert to map for easier lookup
    const userPrefsMap = {};
    userPrefs.forEach(pref => {
      userPrefsMap[pref.key] = pref.value;
    });
    
    // Combine default preferences with user's preferences
    const combinedPrefs = {};
    
    for (const [key, defaultValue] of Object.entries(DEFAULT_PREFERENCES)) {
      combinedPrefs[key] = userPrefsMap[key] !== undefined ? userPrefsMap[key] : defaultValue;
    }
    
    return combinedPrefs;
  } catch (error) {
    console.error("Error getting user preferences:", error);
    return { ...DEFAULT_PREFERENCES };
  }
};