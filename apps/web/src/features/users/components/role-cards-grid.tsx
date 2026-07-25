import {RoleCard} from "@/features/users/components/role-card.tsx";
import type {UserRole} from "@/features/users/types/user.types";

interface RoleCardsGridProps {
    roles: UserRole[];
    membersByRole: Map<UserRole, { count: number; initials: string[] }>;
}

export function RoleCardsGrid({ roles, membersByRole }: RoleCardsGridProps) {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {roles.map((role) => {
                const bucket = membersByRole.get(role) ?? { count: 0, initials: [] };
                return (
                    <RoleCard
                        key={role}
                        role={role}
                        memberCount={bucket.count}
                        memberInitials={bucket.initials}
                    />
                );
            })}
        </div>
    );
}