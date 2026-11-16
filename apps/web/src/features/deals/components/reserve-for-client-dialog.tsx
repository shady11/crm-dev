import {useMemo, useState} from "react";
import {useNavigate} from "react-router-dom";
import {useQuery} from "@tanstack/react-query";
import {createListCollection} from "@ark-ui/react";
import {LayoutGridIcon} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
import {
    Dialog,
    DialogBody,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog.tsx";
import {Field, FieldDescription, FieldGroup, FieldLabel} from "@/components/ui/field.tsx";
import {NumberInput, NumberInputGroup, NumberInputInput} from "@/components/ui/number-input.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {getProjects} from "@/features/projects/api/projects.api.ts";
import {BOOKABLE_PROJECT_STATUSES} from "@/features/projects/types/project.types.ts";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";
import {paths} from "@/routes/paths.ts";
import {reserveForSearch} from "@/features/deals/utils/reserve-for.ts";
import {useTranslation} from "react-i18next";

export type ReserveForClientPrefill = {
    projectId?: string | null;
    rooms?: number | null;
    budget?: string | number | null;
};

interface ReserveForClientDialogProps {
    client: { id: string; fullName: string } | null;
    /** What the client's lead asked for: project, rooms, budget. */
    prefill?: ReserveForClientPrefill;
    onClose(): void;
}

const ROOM_OPTIONS = ["any", "1", "2", "3", "4"] as const;

/**
 * E2E-8: from a client (or the lead just converted) to the chessboard of the
 * project they want, filtered to the rooms and budget they asked for, with
 * the client already chosen in the booking form.
 */
export function ReserveForClientDialog({client, prefill, onClose}: ReserveForClientDialogProps) {
    return (
        <Dialog open={!!client} onOpenChange={({open}) => !open && onClose()}>
            {/* Keyed by client, so each opening starts fresh from the prefill. */}
            {client && <ReserveForClientForm key={client.id} client={client} prefill={prefill} onClose={onClose} />}
        </Dialog>
    );
}

function ReserveForClientForm({client, prefill, onClose}: {
    client: { id: string; fullName: string };
    prefill?: ReserveForClientPrefill;
    onClose(): void;
}) {
    const {t} = useTranslation("deals");
    const {currencyCode} = useCompanyFormatters();
    const navigate = useNavigate();

    const [chosenProjectId, setProjectId] = useState<string | undefined>(prefill?.projectId ?? undefined);
    const [rooms, setRooms] = useState<string>(prefill?.rooms ? String(Math.min(prefill.rooms, 4)) : "any");
    const [budget, setBudget] = useState<number | undefined>(() => {
        const value = Number(prefill?.budget);
        return Number.isFinite(value) && value > 0 ? value : undefined;
    });

    const projectsQuery = useQuery({
        queryKey: ["projects", "bookable"],
        queryFn: () => getProjects({limit: 100}),
    });
    const projects = useMemo(
        () => (projectsQuery.data?.items ?? []).filter((p) => BOOKABLE_PROJECT_STATUSES.includes(p.status)),
        [projectsQuery.data],
    );
    // A single bookable project needs no choosing.
    const projectId = chosenProjectId ?? (projects.length === 1 ? projects[0].id : undefined);

    const projectCollection = createListCollection({items: projects.map((p) => ({label: p.name, value: p.id}))});
    const roomsCollection = createListCollection({
        items: ROOM_OPTIONS.map((value) => ({
            label: value === "any" ? t("reserveFor.anyRooms") : value === "4" ? "4+" : value,
            value,
        })),
    });

    const open = () => {
        if (!projectId) return;
        navigate(paths.projects.chessboard.root(projectId) + reserveForSearch({
            clientId: client.id,
            rooms: rooms === "any" ? undefined : Number(rooms),
            priceMax: budget,
        }));
        onClose();
    };

    return (
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t("reserveFor.title")}</DialogTitle>
                    <DialogDescription>{t("reserveFor.description", {name: client.fullName})}</DialogDescription>
                </DialogHeader>
                <DialogBody>
                    <FieldGroup className="gap-4">
                        <Field>
                            <FieldLabel>{t("reserveFor.project")}</FieldLabel>
                            <Select
                                collection={projectCollection}
                                value={projectId ? [projectId] : []}
                                onValueChange={(item) => setProjectId(item.value[0])}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder={t("reserveFor.selectProject")} />
                                </SelectTrigger>
                                <SelectContent>
                                    {projectCollection.items.map((item) => (
                                        <SelectItem key={item.value} item={item}>{item.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field>
                            <FieldLabel>{t("reserveFor.rooms")}</FieldLabel>
                            <Select
                                collection={roomsCollection}
                                value={[rooms]}
                                onValueChange={(item) => setRooms(item.value[0] ?? "any")}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {roomsCollection.items.map((item) => (
                                        <SelectItem key={item.value} item={item}>{item.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field>
                            <FieldLabel>{t("reserveFor.budget", {currency: currencyCode})}</FieldLabel>
                            <NumberInput
                                value={budget ? String(budget) : ""}
                                min={0}
                                onValueChange={({valueAsNumber}) => setBudget(Number.isNaN(valueAsNumber) || valueAsNumber <= 0 ? undefined : valueAsNumber)}
                            >
                                <NumberInputGroup>
                                    <NumberInputInput placeholder={t("reserveFor.anyBudget")} />
                                </NumberInputGroup>
                            </NumberInput>
                            <FieldDescription>{t("reserveFor.hint")}</FieldDescription>
                        </Field>
                    </FieldGroup>
                </DialogBody>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="secondary" className="flex-1" onClick={onClose}>{t("reserveFor.cancel")}</Button>
                    </DialogClose>
                    <Button className="flex-1" disabled={!projectId} onClick={open}>
                        <LayoutGridIcon className="size-4" />
                        {t("reserveFor.open")}
                    </Button>
                </DialogFooter>
            </DialogContent>
    );
}
