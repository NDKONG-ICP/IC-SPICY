import imageCompression from 'browser-image-compression';

/**
 * 🌶️ IC SPICY Image Compression Utility
 * Optimizes images for on-chain storage while maintaining quality
 */

export class ImageCompressor {
  constructor() {
    this.maxWidth = 800; // Reduced for better on-chain storage
    this.maxHeight = 600; // Reduced for better on-chain storage
    this.quality = 0.7; // Reduced quality for better compression
    this.maxSizeMB = 0.25; // 250KB max for canister efficiency
  }

  /**
   * Compress image with smart optimization
   * @param {File} imageFile - Original image file
   * @param {Object} options - Compression options
   * @returns {Promise<{compressedFile: File, stats: Object}>}
   */
  async compressImage(imageFile, options = {}) {
    try {
      const {
        maxWidth = this.maxWidth,
        maxHeight = this.maxHeight,
        quality = this.quality,
        maxSizeMB = this.maxSizeMB
      } = options;

      console.log(`🖼️ Compressing image: ${imageFile.name} (${(imageFile.size / 1024 / 1024).toFixed(2)}MB)`);

      // First pass: Basic compression
      let compressedFile = await imageCompression(imageFile, {
        maxWidthOrHeight: Math.max(maxWidth, maxHeight),
        useWebWorker: true,
        maxSizeMB,
        fileType: 'image/jpeg',
        quality
      });

      // If still too large, apply more aggressive compression
      if (compressedFile.size > maxSizeMB * 1024 * 1024) {
        console.log('🔄 Applying aggressive compression...');
        compressedFile = await imageCompression(compressedFile, {
          maxWidthOrHeight: Math.max(maxWidth, maxHeight) * 0.8,
          useWebWorker: true,
          maxSizeMB: maxSizeMB * 0.8,
          fileType: 'image/jpeg',
          quality: quality * 0.9
        });
      }

      // Calculate compression stats
      const originalSize = imageFile.size;
      const compressedSize = compressedFile.size;
      const compressionRatio = (1 - (compressedSize / originalSize)) * 100;
      const spaceSaved = originalSize - compressedSize;

      const stats = {
        originalSize,
        compressedSize,
        compressionRatio: parseFloat(compressionRatio.toFixed(2)),
        spaceSaved,
        originalDimensions: await this.getImageDimensions(imageFile),
        compressedDimensions: await this.getImageDimensions(compressedFile),
        format: compressedFile.type,
        filename: compressedFile.name
      };

      console.log(`✅ Compression complete: ${(compressedSize / 1024 / 1024).toFixed(2)}MB (${compressionRatio.toFixed(1)}% reduction)`);

      return { compressedFile, stats };
    } catch (error) {
      console.error('❌ Image compression failed:', error);
      throw new Error(`Image compression failed: ${error.message}`);
    }
  }

  /**
   * Get image dimensions
   * @param {File} file - Image file
   * @returns {Promise<{width: number, height: number}>}
   */
  async getImageDimensions(file) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Convert file to Uint8Array for canister storage
   * @param {File} file - Image file
   * @returns {Promise<Uint8Array>}
   */
  async fileToUint8Array(file) {
    return new Promise((resolve, reject) => {
      // Ensure we have a valid Blob or File object
      if (!file || !(file instanceof Blob)) {
        reject(new Error(`Invalid file object: ${typeof file}, expected Blob or File`));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const arrayBuffer = reader.result;
        const uint8Array = new Uint8Array(arrayBuffer);
        resolve(uint8Array);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Convert Uint8Array back to File for display
   * @param {Uint8Array} uint8Array - Image data
   * @param {string} filename - Filename
   * @param {string} mimeType - MIME type
   * @returns {File}
   */
  uint8ArrayToFile(uint8Array, filename, mimeType = 'image/jpeg') {
    const blob = new Blob([uint8Array], { type: mimeType });
    return new File([blob], filename, { type: mimeType });
  }

  /**
   * Create thumbnail from image
   * @param {File} imageFile - Original image
   * @param {number} maxSize - Maximum thumbnail size
   * @returns {Promise<File>}
   */
  async createThumbnail(imageFile, maxSize = 300) {
    try {
      const thumbnail = await imageCompression(imageFile, {
        maxWidthOrHeight: maxSize,
        useWebWorker: true,
        maxSizeMB: 0.1, // 100KB max for thumbnails
        fileType: 'image/jpeg',
        quality: 0.7
      });

      return thumbnail;
    } catch (error) {
      console.error('❌ Thumbnail creation failed:', error);
      throw error;
    }
  }

  /**
   * Validate image file
   * @param {File} file - Image file to validate
   * @returns {Object} Validation result
   */
  validateImage(file) {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    
    const errors = [];
    
    if (file.size > maxSize) {
      errors.push(`Image size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (10MB)`);
    }
    
    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not supported. Please use JPEG, PNG, WebP, or GIF`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get compression recommendations based on file size
   * @param {File} file - Image file
   * @returns {Object} Compression recommendations
   */
  getCompressionRecommendations(file) {
    const sizeMB = file.size / 1024 / 1024;
    
    if (sizeMB <= 0.25) {
      return {
        quality: 0.8,
        maxWidth: 800,
        maxHeight: 600,
        maxSizeMB: 0.25
      };
    } else if (sizeMB <= 1) {
      return {
        quality: 0.7,
        maxWidth: 700,
        maxHeight: 525,
        maxSizeMB: 0.25
      };
    } else if (sizeMB <= 3) {
      return {
        quality: 0.6,
        maxWidth: 600,
        maxHeight: 450,
        maxSizeMB: 0.25
      };
    } else {
      return {
        quality: 0.5,
        maxWidth: 500,
        maxHeight: 375,
        maxSizeMB: 0.25
      };
    }
  }

  /**
   * Ensure we have a valid File object (convert Blob to File if needed)
   * @param {Blob|File} blobOrFile - Blob or File object
   * @param {string} filename - Filename for the file
   * @returns {File}
   */
  ensureFileObject(blobOrFile, filename = 'compressed-image.jpg') {
    if (blobOrFile instanceof File) {
      return blobOrFile;
    } else if (blobOrFile instanceof Blob) {
      // Convert Blob to File
      return new File([blobOrFile], filename, { type: blobOrFile.type || 'image/jpeg' });
    } else {
      throw new Error(`Invalid object type: ${typeof blobOrFile}, expected Blob or File`);
    }
  }

  /**
   * Optimize image specifically for on-chain storage
   * @param {File} imageFile - Original image file
   * @returns {Promise<{compressedFile: File, stats: Object, uint8Array: Uint8Array}>}
   */
  async optimizeForCanister(imageFile) {
    try {
      console.log(`🌐 Optimizing image for on-chain storage: ${imageFile.name} (${(imageFile.size / 1024 / 1024).toFixed(2)}MB)`);
      
      // Apply aggressive compression for canister storage
      const compressedResult = await this.compressImage(imageFile, {
        maxWidth: 600, // Smaller dimensions for canister efficiency
        maxHeight: 450,
        quality: 0.6, // Lower quality for better compression
        maxSizeMB: 0.2 // 200KB target for optimal canister storage
      });

      // Ensure we have a proper File object
      const compressedFile = this.ensureFileObject(compressedResult, imageFile.name);
      console.log('✅ Compressed file validated:', {
        type: compressedFile.type,
        size: compressedFile.size,
        name: compressedFile.name,
        isFile: compressedFile instanceof File,
        isBlob: compressedFile instanceof Blob
      });

      // Convert to Uint8Array for canister storage
      const uint8Array = await this.fileToUint8Array(compressedFile);
      
      // Calculate final stats
      const stats = {
        originalSize: imageFile.size,
        compressedSize: compressedFile.size,
        canisterOptimized: true,
        compressionRatio: ((1 - (compressedFile.size / imageFile.size)) * 100).toFixed(1),
        spaceSaved: imageFile.size - compressedFile.size,
        finalDimensions: await this.getImageDimensions(compressedFile)
      };

      console.log(`✅ Canister optimization complete: ${(compressedFile.size / 1024).toFixed(1)}KB (${stats.compressionRatio}% reduction)`);
      
      return { compressedFile, stats, uint8Array };
    } catch (error) {
      console.error('❌ Canister optimization failed:', error);
      throw new Error(`Canister optimization failed: ${error.message}`);
    }
  }
}

// Export singleton instance
export const imageCompressor = new ImageCompressor();

// Export utility functions
export const compressImage = (file, options) => imageCompressor.compressImage(file, options);
export const fileToUint8Array = (file) => imageCompressor.fileToUint8Array(file);
export const uint8ArrayToFile = (uint8Array, filename, mimeType) => imageCompressor.uint8ArrayToFile(uint8Array, filename, mimeType);
export const createThumbnail = (file, maxSize) => imageCompressor.createThumbnail(file, maxSize);
export const validateImage = (file) => imageCompressor.validateImage(file);
export const getCompressionRecommendations = (file) => imageCompressor.getCompressionRecommendations(file);
export const optimizeForCanister = (file) => imageCompressor.optimizeForCanister(file);
export const ensureFileObject = (blobOrFile, filename) => imageCompressor.ensureFileObject(blobOrFile, filename);
