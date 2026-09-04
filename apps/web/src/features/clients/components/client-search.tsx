import {useState} from "react";
import {Loader2Icon, SearchIcon, UserPlusIcon} from "lucide-react";
import {InputGroup, InputGroupAddon, InputGroupInput} from "@/components/ui/input-group";
import {Button} from "@/components/ui/button";
import {useSearchClients} from "@/features/clients/hooks/use-search-clients";
import {ClientCard} from "./client-card";
import type {Client} from "@/features/clients/types/client.types";
import {useTranslation} from "react-i18next";

interface ClientSearchProps {
    selectedClientId?: string;
    onSelect(client: Client): void;
    onCreateNew(): void;
}

export function ClientSearch({ selectedClientId, onSelect, onCreateNew }: ClientSearchProps) {
    const { t } = useTranslation("clients");
    const [term, setTerm] = useState("");
    const searchQuery = useSearchClients(term);
    const clients = searchQuery.data?.items ?? [];

    return (
        <div className="flex flex-col gap-3">
            <InputGroup>
                <InputGroupAddon>
                    <SearchIcon className="size-4 text-muted-foreground" />
                </InputGroupAddon>
                <InputGroupInput
                    placeholder={t("search.placeholder")}
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                />
            </InputGroup>

            {searchQuery.isFetching && (
                <div className="flex items-center justify-center py-4">
                    <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
                </div>
            )}

            {!searchQuery.isFetching && term.trim().length >= 2 && clients.length === 0 && (
                <p className="py-2 text-center text-sm text-muted-foreground">
                    {t("search.empty", { term })}
                </p>
            )}

            <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
                {clients.map((client) => (
                    <ClientCard
                        key={client.id}
                        client={client}
                        selected={client.id === selectedClientId}
                        onClick={() => onSelect(client)}
                    />
                ))}
            </div>

            <Button type="button" variant="outline" onClick={onCreateNew}>
                <UserPlusIcon className="size-4" />
                {t("search.createNew")}
            </Button>
        </div>
    );
}