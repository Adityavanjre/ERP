import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * SEC-004: MFA TOTP Secret Encryption Service
 *
 * TOTP secrets must NEVER be stored as plaintext because any database breach
 * immediately exposes every user's authenticator seed. This service encrypts
 * secrets using AES-256-GCM before writing and decrypts on read.
 *
 * Key: MFA_ENCRYPTION_KEY (env) — must be 32 bytes of hex (64 hex chars).
 *       Generate with: openssl rand -hex 32
 *
 * Format stored in DB: `<iv_hex>:<authTag_hex>:<ciphertext_hex>`
 * The IV is randomly generated per encryption to prevent IV reuse attacks.
 */
@Injectable()
export class MfaCryptoService {
  private readonly logger = new Logger(MfaCryptoService.name);
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly KEY_LENGTH = 32; // bytes for AES-256

  constructor(private readonly config: ConfigService) {}

  private getKey(): Buffer {
    const keyHex = this.config.get<string>('MFA_ENCRYPTION_KEY');
    if (!keyHex || keyHex.length !== 64) {
      throw new InternalServerErrorException(
        '[SEC-004] MFA_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
          'Generate one with: openssl rand -hex 32',
      );
    }
    return Buffer.from(keyHex, 'hex');
  }

  /**
   * Encrypts a plaintext TOTP secret for storage.
   * Returns a string in the format: <iv>:<authTag>:<ciphertext>
   */
  encrypt(plaintext: string): string {
    const key = this.getKey();
    const iv = crypto.randomBytes(12); // 96-bit IV for GCM
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return [
      iv.toString('hex'),
      authTag.toString('hex'),
      encrypted.toString('hex'),
    ].join(':');
  }

  /**
   * Decrypts a stored encrypted TOTP secret.
   * Accepts either an encrypted string (<iv>:<authTag>:<ct>) or a legacy plaintext secret.
   * Legacy plaintext is detected by the absence of the ':' separator pattern.
   */
  decrypt(stored: string): string {
    // Legacy detection: encrypted format always contains exactly 2 colons
    const parts = stored.split(':');
    if (parts.length !== 3) {
      // Legacy plaintext secret from before SEC-004 was applied.
      // Log a warning but continue — the secret will be re-encrypted on next MFA setup.
      this.logger.warn(
        '[SEC-004] Decrypting legacy plaintext MFA secret. User should re-enroll MFA to encrypt.',
      );
      return stored;
    }

    const [ivHex, authTagHex, ciphertextHex] = parts;
    const key = this.getKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const ciphertext = Buffer.from(ciphertextHex, 'hex');

    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    try {
      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);
      return decrypted.toString('utf8');
    } catch {
      throw new InternalServerErrorException(
        '[SEC-004] MFA secret decryption failed. Authentication tag mismatch — possible data corruption or wrong key.',
      );
    }
  }
}
