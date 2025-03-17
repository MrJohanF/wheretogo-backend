import { prisma } from "../prisma/prisma.js";
import { deleteImageFromCloudinary, extractPublicIdFromUrl } from "../utils/cloudinary.js";

// Get all places
export const getAllPlaces = async (req, res) => {
  try {
    // Extract query parameters with defaults
    const {
      limit = 50,               // Number of places to return
      page = 1,                 // Page number for pagination
      featured = 'false',       // Filter for featured places
      sort = 'name',            // Field to sort by
      order = 'asc',            // Sort direction
      categoryId,               // Filter by category ID
      search,                   // Search term in name/description
      minRating                 // Minimum rating filter
    } = req.query;
    
    // Convert string parameters to appropriate types
    const limitNum = parseInt(limit);
    const pageNum = parseInt(page);
    const skip = (pageNum - 1) * limitNum;
    
    // Build the filter conditions
    const whereClause = {};
    
    // Filter by featured status - we'll use places with high ratings or manually curated
    if (featured === 'true') {
      // Here we'll use rating as a proxy for "featured" 
      // Modify this based on how you want to determine featured places
      whereClause.rating = {
        gte: 4.5  // Places with rating of 4.5 or higher
      };
      
      // Alternative approach: If you have a specific field for featured places
      // whereClause.isFeatured = true;
    }
    
    // Filter by category if specified
    if (categoryId) {
      whereClause.categories = {
        some: {
          categoryId: parseInt(categoryId)
        }
      };
    }
    
    // Filter by minimum rating if specified
    if (minRating) {
      whereClause.rating = {
        gte: parseFloat(minRating)
      };
    }
    
    // Add search filter if specified
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count for pagination info
    const totalCount = await prisma.place.count({
      where: whereClause
    });

    // Fetch places with all the applied filters
    const places = await prisma.place.findMany({
      where: whereClause,
      include: {
        categories: {
          include: {
            category: true
          }
        },
        subcategories: {
          include: {
            subcategory: {
              include: {
                category: true
              }
            }
          }
        },
        images: true,
        operatingHours: true,
        features: {
          include: {
            feature: true
          }
        },
        popularItems: true,
        _count: {
          select: {
            reviews: true,
            favorites: true
          }
        }
      },
      orderBy: {
        [sort]: order
      },
      skip: skip,
      take: limitNum
    });

    // Return paginated results with metadata
    return res.json({
      success: true,
      places,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(totalCount / limitNum)
      }
    });

  } catch (error) {
    console.error("Error fetching places:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch places",
      error: error.message
    });
  }
};

// Get a single place by ID
export const getPlaceById = async (req, res) => {
  try {
    const { id } = req.params;

    const place = await prisma.place.findUnique({
      where: { id: parseInt(id) },
      include: {
        categories: {
          include: {
            category: true
          }
        },
        subcategories: {
          include: {
            subcategory: {
              include: {
                category: true
              }
            }
          }
        },
        images: true,
        operatingHours: true,
        features: {
          include: {
            feature: true
          }
        },
        popularItems: true,
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            }
          },
          orderBy: {
            date: 'desc'
          }
        },
        _count: {
          select: {
            reviews: true,
            favorites: true
          }
        }
      }
    });

    if (!place) {
      return res.status(404).json({
        success: false,
        message: "Place not found"
      });
    }

    return res.json({
      success: true,
      place
    });

  } catch (error) {
    console.error("Error fetching place:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch place",
      error: error.message
    });
  }
};

// Create a new place
export const createPlace = async (req, res) => {
  try {
    const {
      name,
      description,
      rating,
      priceLevel,
      address,
      phone,
      website,
      cuisine,
      isOpenNow,
      latitude,
      longitude,
      categories,
      subcategories,
      images,
      operatingHours,
      features,
      popularItems
    } = req.body;

    // Validate required fields
    if (!name || !address) {
      return res.status(400).json({
        success: false,
        message: "Name and address are required fields"
      });
    }

    // Create the place with all its relations in a transaction
    const place = await prisma.$transaction(async (prisma) => {
      // 1. Create the main place record
      const newPlace = await prisma.place.create({
        data: {
          name,
          description,
          rating,
          priceLevel,
          address,
          phone,
          website,
          cuisine,
          isOpenNow,
          latitude,
          longitude
        }
      });

      // 2. Add categories if provided
      if (categories && categories.length > 0) {
        await prisma.placeCategory.createMany({
          data: categories.map(categoryId => ({
            placeId: newPlace.id,
            categoryId: parseInt(categoryId)
          }))
        });
      }

      // 3. Add subcategories if provided
      if (subcategories && subcategories.length > 0) {
        await prisma.placeSubcategory.createMany({
          data: subcategories.map(subcategoryId => ({
            placeId: newPlace.id,
            subcategoryId: parseInt(subcategoryId)
          }))
        });
      }

      // 4. Add images if provided
      if (images && images.length > 0) {
        await prisma.image.createMany({
          data: images.map(image => ({
            placeId: newPlace.id,
            url: image.url,
            altText: image.altText,
            isFeatured: image.isFeatured || false
          }))
        });
      }

      // 5. Add operating hours if provided
      if (operatingHours && operatingHours.length > 0) {
        await prisma.operatingHour.createMany({
          data: operatingHours.map(hour => ({
            placeId: newPlace.id,
            day: hour.day,
            openingTime: hour.openingTime,
            closingTime: hour.closingTime
          }))
        });
      }

      // 6. Add features if provided
      if (features && features.length > 0) {
        await prisma.placeFeature.createMany({
          data: features.map(featureId => ({
            placeId: newPlace.id,
            featureId: parseInt(featureId)
          }))
        });
      }

      // 7. Add popular items if provided
      if (popularItems && popularItems.length > 0) {
        await prisma.popularItem.createMany({
          data: popularItems.map(item => ({
            placeId: newPlace.id,
            name: item
          }))
        });
      }

      // Return the created place with all its relations
      return await prisma.place.findUnique({
        where: { id: newPlace.id },
        include: {
          categories: {
            include: {
              category: true
            }
          },
          subcategories: {
            include: {
              subcategory: true
            }
          },
          images: true,
          operatingHours: true,
          features: {
            include: {
              feature: true
            }
          },
          popularItems: true
        }
      });
    });

    return res.status(201).json({
      success: true,
      place
    });

  } catch (error) {
    console.error("Error creating place:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create place",
      error: error.message
    });
  }
};

// Update a place
export const updatePlace = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      rating,
      priceLevel,
      address,
      phone,
      website,
      cuisine,
      isOpenNow,
      latitude,
      longitude,
      categories,
      subcategories,
      images,
      operatingHours,
      features,
      popularItems
    } = req.body;

    // Check if place exists
    const existingPlace = await prisma.place.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingPlace) {
      return res.status(404).json({
        success: false,
        message: "Place not found"
      });
    }

    // Update the place and its relations in a transaction
    const updatedPlace = await prisma.$transaction(async (prisma) => {
      // 1. Update the main place record
      const place = await prisma.place.update({
        where: { id: parseInt(id) },
        data: {
          name,
          description,
          rating,
          priceLevel,
          address,
          phone,
          website,
          cuisine,
          isOpenNow,
          latitude,
          longitude
        }
      });

      // 2. Update categories if provided
      if (categories) {
        // Delete existing categories
        await prisma.placeCategory.deleteMany({
          where: { placeId: parseInt(id) }
        });

        // Add new categories
        if (categories.length > 0) {
          await prisma.placeCategory.createMany({
            data: categories.map(categoryId => ({
              placeId: parseInt(id),
              categoryId: parseInt(categoryId)
            }))
          });
        }
      }

      // 3. Update subcategories if provided
      if (subcategories) {
        // Delete existing subcategories
        await prisma.placeSubcategory.deleteMany({
          where: { placeId: parseInt(id) }
        });

        // Add new subcategories
        if (subcategories.length > 0) {
          await prisma.placeSubcategory.createMany({
            data: subcategories.map(subcategoryId => ({
              placeId: parseInt(id),
              subcategoryId: parseInt(subcategoryId)
            }))
          });
        }
      }

      // 4. Update images if provided
      if (images) {
        // Delete existing images
        await prisma.image.deleteMany({
          where: { placeId: parseInt(id) }
        });

        // Add new images
        if (images.length > 0) {
          await prisma.image.createMany({
            data: images.map(image => ({
              placeId: parseInt(id),
              url: image.url,
              altText: image.altText,
              isFeatured: image.isFeatured || false
            }))
          });
        }
      }

      // 5. Update operating hours if provided
      if (operatingHours) {
        // Delete existing hours
        await prisma.operatingHour.deleteMany({
          where: { placeId: parseInt(id) }
        });

        // Add new hours
        if (operatingHours.length > 0) {
          await prisma.operatingHour.createMany({
            data: operatingHours.map(hour => ({
              placeId: parseInt(id),
              day: hour.day,
              openingTime: hour.openingTime,
              closingTime: hour.closingTime
            }))
          });
        }
      }

      // 6. Update features if provided
      if (features) {
        // Delete existing features
        await prisma.placeFeature.deleteMany({
          where: { placeId: parseInt(id) }
        });

        // Add new features
        if (features.length > 0) {
          await prisma.placeFeature.createMany({
            data: features.map(featureId => ({
              placeId: parseInt(id),
              featureId: parseInt(featureId)
            }))
          });
        }
      }

      // 7. Update popular items if provided
      if (popularItems) {
        // Delete existing items
        await prisma.popularItem.deleteMany({
          where: { placeId: parseInt(id) }
        });

        // Add new items
        if (popularItems.length > 0) {
          await prisma.popularItem.createMany({
            data: popularItems.map(item => ({
              placeId: parseInt(id),
              name: item
            }))
          });
        }
      }

      // Return the updated place with all its relations
      return await prisma.place.findUnique({
        where: { id: parseInt(id) },
        include: {
          categories: {
            include: {
              category: true
            }
          },
          subcategories: {
            include: {
              subcategory: true
            }
          },
          images: true,
          operatingHours: true,
          features: {
            include: {
              feature: true
            }
          },
          popularItems: true
        }
      });
    });

    return res.json({
      success: true,
      place: updatedPlace
    });

  } catch (error) {
    console.error("Error updating place:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update place",
      error: error.message
    });
  }
};

// Delete a place
export const deletePlace = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if place exists
    const place = await prisma.place.findUnique({
      where: { id: parseInt(id) },
      include: {
        images: true // Include images to get their URLs
      }
    });

    if (!place) {
      return res.status(404).json({
        success: false,
        message: "Place not found"
      });
    }

    // Extract Cloudinary publicIds from image URLs to delete them later
    const imagePublicIds = [];
    if (place.images && place.images.length > 0) {
      for (const image of place.images) {
        const publicId = extractPublicIdFromUrl(image.url);
        if (publicId) {
          imagePublicIds.push(publicId);
        } else {
          console.warn(`Could not extract publicId from image URL: ${image.url}`);
        }
      }
    }

    // Delete the place and all its relations in a transaction
    await prisma.$transaction(async (prisma) => {
      // Delete all related records first
      await prisma.placeCategory.deleteMany({
        where: { placeId: parseInt(id) }
      });

      await prisma.placeSubcategory.deleteMany({
        where: { placeId: parseInt(id) }
      });

      await prisma.placeFeature.deleteMany({
        where: { placeId: parseInt(id) }
      });

      await prisma.image.deleteMany({
        where: { placeId: parseInt(id) }
      });

      await prisma.operatingHour.deleteMany({
        where: { placeId: parseInt(id) }
      });

      await prisma.popularItem.deleteMany({
        where: { placeId: parseInt(id) }
      });

      await prisma.review.deleteMany({
        where: { placeId: parseInt(id) }
      });

      await prisma.favorite.deleteMany({
        where: { placeId: parseInt(id) }
      });

      await prisma.reservation.deleteMany({
        where: { placeId: parseInt(id) }
      });

      // Finally, delete the place itself
      await prisma.place.delete({
        where: { id: parseInt(id) }
      });
    });

    // After the database transaction is complete, delete the images from Cloudinary
    const cloudinaryResults = [];
    if (imagePublicIds.length > 0) {
      console.log(`Deleting ${imagePublicIds.length} images from Cloudinary for place ID ${id}`);
      for (const publicId of imagePublicIds) {
        try {
          const result = await deleteImageFromCloudinary(publicId);
          cloudinaryResults.push({ publicId, success: result?.result === 'ok' });
        } catch (err) {
          console.error(`Error deleting image ${publicId} from Cloudinary:`, err);
          cloudinaryResults.push({ publicId, success: false, error: err.message });
        }
      }
    }

    return res.json({
      success: true,
      message: "Place and all related records deleted successfully",
      cloudinaryResults: cloudinaryResults.length > 0 ? cloudinaryResults : undefined
    });

  } catch (error) {
    console.error("Error deleting place:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete place",
      error: error.message
    });
  }
}; 