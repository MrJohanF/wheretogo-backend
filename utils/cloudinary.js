// utils/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';
import { prisma } from '../prisma/prisma.js';

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

/**
 * Extrae el publicId de una URL de Cloudinary
 * @param {string} url - La URL de la imagen de Cloudinary
 * @returns {string|null} - El publicId extraído o null si no se puede extraer
 */
export const extractPublicIdFromUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  
  try {
    // Verificar si es una URL de Cloudinary
    if (!url.includes('cloudinary.com')) return null;
    
    // Cloudinary URLs usually have this format:
    // https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/image_id.jpg
    // or
    // https://res.cloudinary.com/cloud_name/image/upload/folder/image_id.jpg
    
    const parts = url.split('/upload/');
    if (parts.length <= 1) return null;
    
    // Get the part after /upload/ and remove any version number (v1234567890/)
    let publicIdWithExtension = parts[1].replace(/^v\d+\//, '');
    
    // Remove the file extension if present
    const publicId = publicIdWithExtension.replace(/\.[^/.]+$/, '');
    
    return publicId;
  } catch (error) {
    console.error('Error al extraer publicId de URL:', error);
    return null;
  }
};

/**
 * Busca imágenes en la base de datos que podrían estar utilizando un publicId específico de Cloudinary
 * @param {string} publicId - El publicId de Cloudinary a buscar
 * @returns {Promise<Array>} - Array de objetos de imágenes que coinciden con el publicId
 */
export const findImagesByPublicId = async (publicId) => {
  if (!publicId) return [];
  
  try {
    // El cloud_name es necesario para construir la URL completa
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    
    // Diferentes patrones de URL que Cloudinary puede usar
    const possibleUrlPatterns = [
      `https://res.cloudinary.com/${cloudName}/image/upload/${publicId}`,
      `https://res.cloudinary.com/${cloudName}/image/upload/v[0-9]+/${publicId}`,
      `http://res.cloudinary.com/${cloudName}/image/upload/${publicId}`,
      `http://res.cloudinary.com/${cloudName}/image/upload/v[0-9]+/${publicId}`
    ];
    
    // Buscar imágenes que coincidan con alguno de los patrones de URL
    const images = await prisma.image.findMany({
      where: {
        OR: possibleUrlPatterns.map(pattern => ({
          url: {
            contains: publicId
          }
        }))
      }
    });
    
    return images;
  } catch (error) {
    console.error('Error al buscar imágenes por publicId:', error);
    return [];
  }
};


