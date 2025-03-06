import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";
import { registerSchema, loginSchema } from "../validation/authSchema.js";

const prisma = new PrismaClient();

const createToken = async (userId) => {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .setIssuedAt()
    .sign(new TextEncoder().encode(process.env.JWT_SECRET));

  return token;
};

// Helper to generate the cookie options

const cookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,  // Prevents JavaScript access (more secure)
    sameSite: "none", // Required for cross-site cookies
    secure: true, // Secure must be true in production
    domain: isProduction ? ".vercel.app" : undefined,
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  };
};

// Register a new user

export const register = async (req, res) => {
  try {
    const validation = registerSchema.safeParse(req.body);

    if (!validation.success) {
      return res
        .status(400)
        .json({
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

    const user = await prisma.user.create({
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

    const token = await createToken(user.id);

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

    const { email, password } = validation.data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Record user session on login
    await prisma.userSession.create({
      data: {
        userId: user.id,
        ipAddress: req.ip || null,
        userAgent: req.headers["user-agent"] || null,
      },
    });

    const token = await createToken(user.id);

    res.cookie("token", token, cookieOptions());

    res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const logout = async (req, res) => {
  try {

    // Record user session on logout
   
    if (req.user?.id) {
        await prisma.userSession.updateMany({
          where: {
            userId: req.user.id,
            endTime: null
          },
          data: {
            endTime: new Date()
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
    res.status(200).json({
      user: req.user,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
