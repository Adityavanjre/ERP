import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  uploadFile(file: Express.Multer.File): Promise<any> {
    if (!process.env.CLOUDINARY_API_KEY) {
      console.log(`[SIMULATION] Cloudinary Upload: ${file.originalname} (${file.size} bytes)`);
      return Promise.resolve({
        url: `https://simulation-storage.local/${file.originalname}`,
        public_id: `sim_${Date.now()}`,
        secure_url: `https://simulation-storage.local/${file.originalname}`
      });
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }
}
