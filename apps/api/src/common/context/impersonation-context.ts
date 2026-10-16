import { AsyncLocalStorage } from 'async_hooks';

/**
 * SA-2: who is really acting during an impersonated request. Set by
 * ImpersonationAuditInterceptor around the request's handler and read by
 * PrismaService, which stamps every Activity written meanwhile with the
 * platform admin, so the tenant's own feed shows that the admin did it, not
 * the user whose screen they were viewing. Empty for every other request.
 */
const storage = new AsyncLocalStorage<{ impersonatorId: string }>();

export function runAsImpersonator<T>(impersonatorId: string, fn: () => T): T {
  return storage.run({ impersonatorId }, fn);
}

/** The platform admin behind the current request, or undefined. */
export function currentImpersonatorId(): string | undefined {
  return storage.getStore()?.impersonatorId;
}
