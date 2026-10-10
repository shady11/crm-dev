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
    | {templateKey: "reservationExpiring"; params: {dealNumber: string; date: string}}
    | {templateKey: "paymentReceived"; params: {dealNumber: string; amount: number; currency: string | null}}
    | {templateKey: "refundIssued"; params: {dealNumber: string; amount: number; currency: string | null}}
    | {templateKey: "paymentDueSoon"; params: {dealNumber: string}}
    | {templateKey: "paymentDueToday"; params: {dealNumber: string}}
    | {templateKey: "paymentOverdue"; params: {dealNumber: string; days: number}}
    | {templateKey: "taskAssigned"; params: {taskTitle: string}}
    | {templateKey: "taskDueSoon"; params: {taskTitle: string}}
    | {templateKey: "taskOverdue"; params: {taskTitle: string}}
    | {templateKey: "taskEscalated"; params: {taskTitle: string; days: number}}
    | {templateKey: "documentUploaded"; params: {dealNumber: string; fileName: string}};
