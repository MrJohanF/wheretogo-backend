import { prisma } from "../prisma/prisma.js";
import { featureSchema } from "../validation/featureSchema.js";

const prisma = new PrismaClient();

// Create a new feature
export const createFeature = async (req, res) => {
  try {
    const validation = featureSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid request body",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { name } = validation.data;

    // Check if feature already exists
    const existingFeature = await prisma.feature.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } }
    });

    if (existingFeature) {
      return res.status(400).json({
        success: false,
        message: "Feature already exists"
      });
    }

    const feature = await prisma.feature.create({
      data: { name }
    });

    return res.status(201).json({
      success: true,
      feature
    });

  } catch (error) {
    console.error("Error creating feature:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create feature",
      error: error.message
    });
  }
};

// Get all features
export const getAllFeatures = async (req, res) => {
  try {
    const features = await prisma.feature.findMany({
      include: {
        _count: {
          select: {
            places: true // Count of places using this feature
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    return res.json({
      success: true,
      features
    });

  } catch (error) {
    console.error("Error fetching features:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch features",
      error: error.message
    });
  }
};

// Get a single feature by ID
export const getFeatureById = async (req, res) => {
  try {
    const { id } = req.params;

    const feature = await prisma.feature.findUnique({
      where: { id: parseInt(id) },
      include: {
        places: {
          include: {
            place: true
          }
        }
      }
    });

    if (!feature) {
      return res.status(404).json({
        success: false,
        message: "Feature not found"
      });
    }

    return res.json({
      success: true,
      feature
    });

  } catch (error) {
    console.error("Error fetching feature:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch feature",
      error: error.message
    });
  }
};

// Update a feature
export const updateFeature = async (req, res) => {
  try {
    const { id } = req.params;
    const validation = featureSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid request body",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { name } = validation.data;

    // Check if the new name already exists for another feature
    const existingFeature = await prisma.feature.findFirst({
      where: {
        AND: [
          { name: { equals: name, mode: 'insensitive' } },
          { id: { not: parseInt(id) } }
        ]
      }
    });

    if (existingFeature) {
      return res.status(400).json({
        success: false,
        message: "A feature with this name already exists"
      });
    }

    const updatedFeature = await prisma.feature.update({
      where: { id: parseInt(id) },
      data: { name }
    });

    return res.json({
      success: true,
      feature: updatedFeature
    });

  } catch (error) {
    console.error("Error updating feature:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update feature",
      error: error.message
    });
  }
};

// Delete a feature
export const deleteFeature = async (req, res) => {
  try {
    const { id } = req.params;

    // Use a transaction to handle related records
    await prisma.$transaction(async (prisma) => {
      // First, delete all place-feature relationships
      await prisma.placeFeature.deleteMany({
        where: { featureId: parseInt(id) }
      });

      // Then delete the feature
      await prisma.feature.delete({
        where: { id: parseInt(id) }
      });
    });

    return res.json({
      success: true,
      message: "Feature deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting feature:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete feature",
      error: error.message
    });
  }
}; 