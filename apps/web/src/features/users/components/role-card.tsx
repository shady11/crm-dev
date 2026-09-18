import {FolderCog} from "lucide-react";
import {Card, CardContent} from "@/components/ui/card.tsx";
import {Avatar, AvatarFallback, AvatarGroupCount} from "@/components/ui/avatar.tsx";
import {useTranslation} from "react-i18next";

interface RoleCardProps {
    roleName: string;
    memberCount: number;
    memberInitials: string[];
}

export function RoleCard({ roleName, memberCount, memberInitials }: RoleCardProps) {
    const { t } = useTranslation("users");

    const extra = memberCount - memberInitials.length;

    return (
        <Card className="border border-secondary shadow-none">
            <CardContent className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary p-2 text-white">
                            <FolderCog size={20} strokeWidth={1.75} />
                        </div>
                        <h3 className="font-medium">{roleName}</h3>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                        {memberInitials.map((initials, i) => (
                            <Avatar key={i} size="sm" className="border-2 border-background">
                                <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                            </Avatar>
                        ))}
                        {extra > 0 && (
                            <AvatarGroupCount className="size-6 border-2 border-background text-[12px] font-medium">
                                +{extra}
                            </AvatarGroupCount>
                        )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                        {t("roleCard.totalUsers", { count: memberCount })}
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}