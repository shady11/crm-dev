import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import {ActivityAction, ActivityType, DealStatus, Prisma, UnitStatus} from "@/generated/prisma/client";
import {AuthUser} from "@/common/types/auth-user.type";
import {CreateUnitDto} from "./dto/create-unit.dto";
import {UpdateUnitDto} from "./dto/update-unit.dto";
import {QueryUnitsDto} from "./dto/query-units.dto";
import {CreateUnitsBulkDto} from "@/modules/units/dto/create-units-bulk.dto";
import {PrismaService} from "@/database/prisma.service";
import {diffChangedFields} from "@/common/utils/activity-diff.util";
import {ACTIVE_DEAL_STATUSES} from "@/modules/deals/deal.constants";

/**
 * The only statuses a person may set by hand. RESERVED and SOLD belong to
 * the deal lifecycle (DealsService.reserveUnit / cancelDeal / complete and
 * DealExpiryService) — setting them manually would show a unit as booked or
 * sold with no deal, client or payment behind it, and clearing them manually
 * would put a unit under contract back on sale.
 */
const MANUAL_UNIT_STATUSES: UnitStatus[] = [
    UnitStatus.AVAILABLE,
    UnitStatus.UNAVAILABLE,
];

// A unit is held by a deal while one is in progress, and permanently once one
// has completed.
const UNIT_HOLDING_DEAL_STATUSES: DealStatus[] = [
    ...ACTIVE_DEAL_STATUSES,
    DealStatus.COMPLETED,
];

const UNIT_LOCATION_INCLUDE = {
    project: {select: {id: true, name: true}},
    block: {select: {id: true, name: true}},
    entrance: {select: {id: true, name: true}},
    floor: {select: {id: true, number: true}},
} satisfies Prisma.UnitInclude;

@Injectable()
export class UnitsService {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * Records a company-scoped inventory activity, same idea as
     * logUserActivity in UsersService — a fire-and-forget insert alongside
     * the mutation rather than part of its transaction. unitId is left out
     * for a unit that's already been hard-deleted, since Activity.unitId is
     * a real FK and the row it would point to no longer exists.
     */
    private logUnitActivity(params: {
        companyId: string;
        actorId: string;
        unitId?: string;
        action: ActivityAction;
        type: ActivityType;
        title: string;
        metadata?: Prisma.InputJsonValue;
    }) {
        return this.prisma.activity.create({
            data: {
                companyId: params.companyId,
                userId: params.actorId,
                unitId: params.unitId,
                action: params.action,
                type: params.type,
                title: params.title,
                metadata: params.metadata,
            },
        });
    }

    async findAll(user: AuthUser, query: QueryUnitsDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const page = query.page ?? 1;
        const limit = query.limit ?? 50;
        const skip = (page - 1) * limit;

        const where: Prisma.UnitWhereInput = {
            project: {
                companyId: user.companyId,
            },
            deletedAt: null,
        };

        if (query.projectId) {
            where.projectId = query.projectId;
        }

        if (query.blockId) {
            where.blockId = query.blockId;
        }

        if (query.entranceId) {
            where.entranceId = query.entranceId;
        }

        if (query.floorId) {
            where.floorId = query.floorId;
        }

        if (query.type) {
            where.type = query.type;
        }

        if (query.status) {
            where.status = query.status;
        }

        if (query.rooms !== undefined) {
            where.rooms = query.rooms;
        }

        if (query.search) {
            where.OR = [
                {
                    number: {
                        contains: query.search,
                        mode: "insensitive",
                    },
                },
                {
                    block: {
                        name: {
                            contains: query.search,
                            mode: "insensitive",
                        },
                    },
                },
                {
                    entrance: {
                        name: {
                            contains: query.search,
                            mode: "insensitive",
                        },
                    },
                },
                {
                    project: {
                        name: {
                            contains: query.search,
                            mode: "insensitive",
                        },
                    },
                },
            ];
        }

        const [items, total] = await Promise.all([
            this.prisma.unit.findMany({
                where,
                skip,
                take: limit,
                orderBy: [
                    {
                        block: {
                            order: "asc",
                        },
                    },
                    {
                        entrance: {
                            order: "asc",
                        },
                    },
                    {
                        floor: {
                            order: "asc",
                        },
                    },
                    {
                        number: "asc",
                    },
                ],
                include: {
                    project: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    block: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    entrance: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    floor: {
                        select: {
                            id: true,
                            number: true,
                        },
                    },
                },
            }),
            this.prisma.unit.count({
                where,
            }),
        ]);

        return {
            items,
            meta: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    async findByFloor(user: AuthUser, floorId: string, query: QueryUnitsDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        await this.ensureFloorBelongsToCompany(floorId, user.companyId);

        const page = query.page ?? 1;
        const limit = query.limit ?? 50;
        const skip = (page - 1) * limit;

        const where: Prisma.UnitWhereInput = {
            floorId,
            floor: {
                entrance: {
                    block: {
                        project: {
                            companyId: user.companyId,
                        },
                    },
                },
            },
            deletedAt: null,
        };

        if (query.type) {
            where.type = query.type;
        }

        if (query.status) {
            where.status = query.status;
        }

        if (query.rooms !== undefined) {
            where.rooms = query.rooms;
        }

        if (query.search) {
            where.OR = [
                {
                    number: {
                        contains: query.search,
                        mode: "insensitive",
                    },
                },
            ];
        }

        const [items, total] = await Promise.all([
            this.prisma.unit.findMany({
                where,
                skip,
                take: limit,
                orderBy: {
                    number: "asc",
                },
                include: {
                    project: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    block: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    entrance: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    floor: {
                        select: {
                            id: true,
                            number: true,
                        },
                    },
                },
            }),
            this.prisma.unit.count({
                where,
            }),
        ]);

        return {
            items,
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

        const unit = await this.prisma.unit.findFirst({
            where: {
                id,
                project: {
                    companyId: user.companyId,
                },
                deletedAt: null,
            },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                    },
                },
                block: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                entrance: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                floor: {
                    select: {
                        id: true,
                        number: true,
                    },
                },
                deals: {
                    orderBy: {
                        createdAt: "desc",
                    },
                    select: {
                        id: true,
                        dealNumber: true,
                        status: true,
                        financingType: true,
                        salePrice: true,
                        discountAmount: true,
                        discountPercent: true,
                        deposit: true,
                        reservedAt: true,
                        reservationExpiresAt: true,
                        contractNumber: true,
                        contractDate: true,
                        cancelledAt: true,
                        cancelReason: true,
                        note: true,
                        client: {
                            select: {
                                id: true,
                                fullName: true,
                                phone: true,
                            },
                        },
                        manager: {
                            select: {
                                id: true,
                                fullName: true,
                            },
                        },
                        createdAt: true,
                    },
                },
            },
        });

        if (!unit) {
            throw new NotFoundException("Unit not found");
        }

        return unit;
    }

    async create(user: AuthUser, floorId: string, dto: CreateUnitDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        if (dto.status !== undefined) {
            this.ensureManualStatus(dto.status);
        }

        const floor = await this.ensureFloorBelongsToCompany(
            floorId,
            user.companyId,
        );

        await this.ensureUnitNumberIsUniqueInsideBlock(
            dto.number,
            floor.blockId,
        );

        const created = await this.prisma.unit.create({
            data: {
                number: dto.number,
                type: dto.type,
                status: dto.status ?? UnitStatus.AVAILABLE,
                rooms: dto.rooms,
                area: dto.area,
                price: dto.price,
                projectId: floor.projectId,
                blockId: floor.blockId,
                entranceId: floor.entranceId,
                floorId,
            },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                block: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                entrance: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                floor: {
                    select: {
                        id: true,
                        number: true,
                    },
                },
            },
        });

        await this.logUnitActivity({
            companyId: user.companyId,
            actorId: user.id,
            unitId: created.id,
            action: ActivityAction.CREATED_UNIT,
            type: ActivityType.UNIT_CREATED,
            title: `Unit "${created.number}" created`,
            metadata: {blockId: created.blockId, floorId: created.floorId},
        });

        return created;
    }

    async createBulk(user: AuthUser, floorId: string, dto: CreateUnitsBulkDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const floor = await this.ensureFloorBelongsToCompany(floorId, user.companyId);

        const created = await Promise.all(
            dto.units.map((unit) =>
                this.prisma.unit.create({
                    data: {
                        number: unit.number,
                        type: unit.type,
                        status: UnitStatus.AVAILABLE,
                        rooms: unit.rooms,
                        area: unit.area,
                        price: unit.price,
                        projectId: floor.projectId,
                        blockId: floor.blockId,
                        entranceId: floor.entranceId,
                        floorId,
                    },
                })
            )
        );

        await this.logUnitActivity({
            companyId: user.companyId,
            actorId: user.id,
            action: ActivityAction.IMPORTED_UNITS,
            type: ActivityType.UNITS_IMPORTED,
            title: `${created.length} units created on floor`,
            metadata: {floorId, blockId: floor.blockId, count: created.length},
        });

        return created;
    }

    async update(user: AuthUser, id: string, dto: UpdateUnitDto) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const unit = await this.prisma.unit.findFirst({
            where: {
                id,
                project: {
                    companyId: user.companyId,
                },
            },
        });

        if (!unit) {
            throw new NotFoundException("Unit not found");
        }

        if (dto.number) {
            await this.ensureUnitNumberIsUniqueInsideBlock(
                dto.number,
                unit.blockId,
                id,
            );
        }

        // The edit form always sends the current status back, so an
        // unchanged status is a no-op rather than a manual status change.
        const statusChanged = dto.status !== undefined && dto.status !== unit.status;
        if (statusChanged) {
            await this.ensureManualStatusChangeAllowed(unit, dto.status);
        }

        const changes = diffChangedFields(dto, unit, [
            "number", "type", "rooms",
            {field: "area", normalize: (v) => Number(v)},
            {field: "price", normalize: (v) => Number(v)},
        ]);

        const data: Prisma.UnitUpdateManyMutationInput = {
            number: dto.number,
            type: dto.type,
            status: statusChanged ? dto.status : undefined,
            rooms: dto.rooms,
            area: dto.area,
            price: dto.price,
        };

        if (statusChanged) {
            await this.applyStatusChangeIfUnchanged(unit, data);
        } else {
            await this.prisma.unit.update({where: {id}, data});
        }

        const updated = await this.prisma.unit.findUniqueOrThrow({
            where: {id},
            include: UNIT_LOCATION_INCLUDE,
        });

        if (statusChanged) {
            await this.logUnitActivity({
                companyId: user.companyId,
                actorId: user.id,
                unitId: id,
                action: ActivityAction.CHANGED_UNIT_STATUS,
                type: ActivityType.UNIT_STATUS_CHANGED,
                title: `Unit "${updated.number}" status changed`,
                metadata: {fromStatus: unit.status, toStatus: updated.status},
            });
        }

        if (changes) {
            await this.logUnitActivity({
                companyId: user.companyId,
                actorId: user.id,
                unitId: id,
                action: ActivityAction.UPDATED_UNIT,
                type: ActivityType.UNIT_UPDATED,
                title: `Unit "${updated.number}" updated`,
                metadata: changes,
            });
        }

        return updated;
    }

    async duplicate(user: AuthUser, id: string) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const unit = await this.prisma.unit.findFirst({
            where: {
                id,
                project: {
                    companyId: user.companyId,
                },
                deletedAt: null,
            },
        });

        if (!unit) {
            throw new NotFoundException("Unit not found");
        }

        // Get global max unit number
        const allUnits = await this.prisma.unit.findMany({
            where: { blockId: unit.blockId },
            select: { number: true },
        });

        const maxUnitNumber = allUnits.reduce((max, u) => {
            const num = parseInt(u.number);
            return !isNaN(num) && num > max ? num : max;
        }, 0);

        const created = await this.prisma.unit.create({
            data: {
                number: String(maxUnitNumber + 1),
                type: unit.type,
                status: UnitStatus.AVAILABLE,
                rooms: unit.rooms,
                area: unit.area,
                price: unit.price,
                projectId: unit.projectId,
                blockId: unit.blockId,
                entranceId: unit.entranceId,
                floorId: unit.floorId,
            },
        });

        await this.logUnitActivity({
            companyId: user.companyId,
            actorId: user.id,
            unitId: created.id,
            action: ActivityAction.CREATED_UNIT,
            type: ActivityType.UNIT_CREATED,
            title: `Unit "${created.number}" created (duplicated from "${unit.number}")`,
            metadata: {duplicatedFromUnitId: unit.id},
        });

        return created;
    }

    async remove(user: AuthUser, id: string) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const unit = await this.prisma.unit.findFirst({
            where: {
                id,
                project: {
                    companyId: user.companyId,
                },
            },
            include: {
                _count: {
                    select: {
                        deals: true,
                    },
                },
            },
        });

        if (!unit) {
            throw new NotFoundException("Unit not found");
        }

        if (unit._count.deals > 0) {
            throw new BadRequestException(
                "Unit has deals and cannot be deleted",
            );
        }

        await this.prisma.unit.delete({
            where: {
                id,
            },
        });

        // No unitId — the row is already gone, and Activity.unitId is a real
        // FK, so the identifying details go in metadata instead.
        await this.logUnitActivity({
            companyId: user.companyId,
            actorId: user.id,
            action: ActivityAction.DELETED_UNIT,
            type: ActivityType.UNIT_DELETED,
            title: `Unit "${unit.number}" deleted`,
            metadata: {unitId: unit.id, blockId: unit.blockId},
        });

        return {
            success: true,
        };
    }

    async updateStatus(user: AuthUser, id: string, status: UnitStatus) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const unit = await this.findOne(user, id);
        const fromStatus = unit.status;

        if (status === fromStatus) {
            return this.prisma.unit.findUniqueOrThrow({where: {id}});
        }

        await this.ensureManualStatusChangeAllowed(unit, status);
        await this.applyStatusChangeIfUnchanged(unit, {status});

        const updated = await this.prisma.unit.findUniqueOrThrow({where: {id}});

        if (fromStatus !== updated.status) {
            await this.logUnitActivity({
                companyId: user.companyId,
                actorId: user.id,
                unitId: id,
                action: ActivityAction.CHANGED_UNIT_STATUS,
                type: ActivityType.UNIT_STATUS_CHANGED,
                title: `Unit "${updated.number}" status changed`,
                metadata: {fromStatus, toStatus: updated.status},
            });
        }

        return updated;
    }

    private ensureManualStatus(status: UnitStatus) {
        if (!MANUAL_UNIT_STATUSES.includes(status)) {
            throw new BadRequestException(
                `Unit status ${status} is set by deals and cannot be set manually`,
            );
        }
    }

    /**
     * A manual status change must target AVAILABLE/UNAVAILABLE and must not
     * touch a unit that a deal is holding — that unit is released by
     * cancelling the deal (or by reservation expiry), never by hand. A
     * RESERVED/SOLD unit with no such deal (left over from before this rule)
     * may still be corrected back to AVAILABLE/UNAVAILABLE.
     */
    private async ensureManualStatusChangeAllowed(
        unit: {id: string; number: string},
        status: UnitStatus,
    ) {
        this.ensureManualStatus(status);

        const holdingDeal = await this.prisma.deal.findFirst({
            where: {
                unitId: unit.id,
                deletedAt: null,
                status: {in: UNIT_HOLDING_DEAL_STATUSES},
            },
            select: {dealNumber: true, status: true},
        });

        if (holdingDeal) {
            throw new ConflictException(
                `Unit "${unit.number}" is held by deal ${holdingDeal.dealNumber} (${holdingDeal.status}); ` +
                "its status changes through the deal",
            );
        }
    }

    /**
     * Writes a status change only if the unit still has the status it was
     * read with, so a reservation that lands between the check above and
     * this write is not silently overwritten.
     */
    private async applyStatusChangeIfUnchanged(
        unit: {id: string; number: string; status: UnitStatus},
        data: Prisma.UnitUpdateManyMutationInput,
    ) {
        const {count} = await this.prisma.unit.updateMany({
            where: {id: unit.id, status: unit.status},
            data,
        });

        if (count === 0) {
            throw new ConflictException(
                `Unit "${unit.number}" status changed while you were editing it; reload and try again`,
            );
        }
    }

    private async ensureFloorBelongsToCompany(
        floorId: string,
        companyId: string,
    ) {
        const floor = await this.prisma.floor.findFirst({
            where: {
                id: floorId,
                entrance: {
                    block: {
                        project: {
                            companyId,
                        },
                    },
                },
            },
        });

        if (!floor) {
            throw new BadRequestException("Floor does not belong to your company");
        }

        return floor;
    }

    private async ensureUnitNumberIsUniqueInsideBlock(
        number: string,
        blockId: string,
        exceptUnitId?: string,
    ) {
        const existingUnit = await this.prisma.unit.findFirst({
            where: {
                number,
                blockId,
                id: exceptUnitId
                    ? {
                        not: exceptUnitId,
                    }
                    : undefined,
            },
        });

        if (existingUnit) {
            throw new BadRequestException(
                "Unit with this number already exists in this block",
            );
        }
    }
}