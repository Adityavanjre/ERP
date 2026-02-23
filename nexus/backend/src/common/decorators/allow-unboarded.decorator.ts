import { SetMetadata } from '@nestjs/common';

export const AllowUnboarded = () => SetMetadata('allowUnboarded', true);
