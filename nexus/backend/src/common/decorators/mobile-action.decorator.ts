import { SetMetadata } from '@nestjs/common';

export const MOBILE_ACTION_KEY = 'mobile_action_id';
export const MobileAction = (actionId: string) => SetMetadata(MOBILE_ACTION_KEY, actionId);
