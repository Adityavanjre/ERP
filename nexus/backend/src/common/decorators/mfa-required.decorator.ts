import { SetMetadata } from '@nestjs/common';

export const MFA_REQUIRED_KEY = 'mfa_required';
export const MfaRequired = () => SetMetadata(MFA_REQUIRED_KEY, true);
