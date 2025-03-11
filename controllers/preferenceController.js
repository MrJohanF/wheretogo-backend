import { prisma } from "../prisma/prisma.js";
import { preferenceSchema, preferenceKeySchema } from "../validation/preferenceSchema.js";
import { DEFAULT_PREFERENCES } from "../utils/defaultPreferences.js";
import { getUserPreferencesWithDefaults } from "../utils/userPreferences.js";


// Get all preferences for a user
export const getUserPreferences = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required"
      });
    }

    // Check if user exists
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Get preferences with defaults as fallback
    const preferences = await getUserPreferencesWithDefaults(userId);
    
    // Format as array of preference objects to match your API format
    const formattedPrefs = Object.entries(preferences).map(([key, value]) => ({
      userId,
      key,
      value
    }));

    return res.status(200).json({
      success: true,
      data: formattedPrefs
    });
  } catch (error) {
    console.error("Error getting user preferences:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve preferences"
    });
  }
};

// Get a specific preference by key
export const getUserPreference = async (req, res) => {
  try {
    const { key } = req.params;
    const userId = req.user.userId;

    const preference = await prisma.userPreference.findUnique({
      where: {
        userId_key: {
          userId,
          key
        }
      }
    });

    if (!preference) {
      return res.status(404).json({
        success: false,
        message: `Preference with key '${key}' not found`
      });
    }

    return res.status(200).json({
      success: true,
      data: preference
    });
  } catch (error) {
    console.error("Error getting user preference:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve preference"
    });
  }
};

// Create or update a preference
export const setUserPreference = async (req, res) => {
  try {
    const validation = preferenceSchema.safeParse(req.body);
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required"
      });
    }

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid request body",
        errors: validation.error.flatten().fieldErrors
      });
    }

    const { key, value } = validation.data;

    const preference = await prisma.userPreference.upsert({
      where: {
        userId_key: {
          userId,
          key
        }
      },
      update: {
        value
      },
      create: {
        userId,
        key,
        value
      }
    });

    return res.status(200).json({
      success: true,
      data: preference,
      message: "Preference updated successfully"
    });
  } catch (error) {
    console.error("Error setting user preference:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update preference"
    });
  }
};

// Delete a preference
export const deleteUserPreference = async (req, res) => {
  try {
    const { key } = req.params;
    const userId = req.user.userId;

    const preference = await prisma.userPreference.findUnique({
      where: {
        userId_key: {
          userId,
          key
        }
      }
    });

    if (!preference) {
      return res.status(404).json({
        success: false,
        message: `Preference with key '${key}' not found`
      });
    }

    await prisma.userPreference.delete({
      where: {
        userId_key: {
          userId,
          key
        }
      }
    });

    return res.status(200).json({
      success: true,
      message: "Preference deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting user preference:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete preference"
    });
  }
};

// Delete all preferences for a user
export const deleteAllUserPreferences = async (req, res) => {
  try {
    const userId = req.user.userId;

    await prisma.userPreference.deleteMany({
      where: { userId }
    });

    return res.status(200).json({
      success: true,
      message: "All preferences deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting all user preferences:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete preferences"
    });
  }
}; 