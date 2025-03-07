import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

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