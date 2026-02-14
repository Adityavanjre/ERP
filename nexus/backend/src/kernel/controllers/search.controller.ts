import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { SearchService } from '../services/search.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('kernel/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(@Req() req: any, @Query('q') q: string) {
    return this.searchService.globalSearch(req.user.tenantId, q);
  }
}
