import {Body, Controller, Get, Param, Post, Query, UseGuards} from '@nestjs/common';
import {JwtAuthGuard} from '@/modules/auth/guards/jwt-auth.guard';
import {CompanyGuard} from '@/common/guards/company.guard';
import {RolesGuard} from '@/common/guards/roles.guard';
import {Roles} from '@/common/decorators/roles.decorator';
import {CurrentUser} from '@/common/decorators/current-user.decorator';
import {AuthUser} from '@/common/types/auth-user.type';
import {UserRole} from '@/generated/prisma/enums';

import {DealsService} from '../services/deals.service';
import {DealQueryDto} from '../dto/deal-query.dto';
import {ReserveUnitDto} from '../dto/reserve-unit.dto';

@UseGuards(JwtAuthGuard, CompanyGuard, RolesGuard)
@Controller('deals')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Roles(
      UserRole.COMPANY_ADMIN,
      UserRole.SALES_HEAD,
      UserRole.SALES_MANAGER,
      UserRole.FINANCE,
  )
  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: DealQueryDto) {
    return this.dealsService.findAll(user, query);
  }

  @Roles(
      UserRole.COMPANY_ADMIN,
      UserRole.SALES_HEAD,
      UserRole.SALES_MANAGER,
  )
  @Post('reserve')
  reserve(@CurrentUser() user: AuthUser, @Body() dto: ReserveUnitDto) {
    return this.dealsService.reserveUnit(user, dto);
  }

  @Roles(
      UserRole.COMPANY_ADMIN,
      UserRole.SALES_HEAD,
      UserRole.SALES_MANAGER,
      UserRole.FINANCE,
  )
  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.dealsService.findOne(user, id);
  }
}