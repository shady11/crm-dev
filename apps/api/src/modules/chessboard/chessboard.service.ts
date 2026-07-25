import {BadRequestException, ForbiddenException, Injectable, NotFoundException,} from "@nestjs/common";
import {Prisma, UnitStatus, UnitType} from "@/generated/prisma/client";
import {PrismaService} from "@/database/prisma.service";
import {AuthUser} from "@/common/types/auth-user.type";
import {QueryChessboardDto} from "./dto/query-chessboard.dto";

type ChessboardUnit = {
    id: string;
    number: string;
    type: UnitType;
    status: UnitStatus;
    rooms: number | null;
    area: Prisma.Decimal;
    price: Prisma.Decimal;
};

type ChessboardFloor = {
    id: string;
    number: number;
    order: number;
    units: ChessboardUnit[];
};

type ChessboardEntrance = {
    id: string;
    name: string;
    order: number;
    floors: ChessboardFloor[];
};

type ChessboardBlock = {
    id: string;
    name: string;
    order: number;
    entrances: ChessboardEntrance[];
};

@Injectable()
export class ChessboardService {
    constructor(private readonly prisma: PrismaService) {}

    async getProjectChessboard(
        user: AuthUser,
        projectId: string,
        query: QueryChessboardDto,
    ) {
        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        const project = await this.prisma.project.findFirst({
            where: {
                id: projectId,
                companyId: user.companyId,
            },
            select: {
                id: true,
                name: true,
                address: true,
                status: true,
            },
        });

        if (!project) {
            throw new NotFoundException("Project not found");
        }

        if (query.blockId) {
            await this.ensureBlockBelongsToProject(
                query.blockId,
                projectId,
                user.companyId,
            );
        }

        if (query.entranceId) {
            await this.ensureEntranceBelongsToProject(
                query.entranceId,
                projectId,
                user.companyId,
            );
        }

        const unitsWhere: Prisma.UnitWhereInput = {
            projectId,
            project: {
                companyId: user.companyId,
            },
        };

        if (query.blockId) {
            unitsWhere.blockId = query.blockId;
        }

        if (query.entranceId) {
            unitsWhere.entranceId = query.entranceId;
        }

        if (query.type) {
            unitsWhere.type = query.type;
        }

        if (query.status) {
            unitsWhere.status = query.status;
        }

        const units = await this.prisma.unit.findMany({
            where: unitsWhere,
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
                        order: "desc",
                    },
                },
                {
                    number: "desc",
                },
            ],
            select: {
                id: true,
                number: true,
                type: true,
                status: true,
                rooms: true,
                area: true,
                price: true,
                block: {
                    select: {
                        id: true,
                        name: true,
                        order: true,
                    },
                },
                entrance: {
                    select: {
                        id: true,
                        name: true,
                        order: true,
                    },
                },
                floor: {
                    select: {
                        id: true,
                        number: true,
                        order: true,
                    },
                },
            },
        });

        const blocksMap = new Map<string, ChessboardBlock>();

        for (const unit of units) {
            let block = blocksMap.get(unit.block.id);

            if (!block) {
                block = {
                    id: unit.block.id,
                    name: unit.block.name,
                    order: unit.block.order,
                    entrances: [],
                };

                blocksMap.set(unit.block.id, block);
            }

            let entrance = block.entrances.find(
                (item) => item.id === unit.entrance.id,
            );

            if (!entrance) {
                entrance = {
                    id: unit.entrance.id,
                    name: unit.entrance.name,
                    order: unit.entrance.order,
                    floors: [],
                };

                block.entrances.push(entrance);
            }

            let floor = entrance.floors.find(
                (item) => item.id === unit.floor.id,
            );

            if (!floor) {
                floor = {
                    id: unit.floor.id,
                    number: unit.floor.number,
                    order: unit.floor.order,
                    units: [],
                };

                entrance.floors.push(floor);
            }

            floor.units.push({
                id: unit.id,
                number: unit.number,
                type: unit.type,
                status: unit.status,
                rooms: unit.rooms,
                area: unit.area,
                price: unit.price,
            });
        }

        const blocks = Array.from(blocksMap.values())
            .map((block) => ({
                ...block,
                entrances: block.entrances
                    .map((entrance) => ({
                        ...entrance,
                        floors: entrance.floors.sort((a, b) => b.order - a.order),
                    }))
                    .sort((a, b) => a.order - b.order),
            }))
            .sort((a, b) => a.order - b.order);

        const summary = this.buildSummary(units);

        return {
            project,
            filters: {
                blockId: query.blockId ?? null,
                entranceId: query.entranceId ?? null,
                type: query.type ?? null,
                status: query.status ?? null,
            },
            summary,
            blocks,
        };
    }

    private buildSummary(
        units: Array<{
            status: UnitStatus;
            type: UnitType;
            price: Prisma.Decimal;
        }>,
    ) {
        const byStatus = units.reduce<Record<UnitStatus, number>>(
            (acc, unit) => {
                acc[unit.status] = (acc[unit.status] ?? 0) + 1;
                return acc;
            },
            {
                AVAILABLE: 0,
                RESERVED: 0,
                SOLD: 0,
                UNAVAILABLE: 0,
            },
        );

        const byType = units.reduce<Record<UnitType, number>>(
            (acc, unit) => {
                acc[unit.type] = (acc[unit.type] ?? 0) + 1;
                return acc;
            },
            {
                APARTMENT: 0,
                COMMERCIAL: 0,
                PARKING: 0,
                STORAGE: 0,
            },
        );

        const totalPrice = units.reduce((sum, unit) => {
            return sum + Number(unit.price);
        }, 0);

        return {
            totalUnits: units.length,
            totalPrice,
            byStatus,
            byType,
        };
    }

    private async ensureBlockBelongsToProject(
        blockId: string,
        projectId: string,
        companyId: string,
    ) {
        const block = await this.prisma.block.findFirst({
            where: {
                id: blockId,
                projectId,
                project: {
                    companyId,
                },
            },
        });

        if (!block) {
            throw new BadRequestException(
                "Block does not belong to this project",
            );
        }
    }

    private async ensureEntranceBelongsToProject(
        entranceId: string,
        projectId: string,
        companyId: string,
    ) {
        const entrance = await this.prisma.entrance.findFirst({
            where: {
                id: entranceId,
                projectId,
                project: {
                    companyId,
                },
            },
        });

        if (!entrance) {
            throw new BadRequestException(
                "Entrance does not belong to this project",
            );
        }
    }
}