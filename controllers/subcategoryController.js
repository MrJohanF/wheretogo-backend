import { prisma } from "../prisma/prisma.js";


// Create a new subcategory
export const createSubcategory = async (req, res) => {
  try {
    const { name, categoryId } = req.body;

    // Validate required fields
    if (!name || !categoryId) {
      return res.status(400).json({
        success: false,
        message: "Name and categoryId are required fields"
      });
    }

    // Check if the category exists
    const category = await prisma.category.findUnique({
      where: { id: parseInt(categoryId) }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    // Create the subcategory
    const subcategory = await prisma.subcategory.create({
      data: {
        name,
        categoryId: parseInt(categoryId)
      },
      include: {
        category: true
      }
    });

    return res.status(201).json({
      success: true,
      subcategory
    });

  } catch (error) {
    console.error("Error creating subcategory:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create subcategory",
      error: error.message
    });
  }
};

// Get all subcategories
export const getAllSubcategories = async (req, res) => {
  try {
    const { categoryId } = req.query;

    const whereClause = categoryId ? { categoryId: parseInt(categoryId) } : {};

    const subcategories = await prisma.subcategory.findMany({
      where: whereClause,
      include: {
        category: true,
        _count: {
          select: {
            places: true // Count of places in this subcategory
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    return res.json({
      success: true,
      subcategories
    });

  } catch (error) {
    console.error("Error fetching subcategories:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch subcategories",
      error: error.message
    });
  }
};

// Get a single subcategory by ID
export const getSubcategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const subcategory = await prisma.subcategory.findUnique({
      where: { id: parseInt(id) },
      include: {
        category: true,
        places: {
          include: {
            place: true
          }
        }
      }
    });

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: "Subcategory not found"
      });
    }

    return res.json({
      success: true,
      subcategory
    });

  } catch (error) {
    console.error("Error fetching subcategory:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch subcategory",
      error: error.message
    });
  }
};

// Update a subcategory
export const updateSubcategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, categoryId } = req.body;

    // Check if the category exists if categoryId is provided
    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: parseInt(categoryId) }
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found"
        });
      }
    }

    const updatedSubcategory = await prisma.subcategory.update({
      where: { id: parseInt(id) },
      data: {
        name,
        ...(categoryId && { categoryId: parseInt(categoryId) })
      },
      include: {
        category: true
      }
    });

    return res.json({
      success: true,
      subcategory: updatedSubcategory
    });

  } catch (error) {
    console.error("Error updating subcategory:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update subcategory",
      error: error.message
    });
  }
};

// Delete a subcategory
export const deleteSubcategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Use a transaction to handle related records
    await prisma.$transaction(async (prisma) => {
      // First, delete all place-subcategory relationships
      await prisma.placeSubcategory.deleteMany({
        where: { subcategoryId: parseInt(id) }
      });

      // Then delete the subcategory
      await prisma.subcategory.delete({
        where: { id: parseInt(id) }
      });
    });

    return res.json({
      success: true,
      message: "Subcategory deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting subcategory:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete subcategory",
      error: error.message
    });
  }
}; 