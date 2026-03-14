/**
 * Utilidades Canvas para optimización de logos.
 * Funciones puras — sin dependencias de React.
 */

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * Auto-recorta whitespace y áreas transparentes alrededor del contenido.
 * Escanea los pixels para encontrar el bounding box del contenido real.
 */
export async function autoTrimImage(
  dataUrl: string,
  alphaThreshold = 10,
  whiteThreshold = 250,
): Promise<string> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = imageData;

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      const isTransparent = a < alphaThreshold;
      const isWhite =
        r > whiteThreshold && g > whiteThreshold && b > whiteThreshold;

      if (!isTransparent && !isWhite) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // No content found — return original
  if (minX > maxX || minY > maxY) return dataUrl;

  const tw = maxX - minX + 1;
  const th = maxY - minY + 1;
  const trimmed = document.createElement('canvas');
  trimmed.width = tw;
  trimmed.height = th;
  const tCtx = trimmed.getContext('2d')!;
  tCtx.drawImage(canvas, minX, minY, tw, th, 0, 0, tw, th);

  return trimmed.toDataURL('image/png');
}

/**
 * Agrega padding proporcional alrededor de la imagen.
 * El padding se calcula como porcentaje de la dimensión mayor.
 */
export async function addPadding(
  dataUrl: string,
  paddingPercent: number,
): Promise<string> {
  if (paddingPercent <= 0) return dataUrl;

  const img = await loadImage(dataUrl);
  const pad = Math.round(
    Math.max(img.width, img.height) * (paddingPercent / 100),
  );

  const canvas = document.createElement('canvas');
  canvas.width = img.width + pad * 2;
  canvas.height = img.height + pad * 2;

  // Canvas default es transparente — no hay que limpiar
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, pad, pad);

  return canvas.toDataURL('image/png');
}
