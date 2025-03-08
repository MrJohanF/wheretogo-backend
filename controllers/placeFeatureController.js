import { prisma } from "../prisma/prisma.js";
const prisma = new PrismaClient();

// Add a feature to a place
export const addFeatureToPlace = async (req, res) => {
  try {
    const { placeId, featureId } = req.body;

    // Validate required fields
    if (!placeId || !featureId) {
      return res.status(400).json({
        success: false,
        message: "Place ID and Feature ID are required fields"
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

    // Check if feature exists
    const feature = await prisma.feature.findUnique({
      where: { id: parseInt(featureId) }
    });

    if (!feature) {
      return res.status(404).json({
        success: false,
        message: "Feature not found"
      });
    }

    // Check if the relationship already exists
    const existingRelation = await prisma.placeFeature.findUnique({
      where: {
        placeId_featureId: {
          placeId: parseInt(placeId),
          featureId: parseInt(featureId)
        }
      }
    });

    if (existingRelation) {
      return res.status(400).json({
        success: false,
        message: "This place already has this feature"
      });
    }

    // Create the relationship
    const placeFeature = await prisma.placeFeature.create({
      data: {
        placeId: parseInt(placeId),
        featureId: parseInt(featureId)
      },
      include: {
        place: true,
        feature: true
      }
    });

    return res.status(201).json({
      success: true,
      placeFeature
    });

  } catch (error) {
    console.error("Error adding feature to place:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add feature to place",
      error: error.message
    });
  }
};

// Get all features for a place
export const getPlaceFeatures = async (req, res) => {
  try {
    const { placeId } = req.params;

    const placeFeatures = await prisma.placeFeature.findMany({
      where: {
        placeId: parseInt(placeId)
      },
      include: {
        feature: true
      }
    });

    return res.json({
      success: true,
      features: placeFeatures.map(pf => pf.feature)
    });

  } catch (error) {
    console.error("Error fetching place features:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch place features",
      error: error.message
    });
  }
};

// Get all places with a specific feature
export const getFeaturePlaces = async (req, res) => {
  try {
    const { featureId } = req.params;

    const featurePlaces = await prisma.placeFeature.findMany({
      where: {
        featureId: parseInt(featureId)
      },
      include: {
        place: {
          include: {
            images: true,
            categories: {
              include: {
                category: true
              }
            }
          }
        }
      }
    });

    return res.json({
      success: true,
      places: featurePlaces.map(fp => fp.place)
    });

  } catch (error) {
    console.error("Error fetching feature places:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch feature places",
      error: error.message
    });
  }
};

// Remove a feature from a place
export const removeFeatureFromPlace = async (req, res) => {
  try {
    const { placeId, featureId } = req.params;

    // Check if the relationship exists
    const existingRelation = await prisma.placeFeature.findUnique({
      where: {
        placeId_featureId: {
          placeId: parseInt(placeId),
          featureId: parseInt(featureId)
        }
      }
    });

    if (!existingRelation) {
      return res.status(404).json({
        success: false,
        message: "This place does not have this feature"
      });
    }

    // Delete the relationship
    await prisma.placeFeature.delete({
      where: {
        placeId_featureId: {
          placeId: parseInt(placeId),
          featureId: parseInt(featureId)
        }
      }
    });

    return res.json({
      success: true,
      message: "Feature removed from place successfully"
    });

  } catch (error) {
    console.error("Error removing feature from place:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove feature from place",
      error: error.message
    });
  }
}; 