import { SetMetadata } from '@nestjs/common';

export const MODULE_KEY = 'erp_module';
export const Module = (name: string) => SetMetadata(MODULE_KEY, name);
