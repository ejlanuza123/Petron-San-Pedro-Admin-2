// src/utils/imageCompressor.js

/**
 * Compresses an image File or Blob before uploading to Supabase Storage or server.
 * Uses native HTML5 Canvas API - zero third-party dependencies required.
 *
 * @param {File|Blob} file - Original image file from file input or camera
 * @param {Object} options - Compression configuration
 * @param {number} [options.maxWidth=1200] - Maximum width in pixels
 * @param {number} [options.maxHeight=1200] - Maximum height in pixels
 * @param {number} [options.quality=0.8] - JPEG quality (0.1 to 1.0)
 * @param {string} [options.mimeType='image/jpeg'] - Output mime type
 * @returns {Promise<File>} Compressed File object
 */
export async function compressImage(file, options = {}) {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.8,
    mimeType = 'image/jpeg',
  } = options;

  if (!file || !file.type || !file.type.startsWith('image/')) {
    return file;
  }

  // Skip SVG or GIF to preserve vector sharpness/animations
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = (err) => reject(err);
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = (err) => reject(err);
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio preserving dimensions
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }

            const fileName = file.name ? file.name.replace(/\.[^/.]+$/, '.jpg') : 'compressed.jpg';
            const compressedFile = new File([blob], fileName, {
              type: mimeType,
              lastModified: Date.now(),
            });

            // Return compressed file if smaller than original
            if (compressedFile.size < file.size) {
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          mimeType,
          quality
        );
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}
