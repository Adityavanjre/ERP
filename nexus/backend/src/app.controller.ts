import { Controller, Get, Head } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';

@Public()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  @Head()
  getHello(): string {
    return 'Nexus ERP API Gateway is Operational';
  }
}
