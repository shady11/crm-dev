import {CallHandler, ExecutionContext, ForbiddenException, Injectable, NestInterceptor} from "@nestjs/common";
import type {Request} from "express";
import {Observable} from "rxjs";
import {AuthUser} from "@/common/types/auth-user.type";

/** What someone who must change their password can still do. */
const ALLOWED = [
    {method: "GET", suffix: "/auth/me"},
    {method: "PATCH", suffix: "/auth/me/password"},
];

/**
 * SA-6: a password someone else set (a reset, a new company's first admin,
 * an admin creating or editing the user) is known to them, so the person
 * must choose their own before doing anything else. Enforced here rather
 * than only in the web app, so the old password is useless for anything but
 * replacing it. A platform admin viewing the app as the user is not held up.
 */
@Injectable()
export class PasswordChangeInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const request = context.switchToHttp().getRequest<Request & {user?: AuthUser}>();
        const user = request.user;

        if (
            user?.mustChangePassword &&
            !user.impersonation &&
            !ALLOWED.some(({method, suffix}) => request.method === method && request.path.endsWith(suffix))
        ) {
            throw new ForbiddenException({
                statusCode: 403,
                error: "Forbidden",
                code: "PASSWORD_CHANGE_REQUIRED",
                message: "Choose a new password before continuing.",
            });
        }

        return next.handle();
    }
}
