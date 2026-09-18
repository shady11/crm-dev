import { Controller, Get, UseGuards } from "@nestjs/common";
import {
    LeadStatus,
    UnitStatus,
    UnitType,
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
            // Roles are dynamic now (see GET /rbac/roles) — no fixed list to
            // hand back here.
        };
    }
}
