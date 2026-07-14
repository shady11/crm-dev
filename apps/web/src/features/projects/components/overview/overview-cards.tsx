import {Card, CardContent} from "@/components/ui/card.tsx";
import {type Project} from "@/features/projects/types/project.types.ts";
import {Building, DoorOpen, type LucideIcon} from "lucide-react";

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

    const items: Items = [
        {
            title: project._count?.blocks ?? 0,
            description: 'Blocks',
            icon: Building,
            iconColor: 'text-indigo-500',
            bgColor: 'bg-indigo-100',
        },
        {
            title: project._count?.units ?? 0,
            description: 'Units',
            icon: DoorOpen,
            iconColor: 'text-emerald-500',
            bgColor: 'bg-emerald-100',
        },
    ];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item, index) => (
                <Card key={index} className="border-0 shadow-sm p-4">
                    <CardContent className="flex items-center justify-between gap-3 p-0">

                        <div className="flex flex-col gap-1">
                    <span className="text-sm font-normal text-muted-foreground">
                        {item.description}
                    </span>
                            <span className="text-2xl font-semibold">
                        {item.title}
                    </span>
                        </div>

                        <div className='bg-primary/10 text-primary flex items-center justify-center rounded-lg p-3'>
                            {item.icon && <item.icon size={32} strokeWidth={1.25}/>}
                        </div>

                    </CardContent>
                </Card>
            ))}
        </div>
    );
}