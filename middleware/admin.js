// middleware/admin.js
import { prisma } from "../prisma/prisma.js";
const prisma = new PrismaClient();

// This middleware checks if the authenticated user is an admin
const adminMiddleware = async (req, res, next) => {
  try {
    // Assuming the user ID is stored in req.user.id from authMiddleware
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id
      }
    });
    
    // Check if user has ADMIN role
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ 
        message: "Access denied: Admin privileges required" 
      });
    }
    
    next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export default adminMiddleware;