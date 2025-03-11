// utils/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';

// Configurar Cloudinary
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

/**
 * Elimina una imagen de Cloudinary por su publicId
 */
export const deleteImageFromCloudinary = async (publicId) => {
  if (!publicId) return null;
  
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log(`Imagen eliminada de Cloudinary: ${publicId}`);
    return result;
  } catch (error) {
    console.error('Error al eliminar imagen de Cloudinary:', error);
    throw error;
  }
};


