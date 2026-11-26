import type { Area } from 'react-easy-crop';
import {
  getCroppedImageFile,
  validateImageUploadFile,
} from './networkLogoCrop';

/** Proporção do hero no app (`heroVisualHeight` em tela cheia). */
export const UNIT_PHOTO_HERO_ASPECT = 16 / 9;

export const UNIT_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const UNIT_PHOTO_OUTPUT_WIDTH = 1280;
export const UNIT_PHOTO_OUTPUT_HEIGHT = Math.round(UNIT_PHOTO_OUTPUT_WIDTH / UNIT_PHOTO_HERO_ASPECT);

export function validateUnitPhotoFile(file: File): string | null {
  return validateImageUploadFile(file, UNIT_PHOTO_MAX_BYTES);
}

export async function getCroppedUnitPhotoFile(
  imageSrc: string,
  pixelCrop: Area,
  opts: { mimeType?: string; fileName?: string } = {},
): Promise<File> {
  return getCroppedImageFile(imageSrc, pixelCrop, {
    mimeType: opts.mimeType,
    fileName: opts.fileName,
    maxBytes: UNIT_PHOTO_MAX_BYTES,
    outputWidth: UNIT_PHOTO_OUTPUT_WIDTH,
    outputHeight: UNIT_PHOTO_OUTPUT_HEIGHT,
    defaultBaseName: 'unit-photo',
  });
}