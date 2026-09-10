import {BadRequestException, ForbiddenException, Injectable, Logger,} from '@nestjs/common';

import {
  DealStatus,
  DocumentType,
  NotificationEntityType,
  NotificationType,
  PaymentMethod,
  PaymentScheduleStatus,
  PaymentType,
  Prisma,
  UnitStatus,
  UserRole,
} from '@/generated/prisma/client';
import {PrismaService} from '@/database/prisma.service';
import {isBranchScopedRole} from '@/common/constants/branch-scope.constants';

import {
  ClientNotFoundException,
  DealNotFoundException,
  SalePriceMismatchException,
  UnitNotFoundException,
} from '../exceptions';

import {DealMapper} from '../mappers/deal.mapper';
import {DealQueryDto} from '../dto/deal-query.dto';
import {DealDomainService} from './deal-domain.service';
import {DealActivityService} from './deal-activity.service';
import {ACTIVE_DEAL_STATUSES, DEAL_DETAILS_INCLUDE} from "../deal.constants";
import {ReserveUnitDto} from "../dto/reserve-unit.dto";
import {AuthUser} from "@/common/types/auth-user.type";
import {ExtendReservationDto} from "@/modules/deals/dto/extend-reservation.dto";
import {SignContractDto} from "@/modules/deals/dto/sign-contract.dto";
import {CancelDealDto} from "@/modules/deals/dto/cancel-deal.dto";
import {ReassignManagerDto} from "@/common/dto/reassign-manager.dto";
import {DbClient} from "@/database/prisma.types";
import {NotificationsService} from "@/modules/notifications/notifications.service";
import {DealNumberService} from "@/modules/deals/services/deal-number.service";
import {DocumentGenerationService} from "@/modules/document-generation/document-generation.service";
import {GENERATABLE_DOCUMENT_TYPES} from "@/modules/document-generation/document-generation.constants";

@Injectable()
export class DealsService {
  private readonly logger = new Logger(DealsService.name);

  constructor(
      private readonly prisma: PrismaService,
      private readonly mapper: DealMapper,
      private readonly domain: DealDomainService,
      private readonly activityService: DealActivityService,
      private readonly notifications: NotificationsService,
      private readonly dealNumberService: DealNumberService,
      private readonly documentGeneration: DocumentGenerationService,
  ) {}

  /**
   * Best-effort: a broken template or a PDF-rendering failure must never
   * block the deal transition that triggered it (reserving a unit, signing
   * a contract) — those already committed in their own transaction by the
   * time this runs. Failures are logged, not surfaced to the caller.
   */
  private async generateAndLogDocument(params: {
    companyId: string;
    dealId: string;
    clientId: string;
    type: DocumentType;
    userId: string;
    activityTitle: string;
  }) {
    try {
      const document = await this.documentGeneration.generateForDeal({
        companyId: params.companyId,
        dealId: params.dealId,
        type: params.type,
        userId: params.userId,
      });

      await this.activityService.documentGenerated(
          {
            db: this.prisma,
            companyId: params.companyId,
            userId: params.userId,
            dealId: params.dealId,
            clientId: params.clientId,
            metadata: {documentId: document.id, documentType: params.type},
          },
          params.activityTitle,
      );
    } catch (error) {
      this.logger.error(
          `Failed to generate ${params.type} document for deal ${params.dealId}`,
          error instanceof Error ? error.stack : String(error),
      );
    }
  }

  // --------------------------------------------------------------------------
  // Queries
  // --------------------------------------------------------------------------

  async findAll(user: AuthUser, query: DealQueryDto) {
    if (!user.companyId) {
      throw new ForbiddenException("User does not belong to a company");
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.DealWhereInput = {
      companyId: user.companyId,
      status: query.status,
      projectId: query.projectId,
      clientId: query.clientId,
      managerId: query.managerId,
    };

    // BR-B1 / BR-B3 — see leads.service.ts's findAll for the same pattern.
    if (isBranchScopedRole(user.role)) {
      where.branchId = user.branchId;
    } else if (query.branchId) {
      where.branchId = query.branchId;
    }

    if (query.search) {
      where.OR = [
        { dealNumber: { contains: query.search, mode: "insensitive" } },
        { client: { fullName: { contains: query.search, mode: "insensitive" } } },
        { client: { phone: { contains: query.search, mode: "insensitive" } } },
        { unit: { number: { contains: query.search, mode: "insensitive" } } },
      ];
    }

    const [deals, total] = await Promise.all([
      this.prisma.deal.findMany({
        where,
        skip,
        take: limit,
        include: {
          client: true,
          manager: true,
          project: true,
          unit: {
            include: { block: true, entrance: true, floor: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.deal.count({ where }),
    ]);

    return {
      items: this.mapper.toList(deals),
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(user: AuthUser, id: string) {
    if (!user.companyId) {
      throw new ForbiddenException("User does not belong to a company");
    }

    const deal = await this.getDealOrThrow(user, id);

    return this.mapper.toDetails(deal);
  }

  // --------------------------------------------------------------------------
  // Reservation
  // --------------------------------------------------------------------------

  async reserveUnit(user: AuthUser, dto: ReserveUnitDto) {
    if (!user.companyId) {
      throw new ForbiddenException("User does not belong to a company");
    }

    const companyId = user.companyId;
    const managerId = dto.managerId ?? user.id;

    // Validate immutable entities before transaction
    const client = await this.getClientOrThrow(user, dto.clientId);
    await this.getManagerOrThrow(managerId, user);

    const result = await this.prisma.$transaction(async db => {
      const unit = await db.unit.findFirst({
        where: {
          id: dto.unitId,
          project: {
            companyId,
          },
        },
      });

      if (!unit) {
        throw new UnitNotFoundException(dto.unitId);
      }

      this.domain.ensureUnitCanBeReserved(unit);

      const activeDeal = await db.deal.findFirst({
        where: {
          unitId: unit.id,
          status: {
            in: ACTIVE_DEAL_STATUSES,
          },
        },
      });

      this.domain.ensureNoActiveDeal(activeDeal, unit);

      const listPrice = new Prisma.Decimal(unit.price);
      const discountPercent = new Prisma.Decimal(dto.discountPercent ?? 0);
      const explicitDiscountAmount = dto.discountAmount != null
          ? new Prisma.Decimal(dto.discountAmount)
          : null;

      const computedDiscountAmount = discountPercent.greaterThan(0)
          ? listPrice.times(discountPercent).dividedBy(100).toDecimalPlaces(2)
          : (explicitDiscountAmount ?? new Prisma.Decimal(0));

      const computedSalePrice = listPrice.minus(computedDiscountAmount);
      const submittedSalePrice = new Prisma.Decimal(dto.salePrice);

      if (submittedSalePrice.minus(computedSalePrice).abs().greaterThan(0.01)) {
        throw new SalePriceMismatchException(
            computedSalePrice.toNumber(),
            submittedSalePrice.toNumber(),
        );
      }

      const dealNumber = await this.dealNumberService.generateDealNumber(db, companyId);

      const deal = await db.deal.create({
        data: {
          companyId,
          dealNumber,

          // Derived from the client's branch, not stamped from the acting
          // user — a company-wide admin reserving on behalf of a branch's
          // client should still produce a deal that branch can see. Null
          // when the client itself is unassigned to a branch.
          branchId: client.branchId,

          projectId: unit.projectId,
          unitId: unit.id,

          clientId: dto.clientId,
          managerId,

          status: DealStatus.RESERVED,
          financingType: dto.financingType,

          listPrice: unit.price,
          salePrice: computedSalePrice,

          discountAmount: computedDiscountAmount,
          discountPercent: discountPercent,

          deposit: dto.deposit ?? 0,

          reservedAt: new Date(),
          reservationExpiresAt: dto.reservationExpiresAt
              ? new Date(dto.reservationExpiresAt)
              : null,

          reservedById: managerId,

          note: dto.note,
        },
      });

      if (dto.deposit && dto.deposit > 0) {
        await db.payment.create({
          data: {
            dealId: deal.id,
            userId: user.id,
            amount: dto.deposit,
            paymentMethod: dto.depositPaymentMethod ?? PaymentMethod.CASH,
            paymentType: PaymentType.DEPOSIT,
            paidAt: new Date(),
          },
        });
      }

      await db.unit.update({
        where: {
          id: unit.id,
        },
        data: {
          status: UnitStatus.RESERVED,
        },
      });

      await this.activityService.reserve({
        db,
        companyId,
        userId: user.id,

        dealId: deal.id,
        clientId: dto.clientId,

        metadata: {
          unitId: unit.id,
          unitNumber: unit.number,
        },
      });

      return db.deal.findUniqueOrThrow({
        where: {
          id: deal.id,
        },
        include: DEAL_DETAILS_INCLUDE,
      });
    });

    await this.generateAndLogDocument({
      companyId,
      dealId: result.id,
      clientId: result.clientId,
      type: DocumentType.RESERVATION,
      userId: user.id,
      activityTitle: 'Reservation agreement generated',
    });

    return this.mapper.toDetails(result);
  }

  async extendReservation(user: AuthUser, id: string, dto: ExtendReservationDto) {
    if (!user.companyId) {
      throw new ForbiddenException("User does not belong to a company");
    }

    const companyId = user.companyId;

    const result = await this.prisma.$transaction(async db => {
      const deal = await db.deal.findFirst({
        where: {
          id,
          companyId,
          ...(isBranchScopedRole(user.role) ? { branchId: user.branchId } : {}),
        },
      });
      if (!deal) throw new DealNotFoundException(id);

      const newExpiresAt = new Date(dto.reservationExpiresAt);
      this.domain.ensureCanExtendReservation(deal, newExpiresAt);

      await db.deal.update({
        where: { id },
        data: { reservationExpiresAt: newExpiresAt },
      });

      await this.activityService.extendReservation({
        db, companyId, userId: user.id,
        dealId: deal.id, clientId: deal.clientId,
        metadata: { reservationExpiresAt: newExpiresAt.toISOString() },
      });

      return db.deal.findUniqueOrThrow({ where: { id: deal.id }, include: DEAL_DETAILS_INCLUDE });
    });

    return this.mapper.toDetails(result);
  }

  async signContract(user: AuthUser, id: string, dto: SignContractDto) {
    if (!user.companyId) {
      throw new ForbiddenException("User does not belong to a company");
    }

    const companyId = user.companyId;

    const result = await this.prisma.$transaction(async db => {
      const deal = await db.deal.findFirst({
        where: {
          id,
          companyId,
          ...(isBranchScopedRole(user.role) ? { branchId: user.branchId } : {}),
        },
      });
      if (!deal) throw new DealNotFoundException(id);

      this.domain.ensureCanSignContract(deal);

      await db.deal.update({
        where: { id },
        data: {
          status: this.domain.nextStatusAfterReservation(),
          contractNumber: dto.contractNumber,
          contractDate: new Date(dto.contractDate),
          note: dto.note ?? deal.note,
        },
      });

      await this.activityService.signContract({
        db, companyId, userId: user.id,
        dealId: deal.id, clientId: deal.clientId,
        metadata: { contractNumber: dto.contractNumber },
      });

      if (deal.managerId) {
        await this.notifications.create({
          companyId,
          userId: deal.managerId,
          type: NotificationType.DEAL_STATUS_CHANGED,
          title: `Deal ${deal.dealNumber} is now ${this.domain.nextStatusAfterReservation()}`,
          entityType: NotificationEntityType.DEAL,
          entityId: deal.id,
        });
      }

      return db.deal.findUniqueOrThrow({ where: { id: deal.id }, include: DEAL_DETAILS_INCLUDE });
    });

    await this.generateAndLogDocument({
      companyId,
      dealId: result.id,
      clientId: result.clientId,
      type: DocumentType.CONTRACT,
      userId: user.id,
      activityTitle: 'Sale contract generated',
    });

    return this.mapper.toDetails(result);
  }

  async activate(user: AuthUser, id: string) {
    if (!user.companyId) {
      throw new ForbiddenException("User does not belong to a company");
    }

    const companyId = user.companyId;

    const result = await this.prisma.$transaction(async db => {
      const deal = await db.deal.findFirst({
        where: {
          id,
          companyId,
          ...(isBranchScopedRole(user.role) ? { branchId: user.branchId } : {}),
        },
      });
      if (!deal) throw new DealNotFoundException(id);

      this.domain.ensureCanActivate(deal);

      await db.deal.update({
        where: { id },
        data: { status: this.domain.nextStatusAfterContract() },
      });

      await this.activityService.dealUpdated({
        db, companyId, userId: user.id,
        dealId: deal.id, clientId: deal.clientId,
        metadata: { status: "ACTIVE" },
      });

      if (deal.managerId) {
        await this.notifications.create({
          companyId,
          userId: deal.managerId,
          type: NotificationType.DEAL_STATUS_CHANGED,
          title: `Deal ${deal.dealNumber} is now ${this.domain.nextStatusAfterContract()}`,
          entityType: NotificationEntityType.DEAL,
          entityId: deal.id,
        });
      }

      return db.deal.findUniqueOrThrow({ where: { id: deal.id }, include: DEAL_DETAILS_INCLUDE });
    });

    return this.mapper.toDetails(result);
  }

  /**
   * SH-A1: lets a SALES_HEAD move a deal from one of their team's
   * SALES_MANAGERs to another without going through COMPANY_ADMIN. Kept as
   * its own endpoint, restricted to an active SALES_MANAGER on the deal's
   * own branch — a dedicated, narrowly-scoped write action for team leads.
   */
  async reassignManager(user: AuthUser, id: string, dto: ReassignManagerDto) {
    if (!user.companyId) {
      throw new ForbiddenException("User does not belong to a company");
    }

    const companyId = user.companyId;

    const result = await this.prisma.$transaction(async db => {
      const deal = await db.deal.findFirst({
        where: {
          id,
          companyId,
          ...(isBranchScopedRole(user.role) ? { branchId: user.branchId } : {}),
        },
      });
      if (!deal) throw new DealNotFoundException(id);

      if (!deal.branchId) {
        throw new BadRequestException("Deal is not assigned to a branch");
      }

      const manager = await db.user.findFirst({
        where: {
          id: dto.managerId,
          companyId,
          branchId: deal.branchId,
          role: UserRole.SALES_MANAGER,
          isActive: true,
        },
      });

      if (!manager) {
        throw new BadRequestException(
            "Manager not assignable — must be an active SALES_MANAGER on the same branch",
        );
      }

      await db.deal.update({
        where: { id },
        data: { managerId: dto.managerId },
      });

      await this.activityService.reassignManager({
        db, companyId, userId: user.id,
        dealId: deal.id, clientId: deal.clientId,
        metadata: { fromManagerId: deal.managerId, toManagerId: dto.managerId },
      });

      return db.deal.findUniqueOrThrow({ where: { id: deal.id }, include: DEAL_DETAILS_INCLUDE });
    });

    return this.mapper.toDetails(result);
  }

  async cancelDeal(user: AuthUser, id: string, dto: CancelDealDto) {
    if (!user.companyId) {
      throw new ForbiddenException("User does not belong to a company");
    }

    const companyId = user.companyId;

    const result = await this.prisma.$transaction(async db => {
      const deal = await db.deal.findFirst({
        where: {
          id,
          companyId,
          ...(isBranchScopedRole(user.role) ? { branchId: user.branchId } : {}),
        },
      });
      if (!deal) throw new DealNotFoundException(id);

      this.domain.ensureCanCancel(deal);

      await db.deal.update({
        where: { id },
        data: {
          status: this.domain.cancelledStatus(),
          cancelledAt: new Date(),
          cancelReason: dto.reason,
        },
      });

      await db.unit.update({
        where: { id: deal.unitId },
        data: { status: UnitStatus.AVAILABLE },
      });

      await db.paymentSchedule.updateMany({
        where: {
          dealId: deal.id,
          deletedAt: null,
          status: { in: [PaymentScheduleStatus.PENDING, PaymentScheduleStatus.PARTIAL, PaymentScheduleStatus.OVERDUE] },
        },
        data: { deletedAt: new Date() },
      });

      await this.activityService.cancelReservation({
        db, companyId, userId: user.id,
        dealId: deal.id, clientId: deal.clientId,
        metadata: { reason: dto.reason ?? null },
      });

      if (deal.managerId) {
        await this.notifications.create({
          companyId,
          userId: deal.managerId,
          type: NotificationType.DEAL_STATUS_CHANGED,
          title: `Deal ${deal.dealNumber} is now ${UnitStatus.AVAILABLE}`,
          entityType: NotificationEntityType.DEAL,
          entityId: deal.id,
        });
      }

      return db.deal.findUniqueOrThrow({ where: { id: deal.id }, include: DEAL_DETAILS_INCLUDE });
    });

    return this.mapper.toDetails(result);
  }

  async complete(user: AuthUser, id: string) {
    if (!user.companyId) {
      throw new ForbiddenException("User does not belong to a company");
    }

    const companyId = user.companyId;

    const result = await this.prisma.$transaction(async db => {
      await this.tryCompleteWithinTransaction(db, user, id, true);
      return db.deal.findUniqueOrThrow({ where: { id }, include: DEAL_DETAILS_INCLUDE });
    });

    return this.mapper.toDetails(result);
  }

  async tryCompleteWithinTransaction(
      db: DbClient,
      user: AuthUser,
      dealId: string,
      throwOnIneligible = false,
  ): Promise<boolean> {
    const deal = await db.deal.findFirst({
      where: {
        id: dealId,
        companyId: user.companyId,
        ...(isBranchScopedRole(user.role) ? { branchId: user.branchId } : {}),
      },
    });
    if (!deal) {
      if (throwOnIneligible) throw new DealNotFoundException(dealId);
      return false;
    }

    const schedules = await db.paymentSchedule.findMany({
      where: { dealId, deletedAt: null },
      select: { status: true },
    });

    const paidAgg = await db.payment.aggregate({
      where: { dealId, deletedAt: null },
      _sum: { amount: true },
    });
    const totalPaid = paidAgg._sum.amount ?? new Prisma.Decimal(0);

    try {
      this.domain.ensureCanComplete(deal, schedules, totalPaid);
    } catch (error) {
      if (throwOnIneligible) throw error;
      return false;
    }

    await db.deal.update({
      where: { id: dealId },
      data: { status: this.domain.nextStatusAfterCompletion() },
    });

    await db.unit.update({
      where: { id: deal.unitId },
      data: { status: UnitStatus.SOLD },
    });

    await this.activityService.dealUpdated({
      db, companyId: deal.companyId, userId: user.id,
      dealId, clientId: deal.clientId,
      metadata: { status: 'COMPLETED' },
    });

    if (deal.managerId) {
      await this.notifications.create({
        companyId: deal.companyId,
        userId: deal.managerId,
        type: NotificationType.DEAL_STATUS_CHANGED,
        title: `Deal ${deal.dealNumber} is now ${this.domain.nextStatusAfterCompletion()}`,
        entityType: NotificationEntityType.DEAL,
        entityId: deal.id,
      });
    }

    return true;
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------
  private async findOneOrThrow<T>(
      model: { findFirst(args: any): Promise<T | null>; },
      where: any,
      exception: Error,
  ): Promise<T> {
    const entity = await model.findFirst({ where });
    if (!entity) throw exception;
    return entity;
  }

  private async getDealOrThrow(user: AuthUser, id: string) {
    const deal = await this.prisma.deal.findFirst({
      where: {
        id,
        companyId: user.companyId,
        ...(isBranchScopedRole(user.role) ? { branchId: user.branchId } : {}),
      },
      include: DEAL_DETAILS_INCLUDE,
    });

    if (!deal) throw new DealNotFoundException(id);

    return deal;
  }

  /**
   * BR-B1: a branch-scoped actor may only reserve for a client already
   * visible to them — merged into this lookup rather than a separate check
   * afterward, so an other-branch client 404s the same as an other-company
   * one. This is also what keeps reserveUnit()'s derived Deal.branchId (see
   * below) always something the actor was authorized to touch.
   */
  private getClientOrThrow(user: AuthUser, id: string) {
    return this.findOneOrThrow(
        this.prisma.client,
        {
          id,
          companyId: user.companyId,
          ...(isBranchScopedRole(user.role) ? { branchId: user.branchId } : {}),
        },
        new ClientNotFoundException(id),
    );
  }

  /**
   * A branch-scoped actor may only assign a manager within their own branch
   * — same reasoning as LeadsService.ensureManagerAssignable.
   */
  private async getManagerOrThrow(managerId: string, user: AuthUser) {
    return this.prisma.user.findFirstOrThrow({
      where: {
        id: managerId,
        companyId: user.companyId,
        ...(isBranchScopedRole(user.role) ? { branchId: user.branchId } : {}),
      },
    });
  }

  /**
   * Manual re-generate — for a corrected note, a fixed template, or simply
   * wanting a fresh printout without repeating the deal transition that
   * auto-generated the first copy. Unlike generateAndLogDocument (used from
   * reserveUnit/signContract), failures here surface to the caller: this is
   * an explicit ask, not a side effect of another action succeeding.
   */
  async generateDocument(user: AuthUser, id: string, type: DocumentType) {
    if (!user.companyId) {
      throw new ForbiddenException("User does not belong to a company");
    }

    if (!GENERATABLE_DOCUMENT_TYPES.includes(type)) {
      throw new BadRequestException(`"${type}" cannot be generated on demand.`);
    }

    const companyId = user.companyId;
    const deal = await this.getDealOrThrow(user, id);

    const document = await this.documentGeneration.generateForDeal({
      companyId,
      dealId: deal.id,
      type,
      userId: user.id,
    });

    await this.activityService.documentGenerated(
        {
          db: this.prisma,
          companyId,
          userId: user.id,
          dealId: deal.id,
          clientId: deal.clientId,
          metadata: {documentId: document.id, documentType: type},
        },
        `${type} document regenerated`,
    );

    return document;
  }

  async getStatusSummary(user: AuthUser, projectId?: string, branchId?: string) {
    if (!user.companyId) {
      throw new ForbiddenException("User does not belong to a company");
    }

    const where: Prisma.DealWhereInput = { companyId: user.companyId, projectId };

    if (isBranchScopedRole(user.role)) {
      where.branchId = user.branchId;
    } else if (branchId) {
      where.branchId = branchId;
    }

    const counts = await this.prisma.deal.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    });

    return Object.values(DealStatus).map(status => ({
      status,
      count: counts.find(c => c.status === status)?._count._all ?? 0,
    }));
  }
}