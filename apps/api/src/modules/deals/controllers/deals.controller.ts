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
import {ExtendReservationDto} from "@/modules/deals/dto/extend-reservation.dto";
import {SignContractDto} from "@/modules/deals/dto/sign-contract.dto";
import {CancelDealDto} from "@/modules/deals/dto/cancel-deal.dto";
import {GeneratePaymentScheduleDto} from "@/modules/deals/dto/generate-payment-schedule.dto";
import {CreatePaymentDto} from "@/modules/deals/dto/create-payment.dto";
import {PaymentScheduleService} from "@/modules/deals/services/payment-schedule.service";
import {PaymentService} from "@/modules/deals/services/payment.service";

@UseGuards(JwtAuthGuard, CompanyGuard, RolesGuard)
@Controller('deals')
export class DealsController {
  constructor(
      private readonly dealsService: DealsService,
      private readonly paymentScheduleService: PaymentScheduleService,
      private readonly paymentService: PaymentService,
  ) {}

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
      UserRole.FINANCE
  )
  @Get('status-summary')
  getStatusSummary(@CurrentUser() user: AuthUser) {
    return this.dealsService.getStatusSummary(user);
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

  @Roles(
      UserRole.COMPANY_ADMIN,
      UserRole.SALES_HEAD,
      UserRole.SALES_MANAGER
  )
  @Post(':id/extend')
  extendReservation(
      @CurrentUser() user: AuthUser,
      @Param('id') id: string,
      @Body() dto: ExtendReservationDto,
  ) {
    return this.dealsService.extendReservation(user, id, dto);
  }

  @Roles(
      UserRole.COMPANY_ADMIN,
      UserRole.SALES_HEAD,
      UserRole.SALES_MANAGER
  )
  @Post(':id/sign-contract')
  signContract(
      @CurrentUser() user: AuthUser,
      @Param('id') id: string,
      @Body() dto: SignContractDto,
  ) {
    return this.dealsService.signContract(user, id, dto);
  }

  @Roles(
      UserRole.COMPANY_ADMIN,
      UserRole.SALES_HEAD,
      UserRole.SALES_MANAGER
  )
  @Post(':id/activate')
  activate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.dealsService.activate(user, id);
  }

  @Roles(
      UserRole.COMPANY_ADMIN,
      UserRole.SALES_HEAD
  )
  @Post(':id/cancel')
  cancel(
      @CurrentUser() user: AuthUser,
      @Param('id') id: string,
      @Body() dto: CancelDealDto,
  ) {
    return this.dealsService.cancelDeal(user, id, dto);
  }

  @Roles(
      UserRole.COMPANY_ADMIN,
      UserRole.SALES_HEAD,
      UserRole.SALES_MANAGER,
      UserRole.FINANCE
  )
  @Post(':id/payment-schedule')
  generateSchedule(
      @CurrentUser() user: AuthUser,
      @Param('id') id: string,
      @Body() dto: GeneratePaymentScheduleDto,
  ) {
    return this.paymentScheduleService.generate(user, id, dto);
  }

  @Roles(
      UserRole.COMPANY_ADMIN,
      UserRole.SALES_HEAD,
      UserRole.SALES_MANAGER,
      UserRole.FINANCE
  )
  @Post(':id/payments')
  recordPayment(
      @CurrentUser() user: AuthUser,
      @Param('id') id: string,
      @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentService.create(user, id, dto);
  }

  @Roles(
      UserRole.COMPANY_ADMIN,
      UserRole.SALES_HEAD,
      UserRole.SALES_MANAGER
  )
  @Post(':id/complete')
  complete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.dealsService.complete(user, id);
  }
}