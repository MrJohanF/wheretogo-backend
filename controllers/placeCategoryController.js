import { prisma } from "../prisma/prisma.js";
const prisma = new PrismaClient();

// Add a category to a place
export const addCategoryToPlace = async (req, res) => {
  try {
    const { placeId, categoryId } = req.body;

    // Validate required fields
    if (!placeId || !categoryId) {
      return res.status(400).json({
        success: false,
        message: "Place ID and Category ID are required fields"
      });
    }

    // Check if place exists
    const place = await prisma.place.findUnique({
      where: { id: parseInt(placeId) }
    });

    if (!place) {
      return res.status(404).json({
        success: false,
        message: "Place not found"
      });
    }

    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id: parseInt(categoryId) }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    // Check if the relationship already exists
    const existingRelation = await prisma.placeCategory.findUnique({
      where: {
        placeId_categoryId: {
          placeId: parseInt(placeId),
          categoryId: parseInt(categoryId)
        }
      }
    });

    if (existingRelation) {
      return res.status(400).json({
        success: false,
        message: "This place already has this category"
      });
    }

    // Create the relationship
    const placeCategory = await prisma.placeCategory.create({
      data: {
        placeId: parseInt(placeId),
        categoryId: parseInt(categoryId)
      },
      include: {
        place: true,
        category: true
      }
    });

    return res.status(201).json({
      success: true,
      placeCategory
    });

  } catch (error) {
    console.error("Error adding category to place:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add category to place",
      error: error.message
    });
  }
};

// Get all categories for a place
export const getPlaceCategories = async (req, res) => {
  try {
    const { placeId } = req.params;

    const placeCategories = await prisma.placeCategory.findMany({
      where: {
        placeId: parseInt(placeId)
      },
      include: {
        category: true
      }
    });

    return res.json({
      success: true,
      categories: placeCategories.map(pc => pc.category)
    });

  } catch (error) {
    console.error("Error fetching place categories:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch place categories",
      error: error.message
    });
  }
};

// Get all places for a category
export const getCategoryPlaces = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const categoryPlaces = await prisma.placeCategory.findMany({
      where: {
        categoryId: parseInt(categoryId)
      },
      include: {
        place: {
          include: {
            images: true,
            features: {
              include: {
                feature: true
              }
            }
          }
        }
      }
    });

    return res.json({
      success: true,
      places: categoryPlaces.map(cp => cp.place)
    });

  } catch (error) {
    console.error("Error fetching category places:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch category places",
      error: error.message
    });
  }
};

// Remove a category from a place
export const removeCategoryFromPlace = async (req, res) => {
  try {
    const { placeId, categoryId } = req.params;

    // Check if the relationship exists
    const existingRelation = await prisma.placeCategory.findUnique({
      where: {
        placeId_categoryId: {
          placeId: parseInt(placeId),
          categoryId: parseInt(categoryId)
        }
      }
    });

    if (!existingRelation) {
      return res.status(404).json({
        success: false,
        message: "This place does not have this category"
      });
    }

    // Delete the relationship
    await prisma.placeCategory.delete({
      where: {
        placeId_categoryId: {
          placeId: parseInt(placeId),
          categoryId: parseInt(categoryId)
        }
      }
    });

    return res.json({
      success: true,
      message: "Category removed from place successfully"
    });

  } catch (error) {
    console.error("Error removing category from place:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove category from place",
      error: error.message
    });
  }
}; 