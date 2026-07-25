import {ForbiddenException, Injectable,} from '@nestjs/common';

import {DealStatus, Prisma, UnitStatus} from '@/generated/prisma/client';
import {PrismaService} from '@/database/prisma.service';

import {ClientNotFoundException, DealNotFoundException, UnitNotFoundException,} from '../exceptions';

import {DealMapper} from '../mappers/deal.mapper';
import {DealQueryDto} from '../dto/deal-query.dto';
import {DealDomainService} from './deal-domain.service';
import {DealActivityService} from './deal-activity.service';
import {ACTIVE_DEAL_STATUSES, DEAL_DETAILS_INCLUDE} from "../deal.constants";
import {ReserveUnitDto} from "../dto/reserve-unit.dto";
import {AuthUser} from "@/common/types/auth-user.type";

@Injectable()
export class DealsService {
  constructor(
      private readonly prisma: PrismaService,
      private readonly mapper: DealMapper,
      private readonly domain: DealDomainService,
      private readonly activityService: DealActivityService,
  ) {}

  // --------------------------------------------------------------------------
  // Queries
  // --------------------------------------------------------------------------

  async findAll(user: AuthUser, query: DealQueryDto) {
    if (!user.companyId) {
      throw new ForbiddenException("User does not belong to a company");
    }

    const where: Prisma.DealWhereInput = {
      companyId: user.companyId,
      status: query.status,
      projectId: query.projectId,
      clientId: query.clientId,
      managerId: query.managerId,
    };

    const deals = await this.prisma.deal.findMany({
      where,
      include: {
        client: true,
        manager: true,
        project: true,
        unit: {
          include: {
            block: true,
            entrance: true,
            floor: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return this.mapper.toList(deals);
  }

  async findOne(user: AuthUser, id: string) {
    if (!user.companyId) {
      throw new ForbiddenException("User does not belong to a company");
    }

    const deal = await this.getDealOrThrow(id, user.companyId);

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
    await this.getClientOrThrow(dto.clientId, companyId);
    await this.getManagerOrThrow(managerId, companyId);

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

      const deal = await db.deal.create({
        data: {
          companyId,

          projectId: unit.projectId,
          unitId: unit.id,

          clientId: dto.clientId,
          managerId,

          status: DealStatus.RESERVED,
          financingType: dto.financingType,

          listPrice: unit.price,
          salePrice: dto.salePrice,

          discountAmount: dto.discountAmount ?? 0,
          discountPercent: dto.discountPercent ?? 0,

          deposit: dto.deposit ?? 0,

          reservedAt: new Date(),
          reservationExpiresAt: dto.reservationExpiresAt
              ? new Date(dto.reservationExpiresAt)
              : null,

          reservedById: managerId,

          note: dto.note,
        },
      });

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

    return this.mapper.toDetails(result);
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

  private async getDealOrThrow(id: string, companyId: string) {
    const deal = await this.prisma.deal.findFirst({
      where: { id, companyId },
      include: DEAL_DETAILS_INCLUDE,
    });

    if (!deal) throw new DealNotFoundException(id);

    return deal;
  }

  private getClientOrThrow(id: string, companyId: string) {
    return this.findOneOrThrow(
        this.prisma.client,
        { id, companyId },
        new ClientNotFoundException(id),
    );
  }

  private async getManagerOrThrow(managerId: string, companyId: string) {
    return this.prisma.user.findFirstOrThrow({
      where: { id: managerId, companyId },
    });
  }
}