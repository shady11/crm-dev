import {BadRequestException, ConflictException, Injectable, NotFoundException} from "@nestjs/common";
import {AuditAction, Prisma, SettingOptionType} from "@/generated/prisma/client";
import {PrismaService} from "@/database/prisma.service";
import {AuditLogService} from "@/modules/audit-log/audit-log.service";
import {AuthUser} from "@/common/types/auth-user.type";
import {CreateSettingOptionDto} from "./dto/create-setting-option.dto";
import {UpdateSettingOptionDto} from "./dto/update-setting-option.dto";
import {QuerySettingOptionsDto} from "./dto/query-setting-options.dto";

@Injectable()
export class SettingOptionsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly auditLog: AuditLogService,
    ) {}

    async findAll(query: QuerySettingOptionsDto) {
        const where: Prisma.SettingOptionWhereInput = {};

        if (query.type) {
            where.type = query.type;
        }

        if (!query.includeInactive) {
            where.isActive = true;
        }

        return this.prisma.settingOption.findMany({
            where,
            orderBy: [{type: "asc"}, {label: "asc"}],
        });
    }

    async create(actor: AuthUser, dto: CreateSettingOptionDto) {
        const code = dto.code.trim();
        assertValidCode(dto.type, code);

        const existing = await this.prisma.settingOption.findUnique({
            where: {type_code: {type: dto.type, code}},
        });

        if (existing) {
            throw new ConflictException("This option already exists");
        }

        const option = await this.prisma.settingOption.create({
            data: {type: dto.type, code, label: dto.label.trim()},
        });

        await this.auditLog.record({
            actorId: actor.id,
            actorEmail: actor.email,
            action: AuditAction.SETTING_OPTION_CREATED,
            targetType: "SettingOption",
            targetId: option.id,
            metadata: {type: option.type, code: option.code, label: option.label},
        });

        return option;
    }

    async update(actor: AuthUser, id: string, dto: UpdateSettingOptionDto) {
        await this.findOne(id);

        const option = await this.prisma.settingOption.update({
            where: {id},
            data: {
                label: dto.label?.trim(),
                isActive: dto.isActive,
            },
        });

        await this.auditLog.record({
            actorId: actor.id,
            actorEmail: actor.email,
            action: AuditAction.SETTING_OPTION_UPDATED,
            targetType: "SettingOption",
            targetId: option.id,
            metadata: {type: option.type, code: option.code, changes: {...dto}},
        });

        return option;
    }

    async remove(actor: AuthUser, id: string) {
        const option = await this.findOne(id);

        const inUse = await this.isReferencedByCompany(option.type, option.code);

        if (inUse) {
            throw new ConflictException(
                "This option is in use by at least one company — deactivate it instead of deleting it",
            );
        }

        await this.prisma.settingOption.delete({where: {id}});

        await this.auditLog.record({
            actorId: actor.id,
            actorEmail: actor.email,
            action: AuditAction.SETTING_OPTION_DELETED,
            targetType: "SettingOption",
            targetId: option.id,
            metadata: {type: option.type, code: option.code, label: option.label},
        });

        return {success: true};
    }

    private async findOne(id: string) {
        const option = await this.prisma.settingOption.findUnique({where: {id}});

        if (!option) {
            throw new NotFoundException("Setting option not found");
        }

        return option;
    }

    private isReferencedByCompany(type: SettingOptionType, code: string) {
        const field = FIELD_BY_TYPE[type];

        return this.prisma.company
            .count({where: {deletedAt: null, [field]: code}})
            .then((count) => count > 0);
    }

    /**
     * Used by CompaniesService to reject a currency/locale/timezone that
     * isn't (or is no longer) an active offered option, so a company can
     * never end up with a value the pickers wouldn't have let it pick.
     */
    async assertActiveOption(type: SettingOptionType, code: string) {
        const option = await this.prisma.settingOption.findUnique({
            where: {type_code: {type, code}},
        });

        if (!option || !option.isActive) {
            throw new BadRequestException(`"${code}" is not an available ${type.toLowerCase()} option`);
        }
    }
}

const FIELD_BY_TYPE: Record<SettingOptionType, "currency" | "locale" | "timezone"> = {
    CURRENCY: "currency",
    LOCALE: "locale",
    TIMEZONE: "timezone",
};

/**
 * Guards against an option nobody could ever format with — Company.currency/
 * locale/timezone feed straight into Intl.NumberFormat/DateTimeFormat
 * elsewhere in the app (see lib/i18n/formatters.ts), so a code that throws
 * there would silently break every page rendering that tenant's data.
 */
function assertValidCode(type: SettingOptionType, code: string): void {
    try {
        if (type === "CURRENCY") {
            new Intl.NumberFormat("en-US", {style: "currency", currency: code});
        } else if (type === "LOCALE") {
            if (!Intl.getCanonicalLocales(code).length) {
                throw new Error("empty");
            }
        } else {
            new Intl.DateTimeFormat("en-US", {timeZone: code});
        }
    } catch {
        throw new BadRequestException(`"${code}" is not a valid ${type.toLowerCase()} code`);
    }
}
