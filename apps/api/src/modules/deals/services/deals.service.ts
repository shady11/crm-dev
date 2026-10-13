import {BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException} from '@nestjs/common';

import {
  ActivityAction,
  ActivityType,
  DealStatus,
  DiscountApprovalStatus,
  DocumentType,
  NotificationEntityType,
  NotificationType,
  PaymentMethod,
  PaymentScheduleStatus,
  PaymentType,
  Prisma,
  TaskType,
  UnitStatus,
} from '@/generated/prisma/client';
import {PrismaService} from '@/database/prisma.service';
import {RbacService} from '@/modules/rbac/rbac.service';
import {hasPermission} from '@/common/utils/permissions.util';

import {
  ClientNotFoundException,
  DealNotFoundException,
  DiscountApprovalNotAllowedException,
  PaidExceedsDiscountedPriceException,
  DiscountNotPendingException,
  SalePriceMismatchException,
  UnitNotAvailableException,
  UnitNotFoundException,
} from '../exceptions';

import {DealMapper} from '../mappers/deal.mapper';
import {DEAL_SORTABLE_FIELDS, DealQueryDto} from '../dto/deal-query.dto';
import {resolveOrderBy} from '@/common/utils/sort.util';
import {DealDomainService} from './deal-domain.service';
import {ActivityTitle, DealActivityService} from './deal-activity.service';
import {ACTIVE_DEAL_STATUSES, DEAL_DETAILS_INCLUDE, dealAttentionWhere, dealStatusTitle, OVERDUE_INSTALLMENT_WHERE, RESERVATION_POLICY_SELECT} from "../deal.constants";
import {ReserveUnitDto} from "../dto/reserve-unit.dto";
import {AuthUser} from "@/common/types/auth-user.type";
import {ExtendReservationDto} from "@/modules/deals/dto/extend-reservation.dto";
import {SignContractDto} from "@/modules/deals/dto/sign-contract.dto";
import {CancelDealDto} from "@/modules/deals/dto/cancel-deal.dto";
import {RejectDiscountDto} from "@/modules/deals/dto/reject-discount.dto";
import {ReassignManagerDto} from "@/common/dto/reassign-manager.dto";
import {DbClient} from "@/database/prisma.types";
import {findDiscountApprovers, findDiscountApproverIds, resolveDiscountRequestNotifications} from "./discount-approval";
import {NotificationsService} from "@/modules/notifications/notifications.service";
import {DealNumberService} from "@/modules/deals/services/deal-number.service";
import {DocumentGenerationService} from "@/modules/document-generation/document-generation.service";
import {GENERATABLE_DOCUMENT_TYPES} from "@/modules/document-generation/document-generation.constants";
import {TasksService} from "@/modules/tasks/tasks.service";
import {MoneyHeldNotifier} from "./money-held-notifier.service";
import {ReceiptNumberService} from "./payments/receipt-number.service";
import { activityText } from '@/modules/activities/activity-templates';

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
      private readonly rbacService: RbacService,
      private readonly tasksService: TasksService,
      private readonly moneyHeld: MoneyHeldNotifier,
      private readonly receiptNumbers: ReceiptNumberService,
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
    activityTitle: ActivityTitle;
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
    if (user.isBranchScoped) {
      where.branchId = user.branchId;
    } else if (query.branchId) {
      where.branchId = query.branchId;
    }

    if (query.attention) {
      where.AND = [dealAttentionWhere(query.attention)];
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
          manager: { include: { role: true } },
          project: true,
          unit: {
            include: { block: true, entrance: true, floor: true },
          },
        },
        orderBy: resolveOrderBy<Prisma.DealOrderByWithRelationInput>(
          query.sortBy,
          query.sortOrder,
          DEAL_SORTABLE_FIELDS,
          { createdAt: 'desc' },
        ),
      }),
      this.prisma.deal.count({ where }),
    ]);

    // What's overdue on each deal on this page, so the list can show the
    // money owed, not only the sale price (FIN-12). One query per page.
    const overdueByDeal = deals.length === 0 ? [] : await this.prisma.paymentSchedule.groupBy({
      by: ['dealId'],
      where: { ...OVERDUE_INSTALLMENT_WHERE, dealId: { in: deals.map((deal) => deal.id) } },
      _sum: { amount: true, paidAmount: true },
      _min: { dueDate: true },
      _count: { _all: true },
    });
    const overdueOf = (dealId: string) => {
      const row = overdueByDeal.find((r) => r.dealId === dealId);
      return row
        ? {
            amount: Number(row._sum.amount ?? 0) - Number(row._sum.paidAmount ?? 0),
            installments: row._count._all,
            since: row._min.dueDate,
          }
        : null;
    };

    return {
      items: this.mapper.toList(deals).map((deal) => ({ ...deal, overdue: overdueOf(deal.id) })),
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

    // Voided payments (FIN-3) count nowhere, but the deal page lists them,
    // with who voided them and why, so the correction stays visible.
    const voided = await this.prisma.payment.findMany({
      where: { dealId: deal.id, deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
      select: {
        id: true, amount: true, paymentType: true, paymentMethod: true, paidAt: true,
        receiptNumber: true, voidReason: true, deletedAt: true,
        voidedBy: { select: { id: true, fullName: true } },
      },
    });

    return {
      ...this.mapper.toDetails(deal),
      discountDecision: await this.discountDecisionFor(user, deal),
      voidedPayments: voided.map(({ deletedAt, ...payment }) => ({
        ...payment,
        amount: Number(payment.amount),
        voidedAt: deletedAt,
      })),
    };
  }

  /**
   * For a pending discount request: whether this viewer may decide it, and
   * who is being asked (SH-1). Lets the deal page offer Approve / Reject
   * only to someone the API will accept, and tell everyone else who the
   * request is with, instead of a refused click.
   */
  private async discountDecisionFor(
    user: AuthUser,
    deal: { companyId: string; branchId: string | null; discountApprovalStatus: DiscountApprovalStatus; requestedDiscountPercent: Prisma.Decimal | null },
  ) {
    if (deal.discountApprovalStatus !== DiscountApprovalStatus.PENDING || deal.requestedDiscountPercent == null) {
      return null;
    }
    const percent = deal.requestedDiscountPercent;
    const approvers = await findDiscountApprovers(this.prisma, this.rbacService, {
      companyId: deal.companyId, branchId: deal.branchId, percent,
    });
    return {
      canDecide: this.domain.canDecideDiscount(percent, hasPermission(user, 'deals.approve_discount'), user.discountLimit),
      approvers,
    };
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

    // Booking in someone else's name is a reassignment, so it needs the
    // same right as reassigning an existing deal.
    if (managerId !== user.id && !hasPermission(user, 'deals.reassign')) {
      throw new ForbiddenException('You can only book a unit in your own name.');
    }

    // Validate immutable entities before transaction
    const client = await this.getClientOrThrow(user, dto.clientId);
    await this.getManagerOrThrow(managerId, user);

    const result = await this.prisma.$transaction(async db => {
      const unit = await db.unit.findFirst({
        where: {
          id: dto.unitId,
          deletedAt: null,
          project: {
            companyId,
            deletedAt: null,
          },
        },
        include: {
          project: {
            select: {name: true, status: true},
          },
          block: {
            select: {name: true, salesStatus: true},
          },
        },
      });

      if (!unit) {
        throw new UnitNotFoundException(dto.unitId);
      }

      this.domain.ensureProjectOpenForSales(unit.project);
      this.domain.ensureBlockOpenForSales(unit.block);
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

      const reservationPolicy = await db.company.findUniqueOrThrow({
        where: {id: companyId},
        select: RESERVATION_POLICY_SELECT,
      });
      const reservationExpiresAt = this.domain.resolveReservationExpiry(
          dto.reservationExpiresAt ? new Date(dto.reservationExpiresAt) : undefined,
          reservationPolicy,
      );

      // Claim the unit before anything else is written. The status check
      // above is only a read; this conditional write is what makes the
      // booking exclusive — of two concurrent reservations, the second blocks
      // on the row lock, re-reads the status once the first commits, matches
      // nothing and fails here. Deal_unitId_open_key backs this up in the DB.
      const claimed = await db.unit.updateMany({
        where: {
          id: unit.id,
          status: UnitStatus.AVAILABLE,
        },
        data: {
          status: UnitStatus.RESERVED,
        },
      });

      if (claimed.count === 0) {
        throw new UnitNotAvailableException(unit.number);
      }

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

      // The percent-equivalent of the discount, however it was expressed —
      // company thresholds are percent-based, so an explicit discountAmount
      // still needs converting before it can be compared against them.
      const effectiveDiscountPercent = discountPercent.greaterThan(0)
          ? discountPercent
          : (listPrice.greaterThan(0)
              ? computedDiscountAmount.dividedBy(listPrice).times(100)
              : new Prisma.Decimal(0));

      const requiresApproval = computedDiscountAmount.greaterThan(0) &&
          this.domain.requiresDiscountApproval(effectiveDiscountPercent, user.discountLimit);

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
          // Held at list price while a discount awaits approval — the deal
          // and reservation proceed normally, only the discounted price is
          // withheld until someone with the authority to grant it says yes.
          salePrice: requiresApproval ? listPrice : computedSalePrice,

          discountAmount: requiresApproval ? 0 : computedDiscountAmount,
          discountPercent: requiresApproval ? 0 : discountPercent,

          discountApprovalStatus: requiresApproval
              ? DiscountApprovalStatus.PENDING
              : DiscountApprovalStatus.NONE,
          requestedDiscountPercent: requiresApproval ? effectiveDiscountPercent : null,
          requestedDiscountAmount: requiresApproval ? computedDiscountAmount : null,

          deposit: dto.deposit ?? 0,

          reservedAt: new Date(),
          reservationExpiresAt,

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
            receiptNumber: await this.receiptNumbers.next(db, companyId),
          },
        });
      }

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

      if (requiresApproval) {
        await this.activityService.discountRequested({
          db, companyId, userId: user.id,
          dealId: deal.id, clientId: dto.clientId,
          metadata: {
            requestedDiscountPercent: effectiveDiscountPercent.toNumber(),
            requestedDiscountAmount: computedDiscountAmount.toNumber(),
          },
        });

        const approverIds = await findDiscountApproverIds(db, this.rbacService, {
          companyId, branchId: client.branchId, percent: effectiveDiscountPercent,
        });

        for (const approverId of approverIds) {
          await this.notifications.create({
            companyId,
            userId: approverId,
            type: NotificationType.DISCOUNT_APPROVAL_REQUESTED,
            title: `Discount approval needed for deal ${dealNumber}`,
            templateKey: 'discountApprovalRequested',
            params: { dealNumber, percent: effectiveDiscountPercent.toNumber() },
            entityType: NotificationEntityType.DEAL,
            entityId: deal.id,
          });
        }
      }

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
      activityTitle: activityText('reservationAgreementGenerated'),
    });

    // Best-effort, non-fatal — same reasoning as generateAndLogDocument
    // above: never blocks the reservation itself. Gives the manager a
    // concrete next step instead of relying on them to remember one.
    try {
      await this.tasksService.createAutomated({
        companyId,
        assignedToId: result.managerId,
        actorId: user.id,
        title: `Confirm documents for deal ${result.dealNumber}`,
        type: TaskType.FOLLOW_UP,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        dealId: result.id,
      });
    } catch (error) {
      this.logger.error(
          `Failed to auto-create document-confirmation task for deal ${result.id}`,
          error instanceof Error ? error.stack : String(error),
      );
    }

    return this.mapper.toDetails(result);
  }

  /** The caller's company reservation limits, for the booking and extension forms. */
  async getReservationPolicy(user: AuthUser) {
    if (!user.companyId) {
      throw new ForbiddenException("User does not belong to a company");
    }

    return this.prisma.company.findUniqueOrThrow({
      where: { id: user.companyId },
      select: RESERVATION_POLICY_SELECT,
    });
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
          ...(user.isBranchScoped ? { branchId: user.branchId } : {}),
        },
      });
      if (!deal) throw new DealNotFoundException(id);

      const reservationPolicy = await db.company.findUniqueOrThrow({
        where: { id: companyId },
        select: RESERVATION_POLICY_SELECT,
      });

      const newExpiresAt = new Date(dto.reservationExpiresAt);
      this.domain.ensureCanExtendReservation(deal, newExpiresAt, reservationPolicy);

      // Conditional on the count read above, so two concurrent extensions
      // can't both pass the limit check.
      const extended = await db.deal.updateMany({
        where: { id, status: DealStatus.RESERVED, reservationExtensionCount: deal.reservationExtensionCount },
        data: {
          reservationExpiresAt: newExpiresAt,
          reservationExtensionCount: { increment: 1 },
        },
      });
      if (extended.count === 0) {
        throw new ConflictException('Reservation changed while you were extending it; reload and try again.');
      }

      await this.activityService.extendReservation({
        db, companyId, userId: user.id,
        dealId: deal.id, clientId: deal.clientId,
        metadata: {
          reservationExpiresAt: newExpiresAt.toISOString(),
          extension: deal.reservationExtensionCount + 1,
          maxExtensions: reservationPolicy.reservationMaxExtensions,
        },
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
          ...(user.isBranchScoped ? { branchId: user.branchId } : {}),
        },
      });
      if (!deal) throw new DealNotFoundException(id);

      const client = await db.client.findUniqueOrThrow({
        where: { id: deal.clientId },
        select: { passport: true, pin: true },
      });
      this.domain.ensureCanSignContract(deal, client);

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
          title: dealStatusTitle(deal.dealNumber, this.domain.nextStatusAfterReservation()),
          templateKey: 'dealStatusChanged',
          params: { dealNumber: deal.dealNumber, status: this.domain.nextStatusAfterReservation() },
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
      activityTitle: activityText('saleContractGenerated'),
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
          ...(user.isBranchScoped ? { branchId: user.branchId } : {}),
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

      // Paid in full before activation (FIN-9): there's nothing left to
      // schedule, so the sale is complete.
      await this.tryCompleteWithinTransaction(db, user, deal.id);

      if (deal.managerId) {
        await this.notifications.create({
          companyId,
          userId: deal.managerId,
          type: NotificationType.DEAL_STATUS_CHANGED,
          title: dealStatusTitle(deal.dealNumber, this.domain.nextStatusAfterContract()),
          templateKey: 'dealStatusChanged',
          params: { dealNumber: deal.dealNumber, status: this.domain.nextStatusAfterContract() },
          entityType: NotificationEntityType.DEAL,
          entityId: deal.id,
        });
      }

      return db.deal.findUniqueOrThrow({ where: { id: deal.id }, include: DEAL_DETAILS_INCLUDE });
    });

    return this.mapper.toDetails(result);
  }

  // --------------------------------------------------------------------------
  // Discount approval
  // --------------------------------------------------------------------------

  /** See resolveDiscountRequestNotifications; never fails the action that triggered it. */
  private async resolveDiscountNotifications(
      deal: Parameters<typeof resolveDiscountRequestNotifications>[1],
      result: Parameters<typeof resolveDiscountRequestNotifications>[2],
  ) {
    try {
      await resolveDiscountRequestNotifications(this.notifications, deal, result);
    } catch (error) {
      this.logger.error(
          `Failed to update discount-request notifications for deal ${deal.id}`,
          error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async approveDiscount(user: AuthUser, id: string) {
    if (!user.companyId) {
      throw new ForbiddenException("User does not belong to a company");
    }

    const companyId = user.companyId;

    const result = await this.prisma.$transaction(async db => {
      const deal = await db.deal.findFirst({
        where: {
          id, companyId,
          ...(user.isBranchScoped ? { branchId: user.branchId } : {}),
        },
      });
      if (!deal) throw new DealNotFoundException(id);

      if (deal.discountApprovalStatus !== DiscountApprovalStatus.PENDING) {
        throw new DiscountNotPendingException();
      }

      if (!this.domain.canDecideDiscount(deal.requestedDiscountPercent, hasPermission(user, 'deals.approve_discount'), user.discountLimit)) {
        throw new DiscountApprovalNotAllowedException();
      }

      // Payments are accepted before the decision (FIN-9), against the list
      // price; the discount can't leave the client paid beyond the new price.
      const paid = await db.payment.aggregate({ where: { dealId: deal.id, deletedAt: null }, _sum: { amount: true } });
      if ((paid._sum.amount ?? new Prisma.Decimal(0)).greaterThan(deal.listPrice.minus(deal.requestedDiscountAmount ?? 0))) {
        throw new PaidExceedsDiscountedPriceException();
      }

      await db.deal.update({
        where: { id },
        data: {
          discountApprovalStatus: DiscountApprovalStatus.APPROVED,
          discountApprovedById: user.id,
          discountApprovedAt: new Date(),
          discountAmount: deal.requestedDiscountAmount,
          discountPercent: deal.requestedDiscountPercent,
          salePrice: deal.listPrice.minus(deal.requestedDiscountAmount),
        },
      });

      await this.activityService.discountApproved({
        db, companyId, userId: user.id,
        dealId: deal.id, clientId: deal.clientId,
        metadata: { discountPercent: deal.requestedDiscountPercent.toNumber() },
      });

      if (deal.managerId && deal.managerId !== user.id) {
        await this.notifications.create({
          companyId,
          userId: deal.managerId,
          type: NotificationType.DISCOUNT_DECIDED,
          title: `Discount approved for deal ${deal.dealNumber}`,
          templateKey: 'discountApproved',
          params: { dealNumber: deal.dealNumber },
          entityType: NotificationEntityType.DEAL,
          entityId: deal.id,
        });
      }

      return db.deal.findUniqueOrThrow({ where: { id: deal.id }, include: DEAL_DETAILS_INCLUDE });
    });

    // The reservation agreement was generated at reservation time, while
    // the deal was held at list price. Reissue it at the approved price so
    // the PDF on file matches the deal; the earlier one stays in the
    // documents list as a record of what was printed then.
    await this.generateAndLogDocument({
      companyId,
      dealId: result.id,
      clientId: result.clientId,
      type: DocumentType.RESERVATION,
      userId: user.id,
      activityTitle: activityText('reservationAgreementReissued'),
    });

    await this.resolveDiscountNotifications(result, { outcome: 'approved', byName: user.name });

    return this.mapper.toDetails(result);
  }

  /**
   * Rejecting doesn't cancel the deal. The deal was already held at list
   * price while the request was PENDING (see reserveUnit), so nothing about
   * the price needs to change here — clearing PENDING is what unblocks
   * signContract again, at list price, with the ask on record.
   */
  async rejectDiscount(user: AuthUser, id: string, dto: RejectDiscountDto) {
    if (!user.companyId) {
      throw new ForbiddenException("User does not belong to a company");
    }

    const companyId = user.companyId;

    const result = await this.prisma.$transaction(async db => {
      const deal = await db.deal.findFirst({
        where: {
          id, companyId,
          ...(user.isBranchScoped ? { branchId: user.branchId } : {}),
        },
      });
      if (!deal) throw new DealNotFoundException(id);

      if (deal.discountApprovalStatus !== DiscountApprovalStatus.PENDING) {
        throw new DiscountNotPendingException();
      }

      if (!this.domain.canDecideDiscount(deal.requestedDiscountPercent, hasPermission(user, 'deals.approve_discount'), user.discountLimit)) {
        throw new DiscountApprovalNotAllowedException();
      }

      await db.deal.update({
        where: { id },
        data: {
          discountApprovalStatus: DiscountApprovalStatus.REJECTED,
          discountApprovedById: user.id,
          discountApprovedAt: new Date(),
          discountRejectionReason: dto.reason,
        },
      });

      await this.activityService.discountRejected({
        db, companyId, userId: user.id,
        dealId: deal.id, clientId: deal.clientId,
        metadata: { reason: dto.reason },
      });

      if (deal.managerId && deal.managerId !== user.id) {
        await this.notifications.create({
          companyId,
          userId: deal.managerId,
          type: NotificationType.DISCOUNT_DECIDED,
          title: `Discount rejected for deal ${deal.dealNumber}`,
          message: dto.reason,
          templateKey: 'discountRejected',
          params: { dealNumber: deal.dealNumber, reason: dto.reason },
          entityType: NotificationEntityType.DEAL,
          entityId: deal.id,
        });
      }

      return db.deal.findUniqueOrThrow({ where: { id: deal.id }, include: DEAL_DETAILS_INCLUDE });
    });

    await this.resolveDiscountNotifications(result, { outcome: 'rejected', byName: user.name });

    return this.mapper.toDetails(result);
  }

  /**
   * SH-A1: lets a team lead move a deal from one of their team's individual
   * contributors to another without going through a company-wide admin.
   * Kept as its own endpoint, restricted to an active user on the deal's
   * own branch whose role can manage deals but isn't itself a team lead
   * (deals.manage without deals.reassign) — a dedicated, narrowly-scoped
   * write action for team leads.
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
          ...(user.isBranchScoped ? { branchId: user.branchId } : {}),
        },
      });
      if (!deal) throw new DealNotFoundException(id);

      if (!deal.branchId) {
        throw new BadRequestException("Deal is not assigned to a branch");
      }

      const targetRoleIds = await this.rbacService.findRoleIdsWithPermission(companyId, 'deals.manage', 'deals.reassign');

      const manager = await db.user.findFirst({
        where: {
          id: dto.managerId,
          companyId,
          branchId: deal.branchId,
          roleId: {in: targetRoleIds},
          isActive: true,
        },
      });

      if (!manager) {
        throw new BadRequestException(
            "Manager not assignable — must be an active individual contributor on the same branch",
        );
      }

      await db.deal.update({
        where: { id },
        data: { managerId: dto.managerId },
      });

      const movedTasks = await this.tasksService.handOverOpenTasks(db, {
        companyId, actorId: user.id,
        link: { dealId: deal.id },
        fromUserId: deal.managerId,
        toUserId: dto.managerId,
      });

      await this.activityService.reassignManager({
        db, companyId, userId: user.id,
        dealId: deal.id, clientId: deal.clientId,
        metadata: { fromManagerId: deal.managerId, toManagerId: dto.managerId, movedTaskCount: movedTasks.length },
      });

      const updated = await db.deal.findUniqueOrThrow({ where: { id: deal.id }, include: DEAL_DETAILS_INCLUDE });
      return { deal: updated, previousManagerId: deal.managerId, movedTaskCount: movedTasks.length };
    });

    // After commit, so the new owner never opens a deal that isn't theirs yet.
    if (result.previousManagerId !== dto.managerId && dto.managerId !== user.id) {
      await this.notifications.create({
        companyId,
        userId: dto.managerId,
        type: NotificationType.DEAL_REASSIGNED,
        title: `Deal ${result.deal.dealNumber} reassigned to you`,
        message: result.movedTaskCount > 0 ? `${result.movedTaskCount} open task(s) moved to you` : undefined,
        templateKey: 'dealReassigned',
        params: { dealNumber: result.deal.dealNumber, byName: user.name, tasks: result.movedTaskCount },
        entityType: NotificationEntityType.DEAL,
        entityId: result.deal.id,
      });
    }

    return this.mapper.toDetails(result.deal);
  }

  /**
   * SH-5: moves several deals to one manager at once, for a manager's
   * handover. Same rules and trail as reassignManager, per deal: deals the
   * actor can see, a target who is an active individual contributor on the
   * deal's branch, open tasks moved along, one activity per deal. Deals the
   * target already holds are left alone. One summary notification unless
   * `notify` is false (a handover sends its own).
   */
  async bulkReassign(user: AuthUser, dealIds: string[], managerId: string, opts: { notify?: boolean } = {}) {
    if (!user.companyId) {
      throw new ForbiddenException("User does not belong to a company");
    }
    const companyId = user.companyId;
    const ids = [...new Set(dealIds)];

    const deals = await this.prisma.deal.findMany({
      where: { id: { in: ids }, companyId, ...(user.isBranchScoped ? { branchId: user.branchId } : {}) },
      select: { id: true, dealNumber: true, managerId: true, branchId: true, clientId: true },
    });
    if (deals.length !== ids.length) {
      throw new NotFoundException("Some of these deals were not found.");
    }

    const targetRoleIds = await this.rbacService.findRoleIdsWithPermission(companyId, 'deals.manage', 'deals.reassign');
    for (const branchId of new Set(deals.map((d) => d.branchId))) {
      if (!branchId) throw new BadRequestException("Deal is not assigned to a branch");
      const manager = await this.prisma.user.findFirst({
        where: { id: managerId, companyId, branchId, roleId: { in: targetRoleIds }, isActive: true },
      });
      if (!manager) {
        throw new BadRequestException("Manager not assignable — must be an active individual contributor on the same branch");
      }
    }

    const toMove = deals.filter((d) => d.managerId !== managerId);

    const movedTaskCount = await this.prisma.$transaction(async db => {
      let tasks = 0;
      for (const deal of toMove) {
        await db.deal.update({ where: { id: deal.id }, data: { managerId } });
        const moved = await this.tasksService.handOverOpenTasks(db, {
          companyId, actorId: user.id,
          link: { dealId: deal.id },
          fromUserId: deal.managerId,
          toUserId: managerId,
        });
        tasks += moved.length;
        await this.activityService.reassignManager({
          db, companyId, userId: user.id,
          dealId: deal.id, clientId: deal.clientId,
          metadata: { fromManagerId: deal.managerId, toManagerId: managerId, movedTaskCount: moved.length, bulk: true },
        });
      }
      return tasks;
    });

    if ((opts.notify ?? true) && toMove.length > 0 && managerId !== user.id) {
      await this.notifications.create({
        companyId,
        userId: managerId,
        type: NotificationType.DEAL_REASSIGNED,
        title: `${toMove.length} deal(s) reassigned to you by ${user.name}`,
        message: movedTaskCount > 0 ? `${movedTaskCount} open task(s) moved to you` : undefined,
        templateKey: 'dealsReassigned',
        params: { deals: toMove.length, byName: user.name, tasks: movedTaskCount },
      });
    }

    return { deals: toMove.length, tasks: movedTaskCount };
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
          ...(user.isBranchScoped ? { branchId: user.branchId } : {}),
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

      // The unit's own activity trail, distinct from the deal's — see the
      // cancelReservation() call below for the deal side of this event.
      // Without this, the unit's history shows no record of being relisted.
      await db.activity.create({
        data: {
          companyId,
          userId: user.id,
          unitId: deal.unitId,
          action: ActivityAction.CHANGED_UNIT_STATUS,
          type: ActivityType.UNIT_STATUS_CHANGED,
          ...activityText('unitRelistedAfterCancellation'),
          metadata: { toStatus: UnitStatus.AVAILABLE, dealId: deal.id, reason: dto.reason ?? null },
        },
      });

      await db.paymentSchedule.updateMany({
        where: {
          dealId: deal.id,
          deletedAt: null,
          status: { in: [PaymentScheduleStatus.PENDING, PaymentScheduleStatus.PARTIAL, PaymentScheduleStatus.OVERDUE] },
        },
        data: { deletedAt: new Date() },
      });

      const tasksCancelled = await this.tasksService.cancelOpenTasksForDeal(db, {
        companyId, dealId: deal.id, actorId: user.id,
      });

      await this.activityService.cancelReservation({
        db, companyId, userId: user.id,
        dealId: deal.id, clientId: deal.clientId,
        metadata: { reason: dto.reason ?? null, tasksCancelled },
      });

      if (deal.managerId) {
        await this.notifications.create({
          companyId,
          userId: deal.managerId,
          type: NotificationType.DEAL_STATUS_CHANGED,
          title: dealStatusTitle(deal.dealNumber, DealStatus.CANCELLED),
          templateKey: 'dealStatusChanged',
          params: { dealNumber: deal.dealNumber, status: DealStatus.CANCELLED },
          entityType: NotificationEntityType.DEAL,
          entityId: deal.id,
        });
      }

      return db.deal.findUniqueOrThrow({ where: { id: deal.id }, include: DEAL_DETAILS_INCLUDE });
    });

    // A deposit taken on the reservation is still the client's: Finance has
    // a refund to record.
    await this.moneyHeld.notifyIfHeld(result);

    // A request still waiting when the reservation is cancelled no longer
    // needs anyone's decision.
    if (result.discountApprovalStatus === DiscountApprovalStatus.PENDING) {
      await this.resolveDiscountNotifications(result, { outcome: 'withdrawn' });
    }

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
        ...(user.isBranchScoped ? { branchId: user.branchId } : {}),
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

    // The unit's own activity trail, distinct from the deal's dealUpdated()
    // call below — without this, the unit's history shows no record of
    // being marked sold.
    await db.activity.create({
      data: {
        companyId: deal.companyId,
        userId: user.id,
        unitId: deal.unitId,
        action: ActivityAction.CHANGED_UNIT_STATUS,
        type: ActivityType.UNIT_STATUS_CHANGED,
        ...activityText('unitMarkedSold'),
        metadata: { toStatus: UnitStatus.SOLD, dealId },
      },
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
        title: dealStatusTitle(deal.dealNumber, this.domain.nextStatusAfterCompletion()),
        templateKey: 'dealStatusChanged',
        params: { dealNumber: deal.dealNumber, status: this.domain.nextStatusAfterCompletion() },
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
        ...(user.isBranchScoped ? { branchId: user.branchId } : {}),
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
          ...(user.isBranchScoped ? { branchId: user.branchId } : {}),
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
        ...(user.isBranchScoped ? { branchId: user.branchId } : {}),
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
        activityText('documentRegenerated', {documentType: type}),
    );

    return document;
  }

  // `mine`: opt-in, and only honored when the caller actually holds
  // dashboard.my_performance (SALES_MANAGER's default bundle) — this same
  // endpoint backs both the dashboard's "deals by stage" cards (which pass
  // `mine: true` so a self-scoped viewer sees their own pipeline, matching
  // DashboardService.isSelfScoped) and the standalone Deals list page's
  // summary cards (which never pass it, so that page stays whole-branch
  // with its own explicit manager filter regardless of caller). A
  // permission-only check here would've silently scoped the Deals page
  // too, which nothing asked for.
  async getStatusSummary(user: AuthUser, projectId?: string, branchId?: string, mine?: boolean) {
    if (!user.companyId) {
      throw new ForbiddenException("User does not belong to a company");
    }

    const where: Prisma.DealWhereInput = { companyId: user.companyId, projectId };

    if (user.isBranchScoped) {
      where.branchId = user.branchId;
    } else if (branchId) {
      where.branchId = branchId;
    }

    if (mine && hasPermission(user, "dashboard.my_performance")) {
      where.managerId = user.id;
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