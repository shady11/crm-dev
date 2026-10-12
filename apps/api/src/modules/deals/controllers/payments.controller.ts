import {
  Controller,
  Get,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CompanyGuard } from '@/common/guards/company.guard';
import { BranchGuard } from '@/common/guards/branch.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequirePermissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthUser } from '@/common/types/auth-user.type';
import { PaymentRegisterService } from '../services/payments/payment-register.service';
import {
  PaymentRegisterQueryDto,
  ReceivablesQueryDto,
} from '../dto/payments/payment-register-query.dto';

const XLSX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// FIN-2: the payments register. Open to everyone who records payments
// (deals.manage_payments) - Finance, and within their branch the sales team.
@UseGuards(JwtAuthGuard, CompanyGuard, BranchGuard, PermissionsGuard)
@RequirePermissions('deals.manage_payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly register: PaymentRegisterService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: PaymentRegisterQueryDto,
  ) {
    return this.register.findAll(user, query);
  }

  @Get('export')
  async export(
    @CurrentUser() user: AuthUser,
    @Query() query: PaymentRegisterQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const buffer = await this.register.exportXlsx(user, query);
    const period =
      [query.from, query.to].filter(Boolean).join('_') ||
      new Date().toISOString().slice(0, 10);
    res.set({
      'Content-Type': XLSX_CONTENT_TYPE,
      'Content-Disposition': `attachment; filename="payments-${period}.xlsx"`,
    });
    return new StreamableFile(buffer);
  }

  @Get('receivables/export')
  async exportReceivables(
    @CurrentUser() user: AuthUser,
    @Query() query: ReceivablesQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const buffer = await this.register.exportReceivablesXlsx(user, query);
    res.set({
      'Content-Type': XLSX_CONTENT_TYPE,
      'Content-Disposition': `attachment; filename="receivables-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    });
    return new StreamableFile(buffer);
  }
}
