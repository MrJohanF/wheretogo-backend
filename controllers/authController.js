// controllers/authController.js
import bcrypt from "bcryptjs";
import { setupDefaultPreferences } from "../utils/userPreferences.js";
import { prisma } from "../prisma/prisma.js";
import { SignJWT } from "jose";
import { registerSchema } from "../validation/authSchema.js";
import { verifyToken, verifyBackupCode } from "../utils/twoFactor.js";
import { createUserSession } from "../utils/sessionTracker.js";
import { z } from "zod";

// Updated login schema to support 2FA
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  twoFactorToken: z.string().optional(),
  backupCode: z.string().optional(),
});

const createToken = async (userId, sessionId = null) => {
  const payload = { userId };
  if (sessionId) {
    payload.sessionId = sessionId;
  }
  
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .setIssuedAt()
    .sign(new TextEncoder().encode(process.env.JWT_SECRET));

  return token;
};

// Cookie options remain the same
const cookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "none",
    secure: true,
    path: "/"
  };
};

export const register = async (req, res) => {
  try {
    const validation = registerSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        message: "Invalid request body",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { name, email, password } = validation.data;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Use a transaction to ensure everything happens or nothing happens
    const { user, session } = await prisma.$transaction(async (tx) => {
      // Create the user
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Set up default preferences within the transaction
      const preferencesToCreate = [];
      
      for (const [key, value] of Object.entries(DEFAULT_PREFERENCES)) {
        preferencesToCreate.push({
          userId: newUser.id,
          key,
          value
        });
      }
      
      await tx.userPreference.createMany({
        data: preferencesToCreate
      });

      // Create session (adapted for transaction)
      const newSession = await createUserSessionTx(tx, newUser.id, req);
      
      return { user: newUser, session: newSession };
    });

    const token = await createToken(user.id, session.id);
    
    // Set the token in the cookie with the cookie options
    res.cookie("token", token, cookieOptions());

    res.status(201).json({
      message: "User created successfully",
      user,
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Helper function for creating sessions within a transaction
const createUserSessionTx = async (tx, userId, req) => {
  const ipAddress = req.ip || req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  const userAgent = req.headers["user-agent"];
  
  // Basic version for use within a transaction
  return tx.userSession.create({
    data: {
      userId,
      ipAddress,
      userAgent,
      isActive: true,
      lastActivity: new Date()
    }
  });
};

export const login = async (req, res) => {
  try {
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      return res
        .status(400)
        .json({
          message: "Invalid request body",
          errors: validation.error.flatten().fieldErrors,
        });
    }

    const { email, password, twoFactorToken, backupCode } = validation.data;

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        twoFactorEnabled: true,
      }
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if 2FA is needed
    if (user.twoFactorEnabled) {
      // If no token or backup code provided, tell client to ask for it
      if (!twoFactorToken && !backupCode) {
        return res.status(200).json({
          message: "Two-factor authentication required",
          requireTwoFactor: true,
          userId: user.id
        });
      }

      let isValidSecondFactor = false;

      // Check token if provided
      if (twoFactorToken) {
        isValidSecondFactor = await verifyToken(user.id, twoFactorToken);
      } 
      // Check backup code if provided
      else if (backupCode) {
        isValidSecondFactor = await verifyBackupCode(user.id, backupCode);
      }

      if (!isValidSecondFactor) {
        return res.status(401).json({
          message: "Invalid verification code",
          requireTwoFactor: true
        });
      }
    }

    // At this point authentication is successful
    // Create enhanced session
    const session = await createUserSession(user.id, req);

    // Generate token with session ID
    const token = await createToken(user.id, session.id);

    res.cookie("token", token, cookieOptions());

    const { password: _, twoFactorEnabled: __, ...userData } = user;

    res.status(200).json({
      user: userData,
      hasTwoFactor: user.twoFactorEnabled
    });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const logout = async (req, res) => {
  try {
    // Update session to inactive
    if (req.user?.id && req.sessionId) {
      await prisma.userSession.update({
        where: {
          id: parseInt(req.sessionId)
        },
        data: {
          endTime: new Date(),
          isActive: false
        }
      });
    }

    res.clearCookie("token", cookieOptions());
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Error logging out:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const me = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "No authenticated user found" });
    }
    
    // Get 2FA status
    const { twoFactorEnabled } = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { twoFactorEnabled: true }
    });
    
    res.status(200).json({
      user: {
        ...req.user,
        hasTwoFactor: twoFactorEnabled
      },
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};