import {Prisma} from '@/generated/prisma/client';
import {DEAL_DETAILS_INCLUDE, DEAL_LIST_INCLUDE} from '../deal.constants';

// Derived from the actual runtime include constants (deal.constants.ts) rather
// than a separately hand-written include literal. Previously this file redefined
// the include shape from scratch, which is exactly how it silently drifted out of
// sync with DEAL_DETAILS_INCLUDE when the `manager` relation was locked down to a
// safe select — the type still claimed a full User (passwordHash included) was
// present even though the query no longer returned one. Deriving via `typeof`
// makes that class of drift a compile error instead of a silent mismatch.

export type DealListItem = Prisma.DealGetPayload<{
    include: typeof DEAL_LIST_INCLUDE;
}>;

export type DealDetails = Prisma.DealGetPayload<{
    include: typeof DEAL_DETAILS_INCLUDE;
}>;