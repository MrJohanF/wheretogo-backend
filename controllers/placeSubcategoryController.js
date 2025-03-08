import { prisma } from "../prisma/prisma.js";
const prisma = new PrismaClient();

// Add a subcategory to a place
export const addSubcategoryToPlace = async (req, res) => {
  try {
    const { placeId, subcategoryId } = req.body;

    // Validate required fields
    if (!placeId || !subcategoryId) {
      return res.status(400).json({
        success: false,
        message: "Place ID and Subcategory ID are required fields"
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

    // Check if subcategory exists
    const subcategory = await prisma.subcategory.findUnique({
      where: { id: parseInt(subcategoryId) },
      include: {
        category: true
      }
    });

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: "Subcategory not found"
      });
    }

    // Check if the relationship already exists
    const existingRelation = await prisma.placeSubcategory.findUnique({
      where: {
        placeId_subcategoryId: {
          placeId: parseInt(placeId),
          subcategoryId: parseInt(subcategoryId)
        }
      }
    });

    if (existingRelation) {
      return res.status(400).json({
        success: false,
        message: "This place already has this subcategory"
      });
    }

    // Create the relationship
    const placeSubcategory = await prisma.placeSubcategory.create({
      data: {
        placeId: parseInt(placeId),
        subcategoryId: parseInt(subcategoryId)
      },
      include: {
        place: true,
        subcategory: {
          include: {
            category: true
          }
        }
      }
    });

    return res.status(201).json({
      success: true,
      placeSubcategory
    });

  } catch (error) {
    console.error("Error adding subcategory to place:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add subcategory to place",
      error: error.message
    });
  }
};

// Get all subcategories for a place
export const getPlaceSubcategories = async (req, res) => {
  try {
    const { placeId } = req.params;

    const placeSubcategories = await prisma.placeSubcategory.findMany({
      where: {
        placeId: parseInt(placeId)
      },
      include: {
        subcategory: {
          include: {
            category: true
          }
        }
      }
    });

    return res.json({
      success: true,
      subcategories: placeSubcategories.map(ps => ps.subcategory)
    });

  } catch (error) {
    console.error("Error fetching place subcategories:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch place subcategories",
      error: error.message
    });
  }
};

// Get all places for a subcategory
export const getSubcategoryPlaces = async (req, res) => {
  try {
    const { subcategoryId } = req.params;

    const subcategoryPlaces = await prisma.placeSubcategory.findMany({
      where: {
        subcategoryId: parseInt(subcategoryId)
      },
      include: {
        place: {
          include: {
            images: true,
            categories: {
              include: {
                category: true
              }
            },
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
      places: subcategoryPlaces.map(sp => sp.place)
    });

  } catch (error) {
    console.error("Error fetching subcategory places:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch subcategory places",
      error: error.message
    });
  }
};

// Remove a subcategory from a place
export const removeSubcategoryFromPlace = async (req, res) => {
  try {
    const { placeId, subcategoryId } = req.params;

    // Check if the relationship exists
    const existingRelation = await prisma.placeSubcategory.findUnique({
      where: {
        placeId_subcategoryId: {
          placeId: parseInt(placeId),
          subcategoryId: parseInt(subcategoryId)
        }
      }
    });

    if (!existingRelation) {
      return res.status(404).json({
        success: false,
        message: "This place does not have this subcategory"
      });
    }

    // Delete the relationship
    await prisma.placeSubcategory.delete({
      where: {
        placeId_subcategoryId: {
          placeId: parseInt(placeId),
          subcategoryId: parseInt(subcategoryId)
        }
      }
    });

    return res.json({
      success: true,
      message: "Subcategory removed from place successfully"
    });

  } catch (error) {
    console.error("Error removing subcategory from place:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove subcategory from place",
      error: error.message
    });
  }
}; 