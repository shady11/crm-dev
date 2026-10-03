import type {AuthUser} from "@/features/auth/types/auth.types";
import {hasPermission} from "@/features/auth/access";
import type {Task} from "@/features/tasks/api/tasks.api.ts";

type Viewer = Pick<AuthUser, "id" | "permissions"> | undefined;

/** Mirrors PATCH /tasks/:id (tasks.edit). */
export function canEditTask(user: Viewer) {
    return hasPermission(user, "tasks.edit");
}

/** Mirrors DELETE /tasks/:id (tasks.delete). */
export function canDeleteTask(user: Viewer) {
    return hasPermission(user, "tasks.delete");
}

/**
 * Mirrors PATCH /tasks/:id/status: tasks.edit moves any task, while
 * tasks.change_status alone only moves tasks assigned to the user (see
 * TasksService.updateStatus).
 */
export function canMoveTask(user: Viewer, task: Pick<Task, "assignedTo">) {
    return canEditTask(user) || (hasPermission(user, "tasks.change_status") && task.assignedTo.id === user?.id);
}
