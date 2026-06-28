import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { SearchService } from '../services/search.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';


import { AuthenticatedRequest } from '../../common/interfaces/request.interface';

@UseGuards(JwtAuthGuard)
@Controller('system/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(@Req() req: AuthenticatedRequest, @Query('q') q: string) {
    return this.searchService.globalSearch(req.user.tenantId as string, q);
  }
}
