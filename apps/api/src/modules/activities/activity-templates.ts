import { DocumentType } from '@/generated/prisma/client';

/**
 * Every activity's title, as a template key plus its values, so the web app
 * can show it in the reader's language (activities:templates.<key>), the way
 * notifications work since #41. The English here is what's stored in
 * Activity.title: the fallback for clients without the key, and for search,
 * logs and exports. Values are raw data (names, numbers, document types) the
 * web formats; never translated text. Keep in sync with the locale files.
 */
const ACTIVITY_TEMPLATES = {
  // Deals
  unitReserved: () => 'Unit reserved',
  reservationExtended: () => 'Reservation extended',
  reservationExtendedPastLimit: () => 'Reservation extended past the limit',
  reservationExtensionRequested: () =>
    'Asked the Sales Head to extend the reservation',
  reservationCancelled: () => 'Reservation cancelled',
  reservationExpired: () => 'Reservation expired',
  contractSigned: () => 'Contract signed',
  paymentReceived: () => 'Payment received',
  refundIssued: () => 'Refund issued',
  dealUpdated: () => 'Deal updated',
  dealReassigned: () => 'Deal reassigned to another manager',
  discountRequested: () => 'Discount requested approval',
  discountApproved: () => 'Discount approved',
  discountRejected: () => 'Discount rejected',
  reservationAgreementGenerated: () => 'Reservation agreement generated',
  saleContractGenerated: () => 'Sale contract generated',
  reservationAgreementReissued: () =>
    'Reservation agreement reissued at the approved price',
  documentRegenerated: (p: { documentType: DocumentType }) =>
    `${p.documentType} document regenerated`,
  receiptIssued: (p: { receipt: string }) => `Receipt ${p.receipt} issued`,
  paymentScheduleGenerated: () => 'Payment schedule generated',
  paymentVoided: (p: { payment: string }) => `Payment ${p.payment} voided`,
  unitRelistedAfterCancellation: () => 'Unit relisted after deal cancellation',
  unitRelistedAfterExpiry: () => 'Unit relisted after reservation expired',
  unitMarkedSold: () => 'Unit marked sold',

  // Leads and clients
  leadCreated: (p: { name: string }) => `Lead "${p.name}" created`,
  leadUpdated: (p: { name: string }) => `Lead "${p.name}" updated`,
  leadConverted: (p: { name: string }) =>
    `Lead "${p.name}" converted to client`,
  leadMovedBranch: () => 'Lead moved to another branch',
  leadReassigned: () => 'Lead reassigned to another manager',
  contactLogged: () => 'Contact attempt logged',
  clientCreated: (p: { name: string }) => `Client "${p.name}" created`,
  clientUpdated: (p: { name: string }) => `Client "${p.name}" updated`,
  clientMovedBranch: () => 'Client moved to another branch',

  // Tasks
  taskCreated: (p: { task: string }) => `Task "${p.task}" created`,
  taskAutoCreated: (p: { task: string }) => `Task "${p.task}" auto-created`,
  taskReassigned: (p: { task: string }) => `Task "${p.task}" reassigned`,
  taskCompleted: (p: { task: string }) => `Task "${p.task}" completed`,
  taskStatusChanged: (p: { task: string }) => `Task "${p.task}" status changed`,
  taskUpdated: (p: { task: string }) => `Task "${p.task}" updated`,
  taskDeleted: (p: { task: string }) => `Task "${p.task}" deleted`,
  taskRestored: (p: { task: string }) => `Task "${p.task}" restored`,
  taskCancelledWithDeal: (p: { task: string }) =>
    `Task "${p.task}" cancelled with its deal`,

  // Documents
  documentUploaded: (p: { name: string }) => `Document "${p.name}" uploaded`,
  documentDeleted: (p: { name: string }) => `Document "${p.name}" deleted`,
  documentRestored: (p: { name: string }) => `Document "${p.name}" restored`,
  documentTemplateUpdated: (p: { name: string }) =>
    `Document template "${p.name}" updated`,
  documentTemplateReset: (p: { name: string }) =>
    `Document template "${p.name}" replaced by the built-in default`,

  // Inventory
  projectCreated: (p: { name: string }) => `Project "${p.name}" created`,
  projectStatusChanged: (p: { name: string }) =>
    `Project "${p.name}" status changed`,
  projectUpdated: (p: { name: string }) => `Project "${p.name}" updated`,
  projectDeleted: (p: { name: string }) => `Project "${p.name}" deleted`,
  blockCreated: (p: { name: string }) => `Block "${p.name}" created`,
  blockUpdated: (p: { name: string }) => `Block "${p.name}" updated`,
  blockDuplicated: (p: { name: string; source: string }) =>
    `Block "${p.name}" created (duplicated from "${p.source}")`,
  blockDeleted: (p: { name: string }) => `Block "${p.name}" deleted`,
  entranceCreated: (p: { name: string }) => `Entrance "${p.name}" created`,
  entranceUpdated: (p: { name: string }) => `Entrance "${p.name}" updated`,
  entranceDuplicated: (p: { name: string; source: string }) =>
    `Entrance "${p.name}" created (duplicated from "${p.source}")`,
  entranceDeleted: (p: { name: string }) => `Entrance "${p.name}" deleted`,
  floorCreated: (p: { floor: number }) => `Floor ${p.floor} created`,
  floorsCreated: (p: { count: number }) =>
    `${p.count} floors created on entrance`,
  floorUpdated: (p: { floor: number }) => `Floor ${p.floor} updated`,
  floorDuplicated: (p: { floor: number; source: number }) =>
    `Floor ${p.floor} created (duplicated from floor ${p.source})`,
  floorDeleted: (p: { floor: number }) => `Floor ${p.floor} deleted`,
  unitCreated: (p: { unit: string }) => `Unit "${p.unit}" created`,
  unitsCreated: (p: { count: number }) => `${p.count} units created on floor`,
  unitsImported: (p: { count: number }) => `${p.count} units imported`,
  unitsImportedWithPrices: (p: { units: number; prices: number; requested: number }) =>
    `${p.units} units imported, ${p.prices} prices changed, ${p.requested} sent for approval`,
  unitStatusChanged: (p: { unit: string }) => `Unit "${p.unit}" status changed`,
  unitUpdated: (p: { unit: string }) => `Unit "${p.unit}" updated`,
  unitDuplicated: (p: { unit: string; source: string }) =>
    `Unit "${p.unit}" created (duplicated from "${p.source}")`,
  unitDeleted: (p: { unit: string }) => `Unit "${p.unit}" deleted`,
  unitPriceChangeRequested: (p: { unit: string }) =>
    `Price change requested for unit "${p.unit}"`,
  unitPriceChangeApproved: (p: { unit: string }) =>
    `Price change approved for unit "${p.unit}"`,
  unitPriceChangeRejected: (p: { unit: string }) =>
    `Price change rejected for unit "${p.unit}"`,

  // Company: branches and users
  branchCreated: (p: { name: string }) => `Branch "${p.name}" created`,
  branchUpdated: (p: { name: string }) => `Branch "${p.name}" updated`,
  branchDeactivated: (p: { name: string }) => `Branch "${p.name}" deactivated`,
  branchReactivated: (p: { name: string }) => `Branch "${p.name}" reactivated`,
  userCreated: (p: { name: string }) => `User "${p.name}" created`,
  userUpdated: (p: { name: string }) => `User "${p.name}" updated`,
  userRoleChanged: (p: { name: string }) => `Role changed for "${p.name}"`,
  // CA-12: a company's own roles.
  roleCreated: (p: { role: string }) => `Role "${p.role}" created`,
  roleUpdated: (p: { role: string }) => `Role "${p.role}" updated`,
  rolePermissionsChanged: (p: {
    role: string;
    added: number;
    removed: number;
  }) =>
    `Permissions of role "${p.role}" changed: ${p.added} added, ${p.removed} removed`,
  roleDeleted: (p: { role: string }) => `Role "${p.role}" deleted`,
  userDeactivated: (p: { name: string }) => `User "${p.name}" deactivated`,
  userReactivated: (p: { name: string }) => `User "${p.name}" reactivated`,
  userMovedBranch: (p: { name: string }) =>
    `User "${p.name}" moved to another branch`,
  userPasswordReset: (p: { name: string }) => `Password reset for "${p.name}"`,
  userSessionsRevoked: (p: { name: string }) =>
    `Sessions revoked for "${p.name}"`,
  userChangedOwnPassword: (p: { name: string }) =>
    `"${p.name}" changed their password`,
} satisfies Record<string, (params: never) => string>;

export type ActivityTemplateKey = keyof typeof ACTIVITY_TEMPLATES;
type ParamsOf<K extends ActivityTemplateKey> = Parameters<
  (typeof ACTIVITY_TEMPLATES)[K]
>[0];

export const ACTIVITY_TEMPLATE_KEYS = Object.keys(
  ACTIVITY_TEMPLATES,
) as ActivityTemplateKey[];

/**
 * The three Activity columns for one title: spread it where a title used to
 * be written by hand, e.g. `...activityText('taskCreated', { task: t.title })`.
 */
export function activityText<K extends ActivityTemplateKey>(
  key: K,
  ...args: ParamsOf<K> extends undefined ? [] : [ParamsOf<K>]
): { title: string; templateKey: K; templateParams: ParamsOf<K> | undefined } {
  const params = args[0];
  const render = ACTIVITY_TEMPLATES[key] as (
    p: ParamsOf<K> | undefined,
  ) => string;
  return { title: render(params), templateKey: key, templateParams: params };
}
