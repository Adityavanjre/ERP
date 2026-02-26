import { SetMetadata } from '@nestjs/common';

export const ALLOW_IDENTITY_KEY = 'allowIdentity';
export const AllowIdentity = () => SetMetadata(ALLOW_IDENTITY_KEY, true);
