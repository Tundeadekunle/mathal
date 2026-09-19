/**
 * Passport Photograph Image Processing Utility
 * Mathal International Schools Management System
 * 
 * Provides client-side validation, canvas crop/resize, and JPEG compression
 * for student passport photos to ensure crystal-clear display on report cards
 * and fast persistence directly into Neon PostgreSQL.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateImageFile(file: File, maxSizeBytes = 5 * 1024 * 1024): ValidationResult {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: "Please upload a valid image file (JPG, PNG, or WebP).",
    };
  }

  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please upload a photo under 5MB.`,
    };
  }

  return { valid: true };
}

/**
 * Resizes and compresses an uploaded image file into a standard passport-proportioned
 * Base64 JPEG data URL suitable for immediate display and database storage.
 */
export async function compressPassportImage(
  file: File,
  targetWidth = 360,
  targetHeight = 440,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("Failed to read image file."));
    };

    reader.onload = () => {
      const img = new Image();
      img.onerror = () => {
        reject(new Error("Failed to decode image data."));
      };

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            reject(new Error("Unable to create canvas rendering context."));
            return;
          }

          // Fill white background (useful if transparent PNG)
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, targetWidth, targetHeight);

          // Center-crop / cover algorithm so passport photo doesn't distort
          const imgAspect = img.width / img.height;
          const canvasAspect = targetWidth / targetHeight;

          let renderWidth = targetWidth;
          let renderHeight = targetHeight;
          let offsetX = 0;
          let offsetY = 0;

          if (imgAspect > canvasAspect) {
            // Source is wider than canvas: match heights and crop width
            renderHeight = targetHeight;
            renderWidth = img.width * (targetHeight / img.height);
            offsetX = -(renderWidth - targetWidth) / 2;
          } else {
            // Source is taller than canvas: match widths and crop height
            renderWidth = targetWidth;
            renderHeight = img.height * (targetWidth / img.width);
            offsetY = -(renderHeight - targetHeight) / 2;
          }

          ctx.drawImage(img, offsetX, offsetY, renderWidth, renderHeight);

          const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
          resolve(compressedBase64);
        } catch (err) {
          reject(err);
        }
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}
