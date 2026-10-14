import {Body, Controller, Get, Param, ParseEnumPipe, Post, Query, UseGuards} from '@nestjs/common';
import {DocumentType} from '@/generated/prisma/client';
import {JwtAuthGuard} from '@/modules/auth/guards/jwt-auth.guard';
import {CompanyGuard} from '@/common/guards/company.guard';
import {BranchGuard} from '@/common/guards/branch.guard';
import {PermissionsGuard} from '@/common/guards/permissions.guard';
import {RequirePermissions} from '@/common/decorators/permissions.decorator';
import {CurrentUser} from '@/common/decorators/current-user.decorator';
import {AuthUser} from '@/common/types/auth-user.type';

import {DealsService} from '../services/deals.service';
import {DealQueryDto} from '../dto/deal-query.dto';
import {ReserveUnitDto} from '../dto/reserve-unit.dto';
import {ExtendReservationDto} from "@/modules/deals/dto/extend-reservation.dto";
import {SignContractDto} from "@/modules/deals/dto/sign-contract.dto";
import {CancelDealDto} from "@/modules/deals/dto/cancel-deal.dto";
import {RejectDiscountDto} from "@/modules/deals/dto/reject-discount.dto";
import {GeneratePaymentScheduleDto} from "@/modules/deals/dto/payments/generate-payment-schedule.dto";
import {CreatePaymentDto} from "@/modules/deals/dto/payments/create-payment.dto";
import {PaymentScheduleService} from "@/modules/deals/services/payments/payment-schedule.service";
import {PaymentService} from "@/modules/deals/services/payments/payment.service";
import {PaymentReceiptService} from "@/modules/deals/services/payments/payment-receipt.service";
import {PaymentVoidService} from "@/modules/deals/services/payments/payment-void.service";
import {VoidPaymentDto} from "@/modules/deals/dto/payments/void-payment.dto";
import {ReassignManagerDto} from "@/common/dto/reassign-manager.dto";

@UseGuards(JwtAuthGuard, CompanyGuard, BranchGuard, PermissionsGuard)
@Controller('deals')
export class DealsController {
  constructor(
      private readonly dealsService: DealsService,
      private readonly paymentScheduleService: PaymentScheduleService,
      private readonly paymentService: PaymentService,
      private readonly paymentReceipts: PaymentReceiptService,
      private readonly paymentVoids: PaymentVoidService,
  ) {}

  @RequirePermissions('deals.view')
  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: DealQueryDto) {
    return this.dealsService.findAll(user, query);
  }

  @RequirePermissions('deals.create')
  @Post('reserve')
  reserve(@CurrentUser() user: AuthUser, @Body() dto: ReserveUnitDto) {
    return this.dealsService.reserveUnit(user, dto);
  }

  @RequirePermissions('deals.view')
  @Get('status-summary')
  getStatusSummary(
      @CurrentUser() user: AuthUser,
      @Query('projectId') projectId?: string,
      @Query('branchId') branchId?: string,
      @Query('mine') mine?: string,
  ) {
    return this.dealsService.getStatusSummary(user, projectId, branchId, mine === 'true');
  }

  // Declared before ':id' so it isn't captured as a deal id.
  @RequirePermissions('deals.view')
  @Get('reservation-policy')
  getReservationPolicy(@CurrentUser() user: AuthUser) {
    return this.dealsService.getReservationPolicy(user);
  }

  @RequirePermissions('deals.view')
  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.dealsService.findOne(user, id);
  }

  @RequirePermissions('deals.manage')
  @Post(':id/extend')
  extendReservation(
      @CurrentUser() user: AuthUser,
      @Param('id') id: string,
      @Body() dto: ExtendReservationDto,
  ) {
    return this.dealsService.extendReservation(user, id, dto);
  }

  // SH-11: a manager at the extension limit asks a team lead to go past it.
  @RequirePermissions('deals.manage')
  @Post(':id/extension-request')
  requestExtension(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.dealsService.requestExtension(user, id);
  }

  @RequirePermissions('deals.manage')
  @Post(':id/sign-contract')
  signContract(
      @CurrentUser() user: AuthUser,
      @Param('id') id: string,
      @Body() dto: SignContractDto,
  ) {
    return this.dealsService.signContract(user, id, dto);
  }

  @RequirePermissions('deals.manage')
  @Post(':id/activate')
  activate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.dealsService.activate(user, id);
  }

  // SH-A1: a SALES_HEAD moving a deal between their own team's
  // SALES_MANAGERs. COMPANY_ADMIN included (via the default role bundle) for
  // oversight parity with cancel below; SALES_MANAGER is deliberately
  // excluded — this is a team-lead action, not something a rank-and-file
  // manager grants themselves.
  @RequirePermissions('deals.reassign')
  @Post(':id/reassign')
  reassignManager(
      @CurrentUser() user: AuthUser,
      @Param('id') id: string,
      @Body() dto: ReassignManagerDto,
  ) {
    return this.dealsService.reassignManager(user, id, dto);
  }

  // SALES_MANAGER excluded from deals.approve_discount — approving/rejecting
  // a discount is exactly the authority this permission exists to check, so
  // the requester can never be their own approver. DealsService.approveDiscount
  // /rejectDiscount still check the requested amount against the actor's own
  // band on top of this.
  @RequirePermissions('deals.approve_discount')
  @Post(':id/discount/approve')
  approveDiscount(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.dealsService.approveDiscount(user, id);
  }

  @RequirePermissions('deals.approve_discount')
  @Post(':id/discount/reject')
  rejectDiscount(
      @CurrentUser() user: AuthUser,
      @Param('id') id: string,
      @Body() dto: RejectDiscountDto,
  ) {
    return this.dealsService.rejectDiscount(user, id, dto);
  }

  @RequirePermissions('deals.cancel')
  @Post(':id/cancel')
  cancel(
      @CurrentUser() user: AuthUser,
      @Param('id') id: string,
      @Body() dto: CancelDealDto,
  ) {
    return this.dealsService.cancelDeal(user, id, dto);
  }

  @RequirePermissions('deals.manage_payments')
  @Post(':id/payment-schedule')
  generateSchedule(
      @CurrentUser() user: AuthUser,
      @Param('id') id: string,
      @Body() dto: GeneratePaymentScheduleDto,
  ) {
    return this.paymentScheduleService.generate(user, id, dto);
  }

  @RequirePermissions('deals.manage_payments')
  @Post(':id/payments')
  recordPayment(
      @CurrentUser() user: AuthUser,
      @Param('id') id: string,
      @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentService.create(user, id, dto);
  }

  // FIN-8: issued by whoever records payments, so Finance can hand one over.
  // Returns the Document; the file comes from GET /documents/:id/download.
  @RequirePermissions('deals.manage_payments')
  @Post(':id/payments/:paymentId/receipt')
  receipt(
      @CurrentUser() user: AuthUser,
      @Param('id') id: string,
      @Param('paymentId') paymentId: string,
  ) {
    return this.paymentReceipts.getOrCreate(user, id, paymentId);
  }

  // FIN-3: takes a mistyped payment off the books, with a reason.
  @RequirePermissions('deals.void_payments')
  @Post(':id/payments/:paymentId/void')
  voidPayment(
      @CurrentUser() user: AuthUser,
      @Param('id') id: string,
      @Param('paymentId') paymentId: string,
      @Body() dto: VoidPaymentDto,
  ) {
    return this.paymentVoids.void(user, id, paymentId, dto);
  }

  @RequirePermissions('deals.manage')
  @Post(':id/complete')
  complete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.dealsService.complete(user, id);
  }

  @RequirePermissions('documents.generate')
  @Post(':id/documents/:type/generate')
  generateDocument(
      @CurrentUser() user: AuthUser,
      @Param('id') id: string,
      @Param('type', new ParseEnumPipe(DocumentType)) type: DocumentType,
  ) {
    return this.dealsService.generateDocument(user, id, type);
  }
}
