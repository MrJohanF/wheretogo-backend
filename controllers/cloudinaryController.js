// controllers/cloudinaryController.js
import { deleteImageFromCloudinary } from '../utils/cloudinary.js';

export const deleteImage = async (req, res) => {
  try {
    const { publicId } = req.body;
    
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
    
    if (result && result.result === 'ok') {
      return res.status(200).json({ 
        success: true, 
        message: 'Image deleted successfully' 
      });
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Failed to delete image',
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

// Here we can add other Cloudinary-related functions here in the future
// export const optimizeImage = async (req, res) => {...}
// export const getImageMetadata = async (req, res) => {...}