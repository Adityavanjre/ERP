/**
 * File Type Magic-Byte Validation Utility
 *
 * Validates that an uploaded file's MIME type matches its declared extension
 * by reading the file's actual magic bytes (file signature), not just the filename.
 *
 * This prevents:
 *  - Executable masquerading as image (e.g. PHP shell renamed to .jpg)
 *  - MIME sniffing attacks
 *  - Content-type header forgery
 *
 * Usage:
 *   import { validateFileMagicBytes, ALLOWED_MIME_TYPES } from '../utils/file-magic.util';
 *
 *   @Post('upload')
 *   @UseInterceptors(FileInterceptor('file'))
 *   async upload(@UploadedFile() file: Express.Multer.File) {
 *     validateFileMagicBytes(file, ['image/jpeg', 'image/png', 'application/pdf']);
 *     // ... proceed to store file
 *   }
 */

import { UnsupportedMediaTypeException } from '@nestjs/common';

export const ALLOWED_MIME_TYPES = {
  IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  DOCUMENTS: ['application/pdf'],
  ALL: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
  ],
} as const;

/**
 * Magic byte signatures for supported file types.
 * Each entry: [MIME type, byte offset to start reading, hex signature to match]
 */
const MAGIC_SIGNATURES: { mime: string; offset: number; signature: Buffer }[] =
  [
    // JPEG: FF D8 FF
    {
      mime: 'image/jpeg',
      offset: 0,
      signature: Buffer.from([0xff, 0xd8, 0xff]),
    },
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    {
      mime: 'image/png',
      offset: 0,
      signature: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    },
    // GIF87a or GIF89a
    {
      mime: 'image/gif',
      offset: 0,
      signature: Buffer.from([0x47, 0x49, 0x46, 0x38]),
    },
    // WebP: RIFF....WEBP
    {
      mime: 'image/webp',
      offset: 0,
      signature: Buffer.from([0x52, 0x49, 0x46, 0x46]),
    },
    // PDF: %PDF
    {
      mime: 'application/pdf',
      offset: 0,
      signature: Buffer.from([0x25, 0x50, 0x44, 0x46]),
    },
  ];

/**
 * Validates the magic bytes of an uploaded file buffer against the allowed MIME types.
 *
 * @param file - The Multer file object from the request
 * @param allowedMimeTypes - Array of MIME types that are permitted for this endpoint
 * @throws UnsupportedMediaTypeException if the file's magic bytes do not match any allowed type
 */
export function validateFileMagicBytes(
  file: Express.Multer.File,
  allowedMimeTypes: readonly string[] = ALLOWED_MIME_TYPES.ALL,
): void {
  if (!file || !file.buffer || file.buffer.length < 8) {
    throw new UnsupportedMediaTypeException(
      'File buffer is empty or too small to validate.',
    );
  }

  const buffer = file.buffer;
  let detectedMime: string | null = null;

  for (const sig of MAGIC_SIGNATURES) {
    const fileSlice = buffer.slice(
      sig.offset,
      sig.offset + sig.signature.length,
    );
    if (fileSlice.equals(sig.signature)) {
      detectedMime = sig.mime;
      break;
    }
  }

  if (!detectedMime) {
    throw new UnsupportedMediaTypeException(
      `File type could not be determined from its content. ` +
        `Accepted types: ${allowedMimeTypes.join(', ')}. ` +
        `Do not rely on file extension — files are validated by content signature.`,
    );
  }

  if (!allowedMimeTypes.includes(detectedMime)) {
    throw new UnsupportedMediaTypeException(
      `File content was identified as '${detectedMime}', which is not permitted. ` +
        `Accepted types: ${allowedMimeTypes.join(', ')}.`,
    );
  }
}

/**
 * Validates that a file does not exceed the maximum allowed size in bytes.
 *
 * @param file - The Multer file object
 * @param maxSizeBytes - Maximum file size in bytes (default: 5MB)
 * @throws UnsupportedMediaTypeException if file exceeds limit
 */
export function validateFileSize(
  file: Express.Multer.File,
  maxSizeBytes: number = 5 * 1024 * 1024,
): void {
  if (file.size > maxSizeBytes) {
    const maxMb = (maxSizeBytes / (1024 * 1024)).toFixed(0);
    throw new UnsupportedMediaTypeException(
      `File size ${(file.size / (1024 * 1024)).toFixed(2)}MB exceeds the maximum allowed ${maxMb}MB.`,
    );
  }
}
