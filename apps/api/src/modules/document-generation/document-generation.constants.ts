import { DocumentType } from '@/generated/prisma/client';

/**
 * The subset of DocumentType this feature actually knows how to produce —
 * i.e. has a default template and a supporting TemplateContext for (see
 * template-context.builder.ts). PAYMENT_SCHEDULE/PAYMENT_RECEIPT are real
 * DocumentType values but stay out of this list until their own per-payment
 * context is built (see the spec's phased rollout) — half-supporting them
 * would let a company create a template that then fails at generation time.
 */
export const GENERATABLE_DOCUMENT_TYPES: DocumentType[] = [
  DocumentType.RESERVATION,
  DocumentType.CONTRACT,
];
