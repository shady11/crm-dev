import {Card, CardContent} from "@/components/ui/card.tsx";
import {type Project} from "@/features/projects/types/project.types.ts";
import {Building, DoorOpen, type LucideIcon} from "lucide-react";
import {useTranslation} from "react-i18next";

type Props = {
    project: Project;
}

interface Item {
    title: string | any;
    description: string;
    icon: LucideIcon;
    iconColor: string;
    bgColor: string;
}

type Items = Array<Item>;

export function OverviewCards({project}: Props) {
    const { t } = useTranslation("projects");

    const items: Items = [
        {
            title: project._count?.blocks ?? 0,
            description: t("counts.blocksLabel"),
            icon: Building,
            iconColor: '',
            bgColor: 'bg-indigo-500',
        },
        {
            title: project._count?.units ?? 0,
            description: t("counts.unitsLabel"),
            icon: DoorOpen,
            iconColor: '',
            bgColor: 'bg-emerald-500',
        },
    ];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item, index) => (
                <Card key={index} className="h-full border">
                    <CardContent className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                            <p className="mt-1.5 text-3xl font-semibold tracking-tight tabular-nums">{item.title}</p>
                        </div>
                        <div className={`icon-tile flex size-7 shrink-0 items-center justify-center ${item.bgColor}`}>
                            {item.icon && <item.icon size={16} strokeWidth={2}/>}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}