import { Controller, Get, Head } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';
import { Role } from '@prisma/client';
import { Roles } from './common/decorators/roles.decorator';

@Public()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Roles(Role.Owner)
  @Head()
  getHello(): string {
    return 'Nexus ERP API Gateway is Operational';
  }
}
