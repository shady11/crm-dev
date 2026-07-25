import {Status} from "@/components/ui/status.tsx";

export function UserStatusDot({ isActive }: { isActive: boolean }) {
    return (
        <div className="flex items-center gap-1.5 text-sm font-medium">
            <Status size="sm" variant="default" className={isActive ? "bg-emerald-500" : "bg-gray-400"} />
            <span className={isActive ? "text-emerald-600" : "text-muted-foreground"}>
                {isActive ? "Active" : "Inactive"}
            </span>
        </div>
    );
}