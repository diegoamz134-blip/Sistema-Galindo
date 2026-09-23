// =========================================================================
// UTILIDAD DE COMPRESIÓN INTELIGENTE DE IMÁGENES EN EL NAVEGADOR
// Convierte imágenes a WebP de alta definición manteniendo peso ultra liviano (<100 KB)
// =========================================================================

export async function comprimirFotoWeb(
  file: File,
  maxDimension = 1000,
  calidad = 0.82
): Promise<{ dataUrl: string; sizeKb: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let { width, height } = img;
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas no disponible en el navegador'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        let dataUrl = canvas.toDataURL('image/webp', calidad);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', calidad);
        }

        const head = dataUrl.indexOf(',') + 1;
        const sizeBytes = Math.round(((dataUrl.length - head) * 3) / 4);
        const sizeKb = Math.max(1, Math.round(sizeBytes / 1024));

        resolve({ dataUrl, sizeKb });
      };
      img.onerror = () => reject(new Error('No se pudo cargar la imagen seleccionada'));
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo de la galería'));
  });
}
