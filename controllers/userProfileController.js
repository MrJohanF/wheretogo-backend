import { prisma } from "../prisma/prisma.js";

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