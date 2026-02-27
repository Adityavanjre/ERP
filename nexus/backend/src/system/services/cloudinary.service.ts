import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  uploadFile(file: Express.Multer.File): Promise<any> {
    if (!process.env.CLOUDINARY_API_KEY) {
      // Simulation mode
      const simUrl = `https://simulation-storage.local/${file.originalname}`;
      return Promise.resolve({
        url: simUrl,
        public_id: `sim_${Date.now()}`,
        secure_url: simUrl,
      });
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'nexus_erp' },
        (error, result) => {
          if (error) {
            this.logger.error(`Cloudinary upload failed for ${file.originalname}`, error);
            return reject(error);
          }
          this.logger.log(`File uploaded successfully: ${file.originalname}`);
          // Return the result but we'll use getSignedUrl for access
          resolve(result);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  /**
   * AR-2: Generate a short-lived signed URL for private file access.
   * TTL defaults to 1 hour (3600s).
   */
  getSignedUrl(publicId: string, expires_at?: number): string {
    if (!process.env.CLOUDINARY_API_KEY) {
      return `https://simulation-storage.local/${publicId}`;
    }

    return cloudinary.utils.private_download_url(publicId, 'pdf', {
      expires_at: expires_at || Math.floor(Date.now() / 1000) + 3600,
    });
  }

  /**
   * For images, we can generate a transformed signed URL.
   */
  getSignedImageUrl(publicId: string): string {
    if (!process.env.CLOUDINARY_API_KEY) {
      return `https://simulation-storage.local/${publicId}`;
    }

    return cloudinary.url(publicId, {
      sign_url: true,
      secure: true,
      type: 'authenticated',
    });
  }
}
