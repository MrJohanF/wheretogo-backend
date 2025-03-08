// controllers/userActivityController.js
import { prisma } from "../prisma/prisma.js";

// Get user activities based on filter and time range
export const getUserActivity = async (req, res) => {
  try {
    const { filter = "all", timeRange = "24h" } = req.query;

    // Calculate the date range based on timeRange
    const now = new Date();
    let dateFrom = new Date();

    switch (timeRange) {
      case "1h":
        dateFrom.setHours(now.getHours() - 1);
        break;
      case "6h":
        dateFrom.setHours(now.getHours() - 6);
        break;
      case "24h":
        dateFrom.setDate(now.getDate() - 1);
        break;
      case "7d":
        dateFrom.setDate(now.getDate() - 7);
        break;
      case "30d":
        dateFrom.setDate(now.getDate() - 30);
        break;
    }

    let activities = [];

    // Get search history
    if (filter === "all" || filter === "searches") {
      const searches = await prisma.searchHistory.findMany({
        where: {
          timestamp: {
            gte: dateFrom,
          },
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
        orderBy: {
          timestamp: "desc",
        },
        take: 50,
      });

      activities = [
        ...activities,
        ...searches.map((search) => ({
          id: `search_${search.id}`,
          userId: search.userId,
          user: search.user,
          action: "Search",
          details: { query: search.query },
          timestamp: search.timestamp,
        })),
      ];
    }

    // Get page views
    if (filter === "all" || filter === "pageViews") {
      const pageViews = await prisma.pageView.findMany({
        where: {
          timestamp: {
            gte: dateFrom,
          },
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
        orderBy: {
          timestamp: "desc",
        },
        take: 50,
      });

      activities = [
        ...activities,
        ...pageViews.map((view) => ({
          id: `pageview_${view.id}`,
          userId: view.userId,
          user: view.user,
          action: "Page View",
          details: { path: view.path, duration: view.duration },
          timestamp: view.timestamp,
        })),
      ];
    }

    // Get reservations
    if (filter === "all" || filter === "reservations") {
      const reservations = await prisma.reservation.findMany({
        where: {
          createdAt: {
            gte: dateFrom,
          },
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              avatar: true,
            },
          },
          place: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 30,
      });

      activities = [
        ...activities,
        ...reservations.map((res) => ({
          id: `reservation_${res.id}`,
          userId: res.userId,
          user: res.user,
          action: "Reservation",
          details: {
            place: res.place.name,
            date: res.date,
            guests: res.guests,
            status: res.status,
          },
          timestamp: res.createdAt,
        })),
      ];
    }

    // Get favorites
    if (filter === "all" || filter === "favorites") {
      const favorites = await prisma.favorite.findMany({
        where: {
          createdAt: {
            gte: dateFrom,
          },
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              avatar: true,
            },
          },
          place: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 30,
      });

      activities = [
        ...activities,
        ...favorites.map((fav) => ({
          id: `favorite_${fav.userId}_${fav.placeId}`,
          userId: fav.userId,
          user: fav.user,
          action: "Added Favorite",
          details: { place: fav.place.name },
          timestamp: fav.createdAt,
        })),
      ];
    }

    // Sort all activities by timestamp (newest first)
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({ activities });
  } catch (error) {
    console.error("Error fetching user activity:", error);
    res.status(500).json({ error: "Failed to fetch user activity" });
  }
};

// Get count of currently active users
export const getActiveUsers = async (req, res) => {
  try {
    const { timeRange = "24h" } = req.query;

    // Calculate the date range
    const now = new Date();
    let dateFrom = new Date();

    switch (timeRange) {
      case "1h":
        dateFrom.setHours(now.getHours() - 1);
        break;
      case "6h":
        dateFrom.setHours(now.getHours() - 6);
        break;
      case "24h":
        dateFrom.setDate(now.getDate() - 1);
        break;
      case "7d":
        dateFrom.setDate(now.getDate() - 7);
        break;
      case "30d":
        dateFrom.setDate(now.getDate() - 30);
        break;
    }

    // Get active users with details using just select (not both include and select)
    const activeUserSessions = await prisma.userSession.findMany({
      where: {
        startTime: {
          gte: dateFrom,
        },
        endTime: null, // Session not ended
      },
      select: {
        id: true,
        userId: true,
        startTime: true,
        ipAddress: true,
        userAgent: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        startTime: "desc",
      },
    });

    // Format the response data and calculate active duration
    const activeUsers = activeUserSessions.map((session) => {
      // Calculate duration (current time - start time)
      const durationMs = now - new Date(session.startTime);

      // Format duration
      const durationFormatted = formatDuration(durationMs);

      // Duration in minutes (for sorting or filtering)
      const durationMinutes = Math.floor(durationMs / (1000 * 60));

      return {
        id: session.id,
        userId: session.userId,
        name: session.user.name,
        email: session.user.email,
        startTime: session.startTime,
        ipAddress: session.ipAddress || "Unknown",
        userAgent: session.userAgent || "Unknown",
        activeDuration: durationFormatted,
        activeMinutes: durationMinutes,
      };
    });

    // Also include the total count
    const totalActiveUsers = activeUsers.length;

    res.json({
      activeUsers,
      totalActiveUsers,
    });
  } catch (error) {
    console.error("Error fetching active users:", error);
    res.status(500).json({ error: "Failed to fetch active users" });
  }
};

// Helper function to format duration in a readable way
function formatDuration(ms) {
  // Convert milliseconds to seconds
  let seconds = Math.floor(ms / 1000);

  // Calculate hours, minutes, and remaining seconds
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);
  seconds %= 60;

  // Format the string based on duration
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

// Get dashboard statistics
export const getDashboardStats = async (req, res) => {
  try {
    const { timeRange = "24h" } = req.query;

    // Calculate the date range
    const now = new Date();
    let dateFrom = new Date();

    switch (timeRange) {
      case "1h":
        dateFrom.setHours(now.getHours() - 1);
        break;
      case "6h":
        dateFrom.setHours(now.getHours() - 6);
        break;
      case "24h":
        dateFrom.setDate(now.getDate() - 1);
        break;
      case "7d":
        dateFrom.setDate(now.getDate() - 7);
        break;
      case "30d":
        dateFrom.setDate(now.getDate() - 30);
        break;
    }

    // Get page views count
    const pageViews = await prisma.pageView.count({
      where: {
        timestamp: {
          gte: dateFrom,
        },
      },
    });

    // Get searches count
    const searches = await prisma.searchHistory.count({
      where: {
        timestamp: {
          gte: dateFrom,
        },
      },
    });

    // Get reservations count
    const reservations = await prisma.reservation.count({
      where: {
        createdAt: {
          gte: dateFrom,
        },
      },
    });

    // Get favorites count
    const favorites = await prisma.favorite.count({
      where: {
        createdAt: {
          gte: dateFrom,
        },
      },
    });

    // Get active users count
    const activeUsers = await prisma.userSession.count({
      where: {
        startTime: {
          gte: dateFrom,
        },
        endTime: null,
      },
    });

    // Get activity chart data
    // This is a more complex query that groups activity by time intervals
    // For simplicity, let's return mock data here
    const activityChartData = generateActivityChartData(dateFrom, now);

    res.json({
      stats: {
        pageViews,
        searches,
        reservations,
        favorites,
        activeUsers,
      },
      activityChartData,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
};

// Helper function to generate mock chart data
// In a real implementation, you would query the database and group by time intervals
function generateActivityChartData(startDate, endDate) {
  const data = [];
  const totalHours = Math.ceil((endDate - startDate) / (1000 * 60 * 60));
  const interval = Math.max(1, Math.floor(totalHours / 8)); // Create ~8 data points

  for (let i = 0; i < totalHours; i += interval) {
    const time = new Date(startDate);
    time.setHours(time.getHours() + i);

    data.push({
      time: time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      date: time.toLocaleDateString(),
      pageViews: Math.floor(Math.random() * 50) + 10,
      searches: Math.floor(Math.random() * 20) + 5,
      reservations: Math.floor(Math.random() * 10),
      favorites: Math.floor(Math.random() * 15),
    });
  }

  return data;
}

// Record general user activity

const ACTIVITY_TYPES = {
  PLACE: {
    VIEW: "view_place",
    FAVORITE: "favorite_place",
    UNFAVORITE: "unfavorite_place",
    REVIEW: "review_place",
    RESERVATION: "make_reservation",
  },
  CATEGORY: {
    VIEW: "view_category",
    FAVORITE: "favorite_category",
    UNFAVORITE: "unfavorite_category",
  },
  USER: {
    UPDATE_PROFILE: "update_profile",
    UPDATE_PREFERENCES: "update_preferences",
    SEARCH: "perform_search",
  },
};

export const recordActivity = async (req, res) => {
  try {
    const {
      action,
      targetId, // ID of the place, category, etc.
      targetType, // 'place', 'category', 'profile', etc.
      details = {}, // Additional context about the action
    } = req.body;

    const userId = req.user.id;

    if (!action || !targetType) {
      return res.status(400).json({
        message: "Action and targetType are required",
        validTypes: Object.keys(ACTIVITY_TYPES),
      });
    }

    // Validate the action based on target type
    const validActions = Object.values(
      ACTIVITY_TYPES[targetType.toUpperCase()] || {}
    );

    if (!validActions.includes(action)) {
      return res.status(400).json({
        message: `Invalid action for type ${targetType}`,
        validActions,
      });
    }


    
    // Create activity with related updates in a transaction
    const result = await prisma.$transaction(async (prisma) => {
      // Record the main activity
      const activity = await prisma.userActivity.create({
        data: {
          userId,
          action,
          details: {
            ...details,
            targetId,
            targetType,
            timestamp: new Date().toISOString()
          },
          timestamp: new Date()
        }
      });

      // Perform related updates based on activity type
      switch (action) {
        case ACTIVITY_TYPES.PLACE.FAVORITE:
          if (targetId) {
            await prisma.favorite.create({
              data: {
                userId,
                placeId: parseInt(targetId),
                createdAt: new Date()
              }
            });
          }
          break;

        case ACTIVITY_TYPES.PLACE.UNFAVORITE:
          if (targetId) {
            await prisma.favorite.delete({
              where: {
                userId_placeId: {
                  userId,
                  placeId: parseInt(targetId)
                }
              }
            });
          }
          break;

        case ACTIVITY_TYPES.CATEGORY.FAVORITE:
          if (targetId) {
            await prisma.categoryFavorite.create({
              data: {
                userId,
                categoryId: parseInt(targetId),
                createdAt: new Date()
              }
            });
          }
          break;

        // Add more cases as needed
      }
    
      return activity;
    });

    return res.status(201).json({
      success: true,
      activity: result
    });

  } catch (error) {
    console.error("Error recording activity:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to record activity",
    });
  }
};

// Record page view
export const recordPageView = async (req, res) => {
  try {
    const { path, duration } = req.body;
    const userId = req.user.id;

    if (!path) {
      return res.status(400).json({ message: "Path is required" });
    }

    const pageView = await prisma.pageView.create({
      data: {
        userId,
        path,
        timestamp: new Date(),
        duration: duration || null,
      },
    });

    return res.status(201).json({
      success: true,
      pageView,
    });
  } catch (error) {
    console.error("Error recording page view:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to record page view",
    });
  }
};

// Record search history
export const recordSearchHistory = async (req, res) => {
  try {
    const { query } = req.body;
    const userId = req.user.id;

    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const search = await prisma.searchHistory.create({
      data: {
        userId,
        query,
        timestamp: new Date(),
      },
    });

    return res.status(201).json({
      success: true,
      search,
    });
  } catch (error) {
    console.error("Error recording search:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to record search history",
    });
  }
};
