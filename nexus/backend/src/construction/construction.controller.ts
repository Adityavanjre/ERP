import { Controller, Get, Post, Body, Param, Patch, UseGuards, Req } from '@nestjs/common';
import { ConstructionService } from './construction.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ModuleGuard } from '../common/guards/module.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { Module } from '../common/decorators/module.decorator';

@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@Module('construction')
@Controller('construction')
export class ConstructionController {
    constructor(private readonly constructionService: ConstructionService) { }

    @Post('boq')
    @Roles(Role.Owner, Role.Manager)
    create(@Req() req: any, @Body() data: any) {
        return this.constructionService.createBOQ(req.user.tenantId, data);
    }

    @Patch('boq/:id/status')
    @Roles(Role.Owner, Role.Manager)
    updateStatus(@Req() req: any, @Param('id') id: string, @Body('status') status: string) {
        return this.constructionService.updateBOQStatus(req.user.tenantId, id, status);
    }

    @Patch('boq/items/:id/actuals')
    @Roles(Role.Owner, Role.Manager, Role.Storekeeper)
    updateActuals(@Req() req: any, @Param('id') id: string, @Body() data: any) {
        return this.constructionService.updateBOQActuals(req.user.tenantId, id, data);
    }

    @Post('site-stock')
    @Roles(Role.Owner, Role.Manager, Role.Storekeeper)
    updateStock(@Req() req: any, @Body() data: any) {
        return this.constructionService.updateSiteStock(
            req.user.tenantId,
            data.projectId,
            data.productId,
            data.quantity,
            data.warehouseId,
        );
    }

    @Post('ra-billing')
    @Roles(Role.Owner, Role.Accountant)
    generateBill(@Req() req: any, @Body() data: any) {
        return this.constructionService.generateRABill(req.user.tenantId, data.projectId, data);
    }
}
