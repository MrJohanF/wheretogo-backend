// controllers/userProfileController.js

import { prisma } from "../prisma/prisma.js";
import bcrypt from "bcryptjs";
import { z } from "zod";



const personalInfoSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  avatar: z.union([
    z.string().url("Invalid URL format"), 
    z.string().startsWith('data:image/'), // Accept data URLs for base64 images
    z.null()
  ]).optional()
});

const passwordUpdateSchema = z.object({
  currentPassword: z.string().min(6, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters")
});

const securitySettingsSchema = z.object({
  loginAlerts: z.boolean().optional()
  // Add other security fields as needed
});

export const getFullUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user is authorized to view this profile
    // Only allow if it's their own profile or if they're an admin
    if (userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to view this profile"
      });
    }

    // Get user's personal information
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        twoFactorEnabled: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Get user's preferences
    const preferences = await prisma.userPreference.findMany({
      where: { userId }
    });

    // Get user's active sessions
    const sessions = await prisma.userSession.findMany({
      where: {
        userId,
        isActive: true
      },
      orderBy: {
        lastActivity: 'desc'
      },
      select: {
        id: true,
        ipAddress: true,
        deviceName: true,
        location: true,
        lastActivity: true,
        startTime: true,
        userAgent: true
      }
    });

    // Get security information
    const securityInfo = {
      twoFactorEnabled: user.twoFactorEnabled,
      activeSessions: sessions.length,
      lastActivity: sessions[0]?.lastActivity || null
    };

    // Combine all data
    const fullProfile = {
      personal: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      preferences: preferences,
      security: securityInfo,
      sessions: sessions
    };

    return res.status(200).json({
      success: true,
      profile: fullProfile
    });

  } catch (error) {
    console.error("Error fetching user profile:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user profile",
      error: error.message
    });
  }
}; 


// Update personal information (name, email, avatar)
export const updatePersonalInfo = async (req, res) => {
  try {
    const { userId } = req.params;

    // Authorize - only own profile or admin
    if (userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to update this profile"
      });
    }

    // Validate request body
    const validation = personalInfoSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid request data",
        errors: validation.error.flatten().fieldErrors
      });
    }

    const { name, email, avatar } = validation.data;

    // Check if email already exists (but not for this user)
    if (email) {
      const existingUser = await prisma.user.findUnique({ 
        where: { email } 
      });
      
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({
          success: false,
          message: "Email already in use by another account"
        });
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        avatar,
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        updatedAt: true
      }
    });

    // Log activity
    await prisma.userActivity.create({
      data: {
        userId,
        action: "PROFILE_UPDATE",
        details: { fields: ["name", "email", "avatar"] }
      }
    });

    return res.status(200).json({
      success: true,
      message: "Personal information updated successfully",
      data: updatedUser
    });
  } catch (error) {
    console.error("Error updating personal info:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update personal information",
      error: error.message
    });
  }
};

// Update password
export const updatePassword = async (req, res) => {
  try {
    const { userId } = req.params;

    // Authorize - only own profile or admin
    if (userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to change this user's password"
      });
    }

    // Validate request
    const validation = passwordUpdateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid password data",
        errors: validation.error.flatten().fieldErrors
      });
    }

    const { currentPassword, newPassword } = validation.data;

    // Get current user with password
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect"
      });
    }

    // Hash new password and update
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        updatedAt: new Date()
      }
    });

    // Log activity (don't include password details!)
    await prisma.userActivity.create({
      data: {
        userId,
        action: "PASSWORD_UPDATE",
        details: { timestamp: new Date() }
      }
    });

    return res.status(200).json({
      success: true,
      message: "Password updated successfully"
    });
  } catch (error) {
    console.error("Error updating password:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update password",
      error: error.message
    });
  }
};

// Update preferences (bulk update)
export const updatePreferences = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Authorize
    if (userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to update these preferences"
      });
    }

    // Get preferences from request body
    const preferences = req.body;
    if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) {
      return res.status(400).json({
        success: false,
        message: "Invalid preferences format. Object expected."
      });
    }

    // Start a transaction for bulk update
    const results = await prisma.$transaction(async (tx) => {
      const updatedPrefs = [];
      
      // Process each preference key/value pair
      for (const [key, value] of Object.entries(preferences)) {
        const updatedPref = await tx.userPreference.upsert({
          where: {
            userId_key: {
              userId,
              key
            }
          },
          update: { value },
          create: {
            userId,
            key,
            value
          },
          select: {
            key: true,
            value: true,
            updatedAt: true
          }
        });
        updatedPrefs.push(updatedPref);
      }
      
      return updatedPrefs;
    });

    // Log activity
    await prisma.userActivity.create({
      data: {
        userId,
        action: "PREFERENCES_UPDATE",
        details: { 
          keys: Object.keys(preferences),
          timestamp: new Date()
        }
      }
    });

    return res.status(200).json({
      success: true,
      message: "Preferences updated successfully",
      data: results
    });
  } catch (error) {
    console.error("Error updating preferences:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update preferences",
      error: error.message
    });
  }
};

// Update security settings
export const updateSecuritySettings = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Authorize
    if (userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to update security settings"
      });
    }

    const validation = securitySettingsSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid security settings",
        errors: validation.error.flatten().fieldErrors
      });
    }

    const { loginAlerts } = validation.data;

    // Update security settings in user preferences
    let updatedSettings = {};
    
    // Only proceed if we have security preferences
    const securityPreference = await prisma.userPreference.findUnique({
      where: {
        userId_key: {
          userId,
          key: "securityOptions"
        }
      }
    });

    let currentSettings = securityPreference?.value || {
      twoFactorAuthentication: false,
      loginAlerts: true
    };

    // Update only the provided fields
    if (loginAlerts !== undefined) {
      currentSettings.loginAlerts = loginAlerts;
    }

    // Save the updated settings
    updatedSettings = await prisma.userPreference.upsert({
      where: {
        userId_key: {
          userId,
          key: "securityOptions"
        }
      },
      update: {
        value: currentSettings
      },
      create: {
        userId,
        key: "securityOptions",
        value: currentSettings
      }
    });

    // Log activity
    await prisma.userActivity.create({
      data: {
        userId,
        action: "SECURITY_SETTINGS_UPDATE",
        details: { 
          fields: Object.keys(validation.data),
          timestamp: new Date()
        }
      }
    });

    return res.status(200).json({
      success: true,
      message: "Security settings updated successfully",
      data: updatedSettings
    });
  } catch (error) {
    console.error("Error updating security settings:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update security settings",
      error: error.message
    });
  }
};