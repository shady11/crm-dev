import type {ReactNode} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {Building2Icon, CheckSquareIcon, HandshakeIcon, HouseIcon, UserRoundIcon, UserRoundSearchIcon} from "lucide-react";
import type {Activity} from "@/features/activities/types/activity.types.ts";
import {paths} from "@/routes/paths.ts";

function Chip({icon, to, children}: {icon: ReactNode; to?: string; children: ReactNode}) {
    const className = "inline-flex max-w-full items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground [&_svg]:size-3 [&_svg]:shrink-0";
    const content = <>{icon}<span className="truncate">{children}</span></>;
    return to
        ? <Link to={to} className={`${className} hover:bg-secondary/70 hover:underline`}>{content}</Link>
        : <span className={className}>{content}</span>;
}

/**
 * What an activity row is about: its deal, client, lead, task or unit, as
 * small chips linking to the record where it has a page.
 */
export function ActivitySubjects({activity}: {activity: Activity}) {
    const {t} = useTranslation("activities");
    const {deal, lead, task, unit, project} = activity;
    const client = activity.client ?? deal?.client ?? null;
    const chips: ReactNode[] = [];

    if (deal) {
        chips.push(<Chip key="deal" icon={<HandshakeIcon />} to={paths.deals.detail(deal.id)}>{t("subjects.deal", {number: deal.dealNumber})}</Chip>);
    }
    if (client) {
        chips.push(<Chip key="client" icon={<UserRoundIcon />} to={paths.clients.detail(client.id)}>{client.fullName}</Chip>);
    } else if (lead) {
        // A converted lead also carries its client; the client is the one to open.
        chips.push(<Chip key="lead" icon={<UserRoundSearchIcon />}>{t("subjects.lead", {name: lead.fullName})}</Chip>);
    }
    if (task) {
        chips.push(<Chip key="task" icon={<CheckSquareIcon />} to={paths.tasks.root}>{task.title}</Chip>);
    }
    if (unit) {
        chips.push(
            <Chip key="unit" icon={<HouseIcon />} to={paths.units.infoSheet(unit.id)}>
                {[t("subjects.unit", {number: unit.number}), unit.project?.name].filter(Boolean).join(" · ")}
            </Chip>,
        );
    } else if (project) {
        chips.push(<Chip key="project" icon={<Building2Icon />} to={paths.projects.detail(project.id)}>{project.name}</Chip>);
    }

    if (chips.length === 0) return null;
    return <div className="mt-1 flex flex-wrap gap-1">{chips}</div>;
}
