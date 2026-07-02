// ═══════════════════════════════════════════════════════════════════════════════
// Helpers de subida/optimización de evidencias (client-side · base64/enlace)
// ═══════════════════════════════════════════════════════════════════════════════
// Mismo enfoque que el módulo de Evidencias de Rutas: imágenes se redimensionan
// y comprimen en el navegador; otros archivos hasta 10MB se leen como data URL;
// archivos grandes/videos se manejan por enlace. Sin dependencias nuevas.

export const esImagen = (e: { tipo: string; url: string }): boolean =>
  e.tipo === "Foto" || /^data:image\//i.test(e.url) || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(e.url);

export const fmtSize = (b: number): string =>
  b > 1_048_576 ? `${(b / 1_048_576).toFixed(1)} MB` : b > 1024 ? `${Math.round(b / 1024)} KB` : `${b} B`;

// Las subidas (data URL) se muestran directo; los enlaces externos pasan por el
// proxy server-side (renderiza públicos y evita CORS).
export const imgSrc = (url: string): string =>
  /^data:/i.test(url) ? url : `/api/evidencia-img?raw=1&url=${encodeURIComponent(url)}`;

export function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("No se pudo leer el archivo"));
    r.readAsDataURL(file);
  });
}

export function resizeImage(file: File, maxDim = 1280, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const r = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * r); height = Math.round(height * r);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas no disponible"));
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("Imagen inválida"));
    readAsDataURL(file).then(d => { img.src = d; }).catch(reject);
  });
}

export const estimarBytes = (dataUrl: string): number =>
  Math.round((dataUrl.length - (dataUrl.indexOf(",") + 1)) * 0.75);

export async function procesarArchivo(file: File): Promise<{ dataUrl: string; size: number; tipo: string }> {
  if (file.type.startsWith("image/")) {
    const dataUrl = await resizeImage(file);
    return { dataUrl, size: estimarBytes(dataUrl), tipo: "Foto" };
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("El archivo supera 10 MB. Usa 'Pegar enlace' para archivos grandes (videos, etc.).");
  }
  const dataUrl = await readAsDataURL(file);
  const tipo = file.type.includes("pdf") ? "PDF"
    : /sheet|excel|csv|spreadsheet/.test(file.type) ? "Excel"
    : file.type.startsWith("video/") ? "Video" : "Otro";
  return { dataUrl, size: file.size, tipo };
}
