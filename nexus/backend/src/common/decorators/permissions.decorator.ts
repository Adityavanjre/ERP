import { SetMetadata } from '@nestjs/common';
import { Permission } from '../constants/permissions';

export const Permissions = (...permissions: Permission[]) =>
  SetMetadata('permissions', permissions);
