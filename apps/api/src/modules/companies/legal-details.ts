/**
 * CA-4: the company details every contract, reservation agreement and
 * receipt prints. Without them a document falls back to the display name
 * and an empty signature line, so the app tells people what is missing
 * before they generate one. The signatory's title is printed when set but
 * isn't required.
 */
export const REQUIRED_LEGAL_DETAILS = ["legalName", "taxId", "address", "signatoryName"] as const;

export type LegalDetail = (typeof REQUIRED_LEGAL_DETAILS)[number];

export function missingLegalDetails(company: Partial<Record<LegalDetail, string | null>>): LegalDetail[] {
    return REQUIRED_LEGAL_DETAILS.filter((field) => !company[field]?.trim());
}
