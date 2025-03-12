// controllers/cloudinaryController.js
import { deleteImageFromCloudinary, findImagesByPublicId, extractPublicIdFromUrl } from '../utils/cloudinary.js';
import { prisma } from '../prisma/prisma.js';

export const deleteImage = async (req, res) => {
  try {
    const { publicId, imageId, categoryId } = req.body;
    
    if (!publicId) {
      console.log('Missing publicId in request');
      return res.status(400).json({ 
        success: false, 
        message: 'Missing publicId parameter' 
      });
    }
    
    console.log(`Attempting to delete Cloudinary image: ${publicId}`);
    
    // Call the utility function with the extracted publicId
    const result = await deleteImageFromCloudinary(publicId);
    
    console.log('Delete result:', result);
    
    // If the image was successfully deleted from Cloudinary,
    // also clean up the database references
    if (result && result.result === 'ok') {
      let dbUpdateResults = [];

      // Case 1: If an image ID was provided, delete from Images table
      if (imageId) {
        const deletedImage = await prisma.image.delete({
          where: { id: parseInt(imageId) }
        });
        dbUpdateResults.push({ type: 'image', id: imageId, success: true });
        console.log(`Deleted image ID ${imageId} from database`);
      }
      
      // Case 2: If a category ID was provided, clear the imagePublicId
      if (categoryId) {
        const updatedCategory = await prisma.category.update({
          where: { id: parseInt(categoryId) },
          data: { imagePublicId: null, image: null }
        });
        dbUpdateResults.push({ type: 'category', id: categoryId, success: true });
        console.log(`Cleared image for category ID ${categoryId}`);
      }

      // If no specific ID was provided or we want to be thorough, try to find and delete all references
      if (!imageId || !categoryId) {
        // Try to find if this publicId is used in a category
        const categories = await prisma.category.findMany({
          where: { imagePublicId: publicId }
        });

        // Update all matching categories
        if (categories.length > 0) {
          for (const category of categories) {
            const updatedCategory = await prisma.category.update({
              where: { id: category.id },
              data: { imagePublicId: null, image: null }
            });
            dbUpdateResults.push({ type: 'category', id: category.id, success: true });
            console.log(`Cleared image for category ID ${category.id} by publicId match`);
          }
        }

        // Also check for images in the Image table that might be using this publicId in their URL
        const imagesWithPublicId = await findImagesByPublicId(publicId);
        
        // Delete all matching images
        if (imagesWithPublicId.length > 0) {
          for (const image of imagesWithPublicId) {
            // Only delete if not already deleted by imageId
            if (!imageId || image.id !== parseInt(imageId)) {
              const deletedImage = await prisma.image.delete({
                where: { id: image.id }
              });
              dbUpdateResults.push({ type: 'image', id: image.id, success: true });
              console.log(`Deleted image ID ${image.id} from database by publicId match in URL`);
            }
          }
        }

        // If no matches were found at all
        if (categories.length === 0 && imagesWithPublicId.length === 0 && !imageId && !categoryId) {
          console.warn('Could not find any database records matching the publicId: ' + publicId);
          dbUpdateResults.push({ type: 'warning', message: 'No database records found matching the publicId' });
        }
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Image deleted successfully from Cloudinary and database updated',
        databaseUpdates: dbUpdateResults
      });
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Failed to delete image from Cloudinary',
        details: result
      });
    }
  } catch (error) {
    console.error('Error in cloudinary delete endpoint:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
};

// Add a new utility endpoint to extract publicId from URL
export const getPublicIdFromUrl = async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing url parameter' 
      });
    }
    
    const publicId = extractPublicIdFromUrl(url);
    
    if (!publicId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Could not extract publicId from the provided URL' 
      });
    }
    
    return res.json({
      success: true,
      publicId
    });
  } catch (error) {
    console.error('Error extracting publicId from URL:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
};

// Here we can add other Cloudinary-related functions here in the future
// export const optimizeImage = async (req, res) => {...}
// export const getImageMetadata = async (req, res) => {...}