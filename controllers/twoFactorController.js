// controllers/twoFactorController.js
import { prisma } from "../prisma/prisma.js";
import { 
  setupTwoFactor, 
  verifyAndEnableTwoFactor, 
  generateBackupCodes 
} from "../utils/twoFactor.js";

// Set up 2FA
export const setup2FA = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, twoFactorEnabled: true }
    });
    
    if (user.twoFactorEnabled) {
      return res.status(400).json({ message: "2FA is already enabled" });
    }
    
    const { qrCodeUrl } = await setupTwoFactor(userId, user.email);
    
    res.status(200).json({
      message: "2FA setup ready",
      qrCodeUrl
    });
  } catch (error) {
    console.error("Error setting up 2FA:", error);
    res.status(500).json({ message: "Error setting up 2FA" });
  }
};

// Verify and enable 2FA
export const verify2FA = async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user.id;
    
    const result = await verifyAndEnableTwoFactor(userId, token);
    
    res.status(200).json({
      message: "2FA enabled successfully",
      backupCodes: result.backupCodes
    });
  } catch (error) {
    console.error("Error verifying 2FA:", error);
    res.status(400).json({ message: error.message });
  }
};

// Disable 2FA
export const disable2FA = async (req, res) => {
  try {
    const userId = req.user.id;
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null
      }
    });
    
    // Delete backup codes
    await prisma.twoFactorBackupCode.deleteMany({
      where: { userId }
    });
    
    res.status(200).json({ message: "2FA disabled successfully" });
  } catch (error) {
    console.error("Error disabling 2FA:", error);
    res.status(500).json({ message: "Error disabling 2FA" });
  }
};

// Get active sessions
export const getUserSessions = async (req, res) => {
  try {
    const sessions = await prisma.userSession.findMany({
      where: {
        userId: req.user.id,
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
        startTime: true
      }
    });
    
    res.status(200).json({ sessions });
  } catch (error) {
    console.error("Error retrieving sessions:", error);
    res.status(500).json({ message: "Error retrieving sessions" });
  }
};

// Get a specific session by ID
export const getSessionById = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const session = await prisma.userSession.findUnique({
      where: { userId: userId },
      select: {
        id: true,
        userId: true,
        ipAddress: true,
        deviceName: true,
        location: true,
        lastActivity: true,
        startTime: true,
        endTime: true,
        isActive: true,
        userAgent: true
      }
    });
    
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Make sure user owns the session
    if (session.userId !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    
    res.status(200).json({ session });
  } catch (error) {
    console.error("Error retrieving session:", error);
    res.status(500).json({ message: "Error retrieving session" });
  }
};

// End a specific session
export const endSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Make sure user owns the session
    const session = await prisma.userSession.findUnique({
      where: { id: parseInt(sessionId) },
      select: { userId: true }
    });
    
    if (!session || session.userId !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    
    await prisma.userSession.update({
      where: { id: parseInt(sessionId) },
      data: {
        isActive: false,
        endTime: new Date()
      }
    });
    
    res.status(200).json({ message: "Session ended successfully" });
  } catch (error) {
    console.error("Error ending session:", error);
    res.status(500).json({ message: "Error ending session" });
  }
};

// End all other sessions
export const endAllOtherSessions = async (req, res) => {
  try {
    await prisma.userSession.updateMany({
      where: {
        userId: req.user.id,
        id: { not: parseInt(req.sessionId) },
        isActive: true
      },
      data: {
        isActive: false,
        endTime: new Date()
      }
    });
    
    res.status(200).json({ message: "All other sessions ended" });
  } catch (error) {
    console.error("Error ending other sessions:", error);
    res.status(500).json({ message: "Error ending other sessions" });
  }
};