import { Controller, Get, UseGuards } from "@nestjs/common";
import {
    LeadStatus,
    UnitStatus,
    UnitType,
    UserRole,
} from "@/generated/prisma/enums";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";

@UseGuards(JwtAuthGuard)
@Controller("references")
export class ReferencesController {
    @Get()
    getReferences() {
        return {
            leadStatuses: Object.values(LeadStatus),
            unitTypes: Object.values(UnitType),
            unitStatuses: Object.values(UnitStatus),
            userRoles: Object.values(UserRole),
        };
    }
}