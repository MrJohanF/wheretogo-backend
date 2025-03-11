import { prisma } from "../prisma/prisma.js";
import bcrypt from "bcryptjs";
import { z } from "zod";

// Validation schema for creating profile
const createProfileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  avatar: z.string().url("Invalid URL format").optional()
});

// Validation schema for updating profile
const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  email: z.string().email("Invalid email format").optional(),
  currentPassword: z.string().min(6).optional(),
  newPassword: z.string().min(6, "Password must be at least 6 characters").optional(),
  avatar: z.string().url("Invalid URL format").optional()
}).refine(data => {
  // If newPassword is provided, currentPassword must also be provided
  if (data.newPassword && !data.currentPassword) {
    return false;
  }
  return true;
}, {
  message: "Current password is required to set new password",
  path: ["currentPassword"]
});

// Create a new user profile
export const createProfile = async (req, res) => {
  try {
    const validation = createProfileSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid request body",
        errors: validation.error.flatten().fieldErrors
      });
    }

    const { name, email, password, avatar } = validation.data;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email is already registered"
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user profile
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        avatar,
        role: "USER" // Default role
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        twoFactorEnabled: true
      }
    });

    // Record the activity
    await prisma.userActivity.create({
      data: {
        userId: newUser.id,
        action: "PROFILE_CREATED",
        details: {
          name: name,
          email: email
        }
      }
    });

    return res.status(201).json({
      success: true,
      message: "Profile created successfully",
      user: newUser
    });

  } catch (error) {
    console.error("Error creating profile:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create profile",
      error: error.message
    });
  }
};

// Update user's personal information
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const validation = updateProfileSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid request body",
        errors: validation.error.flatten().fieldErrors
      });
    }

    const { name, email, currentPassword, newPassword, avatar } = validation.data;

    // Get current user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        avatar: true,
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

    // Handle password update first
    if (currentPassword || newPassword) {
      // Both passwords must be provided together
      if (!(currentPassword && newPassword)) {
        return res.status(400).json({
          success: false,
          message: "Both current password and new password must be provided together"
        });
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Current password is incorrect"
        });
      }

      // If we get here, password is valid, prepare password update
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
      });

      // Record password change activity
      await prisma.userActivity.create({
        data: {
          userId,
          action: "PASSWORD_CHANGE",
          details: {
            updatedFields: ["password"]
          }
        }
      });

      return res.status(200).json({
        success: true,
        message: "Password updated successfully"
      });
    }

    // Handle other profile updates
    const updateData = {};
    
    if (name) updateData.name = name;
    if (avatar) updateData.avatar = avatar;
    
    // Handle email update
    if (email && email !== user.email) {
      const emailExists = await prisma.user.findFirst({
        where: {
          email,
          id: { not: userId }
        }
      });

      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "Email is already taken"
        });
      }
      
      updateData.email = email;
    }

    // Only proceed with update if there are fields to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update"
      });
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        twoFactorEnabled: true
      }
    });

    // Record the activity
    await prisma.userActivity.create({
      data: {
        userId,
        action: "UPDATE_PROFILE",
        details: {
          updatedFields: Object.keys(updateData)
        }
      }
    });

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser
    });

  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message
    });
  }
};

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