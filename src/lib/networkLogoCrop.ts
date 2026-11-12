import type { Area } from 'react-easy-crop';

export const NETWORK_LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const NETWORK_LOGO_OUTPUT_SIZE = 512;

const MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

function createImage(url: string, crossOrigin = true): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => reject(new Error('Não foi possível carregar a imagem.')));
    if (crossOrigin) {
      image.crossOrigin = 'anonymous';
    }
    image.src = url;
  });
}

async function imageUrlToObjectUrl(url: string): Promise<string> {
  const image = await createImage(url);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Não foi possível preparar a logo para reajuste.');
  }
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  ctx.drawImage(image, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/png');
  });
  if (!blob) {
    throw new Error(
      'Não foi possível preparar a logo para reajuste. Envie o arquivo novamente ou use outro navegador.',
    );
  }
  return URL.createObjectURL(blob);
}

function friendlyFetchError(err: unknown): Error {
  if (err instanceof Error) {
    if (/failed to fetch/i.test(err.message) || err.name === 'TypeError') {
      return new Error(
        'Não foi possível carregar a logo para reajuste (rede ou CORS). Envie o arquivo de novo com «Enviar logo».',
      );
    }
    return err;
  }
  return new Error('Não foi possível carregar a logo para reajuste.');
}

async function blobToFile(blob: Blob, baseName: string, mime: string): Promise<File> {
  const ext = MIME_EXT[mime] ?? 'png';
  const safeBase = baseName.replace(/\.[^.]+$/, '') || 'logo';
  return new File([blob], `${safeBase}.${ext}`, { type: mime });
}

async function canvasToBlobUnderLimit(
  canvas: HTMLCanvasElement,
  mime: string,
  maxBytes: number,
): Promise<Blob> {
  const qualities = mime === 'image/png' ? [undefined] : [0.92, 0.85, 0.75, 0.65, 0.55, 0.45];
  for (const quality of qualities) {
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), mime, quality);
    });
    if (blob && blob.size <= maxBytes) return blob;
  }
  const fallback = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), mime, 0.4);
  });
  if (!fallback) throw new Error('Falha ao exportar a logo recortada.');
  if (fallback.size > maxBytes) {
    throw new Error('A imagem recortada ultrapassa 2 MB. Tente um arquivo menor ou com menos detalhes.');
  }
  return fallback;
}

export async function getCroppedNetworkLogoFile(
  imageSrc: string,
  pixelCrop: Area,
  opts: { mimeType?: string; fileName?: string; maxBytes?: number; outputSize?: number } = {},
): Promise<File> {
  const mime = opts.mimeType && MIME_EXT[opts.mimeType] ? opts.mimeType : 'image/png';
  const outputSize = opts.outputSize ?? NETWORK_LOGO_OUTPUT_SIZE;
  const maxBytes = opts.maxBytes ?? NETWORK_LOGO_MAX_BYTES;
  const baseName = opts.fileName ?? 'logo';

  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível preparar a exportação da logo.');

  canvas.width = outputSize;
  canvas.height = outputSize;
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize,
  );

  const blob = await canvasToBlobUnderLimit(canvas, mime, maxBytes);
  return blobToFile(blob, baseName, mime);
}

/** Mesma origem do app (ex.: logo já servida pelo proxy em dev). */
function isSameOriginAssetUrl(url: string): boolean {
  try {
    const resolved = new URL(url, window.location.href);
    return resolved.origin === window.location.origin;
  } catch {
    return false;
  }
}

export async function fetchImageObjectUrl(url: string): Promise<string> {
  if (isSameOriginAssetUrl(url)) {
    try {
      const res = await fetch(url, { credentials: 'omit' });
      if (res.ok) {
        const blob = await res.blob();
        if (blob.type.startsWith('image/')) {
          return URL.createObjectURL(blob);
        }
      }
    } catch (err) {
      throw friendlyFetchError(err);
    }
  }

  try {
    const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (!res.ok) {
      throw new Error('Não foi possível carregar a logo atual para reajuste.');
    }
    const blob = await res.blob();
    if (!blob.type.startsWith('image/')) {
      throw new Error('Arquivo da logo inválido.');
    }
    return URL.createObjectURL(blob);
  } catch (fetchErr) {
    try {
      return await imageUrlToObjectUrl(url);
    } catch (imgErr) {
      throw friendlyFetchError(fetchErr ?? imgErr);
    }
  }
}

export function revokeObjectUrl(url: string | null | undefined) {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
}

export function validateNetworkLogoFile(file: File): string | null {
  const allowed = new Set(['image/png', 'image/jpeg', 'image/webp']);
  if (!allowed.has(file.type)) {
    return 'Use PNG, JPG ou WEBP.';
  }
  if (file.size > NETWORK_LOGO_MAX_BYTES) {
    return 'O arquivo deve ter até 2 MB.';
  }
  return null;
}
