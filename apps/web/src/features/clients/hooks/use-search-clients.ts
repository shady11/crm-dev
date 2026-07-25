import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchClients } from "@/features/clients/api/clients.api";

export function useSearchClients(term: string) {
    const [debounced, setDebounced] = useState(term);

    useEffect(() => {
        const timeout = setTimeout(() => setDebounced(term), 300);
        return () => clearTimeout(timeout);
    }, [term]);

    return useQuery({
        queryKey: ["clients-search", debounced],
        queryFn: () => searchClients(debounced),
        enabled: debounced.trim().length >= 2,
    });
}