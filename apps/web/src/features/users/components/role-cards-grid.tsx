import {RoleCard} from "@/features/users/components/role-card.tsx";

type RoleSummary = {id: string; name: string};

interface RoleCardsGridProps {
    roles: RoleSummary[];
    membersByRole: Map<string, { count: number; initials: string[] }>;
}

export function RoleCardsGrid({ roles, membersByRole }: RoleCardsGridProps) {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {roles.map((role) => {
                const bucket = membersByRole.get(role.id) ?? { count: 0, initials: [] };
                return (
                    <RoleCard
                        key={role.id}
                        roleName={role.name}
                        memberCount={bucket.count}
                        memberInitials={bucket.initials}
                    />
                );
            })}
        </div>
    );
}
