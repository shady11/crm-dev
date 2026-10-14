/**
 * Keys the web app translates under "notifications:templates.<key>", with
 * the values each one is given. Values are raw (a status code, an amount
 * and its currency, an ISO date) so the client can format them in the
 * reader's language. Keep in sync with the locale files.
 */
export type NotificationTemplate =
    | {templateKey: "discountApprovalRequested"; params: {dealNumber: string; percent: number}}
    | {templateKey: "discountApproved"; params: {dealNumber: string}}
    | {templateKey: "discountRejected"; params: {dealNumber: string; reason: string}}
    | {templateKey: "dealStatusChanged"; params: {dealNumber: string; status: string}}
    | {templateKey: "reservationExpired"; params: {dealNumber: string}}
    // SH-10: the same lapse, told to the branch's Sales Head.
    | {templateKey: "teamReservationExpired"; params: {dealNumber: string; managerName: string}}
    | {templateKey: "teamReservationExpiredHeld"; params: {dealNumber: string; managerName: string; amount: number; currency: string | null}}
    | {templateKey: "reservationExpiring"; params: {dealNumber: string; date: string}}
    // SH-11: a manager at the extension limit asks; the team lead's
    // extension resolves the ask and tells the manager.
    | {templateKey: "reservationExtensionRequested"; params: {dealNumber: string; byName: string; date: string}}
    | {templateKey: "reservationExtensionGranted"; params: {dealNumber: string; byName: string; date: string}}
    | {templateKey: "reservationExtendedPastLimit"; params: {dealNumber: string; byName: string; date: string; reason: string}}
    | {templateKey: "paymentReceived"; params: {dealNumber: string; amount: number; currency: string | null}}
    | {templateKey: "refundIssued"; params: {dealNumber: string; amount: number; currency: string | null}}
    | {templateKey: "moneyHeld"; params: {dealNumber: string; amount: number; currency: string | null}}
    | {templateKey: "paymentVoided"; params: {dealNumber: string; amount: number; currency: string | null; reason: string}}
    | {templateKey: "paymentDueSoon"; params: {dealNumber: string}}
    | {templateKey: "paymentDueToday"; params: {dealNumber: string}}
    | {templateKey: "paymentOverdue"; params: {dealNumber: string; days: number}}
    | {templateKey: "taskAssigned"; params: {taskTitle: string}}
    | {templateKey: "taskDueSoon"; params: {taskTitle: string}}
    | {templateKey: "taskOverdue"; params: {taskTitle: string}}
    | {templateKey: "taskEscalated"; params: {taskTitle: string; days: number}}
    | {templateKey: "documentUploaded"; params: {dealNumber: string; fileName: string}}
    | {templateKey: "discountApprovalReminder"; params: {dealNumber: string; percent: number; days: number}}
    | {templateKey: "discountRequestApproved"; params: {dealNumber: string; percent: number; byName: string}}
    | {templateKey: "discountRequestRejected"; params: {dealNumber: string; percent: number; byName: string}}
    | {templateKey: "discountRequestWithdrawn"; params: {dealNumber: string; percent: number}}
    | {templateKey: "leadReassigned"; params: {leadName: string; byName: string; tasks: number}}
    | {templateKey: "dealReassigned"; params: {dealNumber: string; byName: string; tasks: number}}
    // SH-2: list-price changes. fromPrice / toPrice are raw numbers in the
    // company currency.
    | {templateKey: "unitPriceChangeRequested"; params: UnitPriceParams & {fromPrice: number; toPrice: number; byName: string}}
    | {templateKey: "unitPriceChangeApproved"; params: UnitPriceParams & {toPrice: number; byName: string}}
    | {templateKey: "unitPriceChangeRejected"; params: UnitPriceParams & {byName: string; reason: string}}
    | {templateKey: "unitPriceChanged"; params: UnitPriceParams & {fromPrice: number; toPrice: number; byName: string}}
    | {templateKey: "unitPriceRequestApproved"; params: UnitPriceParams & {byName: string}}
    | {templateKey: "unitPriceRequestRejected"; params: UnitPriceParams & {byName: string}}
    // SH-5: bulk moves and a manager's handover, one notification each.
    | {templateKey: "leadsReassigned"; params: {leads: number; byName: string; tasks: number}}
    | {templateKey: "dealsReassigned"; params: {deals: number; byName: string; tasks: number}}
    | {templateKey: "workHandedOver"; params: {fromName: string; byName: string; leads: number; deals: number; tasks: number}};

type UnitPriceParams = {unit: string; project: string; currency: string | null};
