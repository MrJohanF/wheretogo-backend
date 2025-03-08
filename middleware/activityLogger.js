// middleware/activityLogger.js
import { prisma } from "../prisma/prisma.js";

const activityLogger = async (req, res, next) => {
  // Only log for authenticated users
  if (!req.user?.id) {
    return next();
  }
  
  try {
    // For page views (non-API GET requests)
    if (req.method === 'GET' && !req.path.startsWith('/api/')) {
      await prisma.pageView.create({
        data: {
          userId: req.user.id,
          path: req.path,
          timestamp: new Date(),
        }
      });
    }
    
    // For search requests
    if (req.path.includes('/api/search') && req.method === 'GET') {
      await prisma.searchHistory.create({
        data: {
          userId: req.user.id,
          query: req.query.q || '',
          timestamp: new Date(),
        }
      });
    }
    
  } catch (error) {
    console.error('Failed to log user activity:', error);
  }
  
  next();
};

export default activityLogger;