/**
 * Client-side high fidelity WebP image converter and media helper.
 * Converts PNG and other image formats into WebP before transmission 
 * while maintaining crystal clear visual quality and minimizing storage.
 */

export async function convertImageToWebP(file: File, quality = 0.92): Promise<{ blob: Blob; dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    reader.onerror = (err) => reject(err);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Canvas 2D context not available'));
      }

      // Draw image to canvas
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Convert to WebP format with high quality
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return reject(new Error('WebP conversion failed'));
          }
          const dataUrl = canvas.toDataURL('image/webp', quality);
          resolve({
            blob,
            dataUrl,
            width: canvas.width,
            height: canvas.height,
          });
        },
        'image/webp',
        quality
      );
    };

    img.onerror = (err) => reject(err);

    reader.readAsDataURL(file);
  });
}

export function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
