import { prisma } from "../prisma/prisma.js";
import { deleteImageFromCloudinary } from '../utils/cloudinary.js';

// Create a new category
export const createCategory = async (req, res) => {
  try {
    const {
      name,
      icon,
      description,
      image,
      imagePublicId,
      color,
      subcategories
    } = req.body;

    // Validate required fields
    if (!name || !icon) {
      return res.status(400).json({
        success: false,
        message: "Name and icon are required fields"
      });
    }

    // Create the category with its subcategories in a transaction
    const category = await prisma.$transaction(async (prisma) => {
      // 1. Create the main category record
      const newCategory = await prisma.category.create({
        data: {
          name,
          icon,
          description,
          image,
          imagePublicId,
          color,
          count: 0, // Initialize count to 0
          isTrending: false // Initialize trending status to false
        }
      });

      // 2. Add subcategories if provided
      if (subcategories && subcategories.length > 0) {
        await prisma.subcategory.createMany({
          data: subcategories.map(subcategory => ({
            name: subcategory.name,
            categoryId: newCategory.id
          }))
        });
      }

      // Return the created category with its subcategories
      return await prisma.category.findUnique({
        where: { id: newCategory.id },
        include: {
          subcategories: true
        }
      });
    });

    return res.status(201).json({
      success: true,
      category
    });

  } catch (error) {
    console.error("Error creating category:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create category",
      error: error.message
    });
  }
};

// Get all categories
export const getAllCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        subcategories: true,
        _count: {
          select: {
            places: true // Count of places in this category
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    return res.json({
      success: true,
      categories
    });

  } catch (error) {
    console.error("Error fetching categories:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
      error: error.message
    });
  }
};

// Update a category
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      icon,
      description,
      image,
      imagePublicId,
      color,
      isTrending
    } = req.body;

      // Obtener la categoría actual para ver si hay que eliminar una imagen anterior
      const currentCategory = await prisma.category.findUnique({
        where: { id: parseInt(id) }
      });


       // Si la imagen ha cambiado y había una anterior, eliminarla de Cloudinary
    if (
      currentCategory?.imagePublicId && 
      imagePublicId !== currentCategory.imagePublicId &&
      image !== currentCategory.image // Verificamos que realmente cambió
    ) {
      try {
        await deleteImageFromCloudinary(currentCategory.imagePublicId);
        console.log(`Imagen anterior eliminada al actualizar categoría ${id}`);
      } catch (cloudinaryError) {
        console.error("Error al eliminar imagen anterior:", cloudinaryError);
        // Continuamos con la actualización aunque falle la eliminación
      }
    }

    const updatedCategory = await prisma.category.update({
      where: { id: parseInt(id) },
      data: {
        name,
        icon,
        description,
        image,
        imagePublicId,
        color,
        isTrending
      },
      include: {
        subcategories: true
      }
    });

    return res.json({
      success: true,
      category: updatedCategory
    });

  } catch (error) {
    console.error("Error updating category:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update category",
      error: error.message
    });
  }
};

// Delete a category
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const categoryId = parseInt(id);

    // Obtener la categoría para acceder al publicId de la imagen
    const category = await prisma.category.findUnique({
      where: { id: categoryId }
    });


      // Eliminar la imagen de Cloudinary si existe
      if (category?.imagePublicId) {
        try {
          await deleteImageFromCloudinary(category.imagePublicId);
          console.log(`Imagen eliminada al borrar categoría ${id}`);
        } catch (cloudinaryError) {
          console.error("Error al eliminar imagen de Cloudinary:", cloudinaryError);
          // Continuamos con la eliminación aunque falle la eliminación de la imagen
        }
      }

    // Use a transaction to ensure both operations succeed or fail together
    await prisma.$transaction(async (prisma) => {
      // First, delete all subcategories
      await prisma.subcategory.deleteMany({
        where: { categoryId }
      });

      // Then delete the category
      await prisma.category.delete({
        where: { id: categoryId }
      });
    });

    return res.json({
      success: true,
      message: "Category and its subcategories deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting category:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete category",
      error: error.message
    });
  }
}; 



