-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "templateKey" TEXT,
ADD COLUMN     "templateParams" JSONB;


-- Backfill: existing activities get the key their English title came from,
-- so the history reads in the viewer's language too, not only new entries.
-- Titles that match no template (renamed since, or seeded by hand) keep
-- showing their stored English.
UPDATE "Activity" SET "templateKey" = 'unitReserved' WHERE "templateKey" IS NULL AND "title" = 'Unit reserved';
UPDATE "Activity" SET "templateKey" = 'reservationExtended' WHERE "templateKey" IS NULL AND "title" = 'Reservation extended';
UPDATE "Activity" SET "templateKey" = 'reservationCancelled' WHERE "templateKey" IS NULL AND "title" = 'Reservation cancelled';
UPDATE "Activity" SET "templateKey" = 'reservationExpired' WHERE "templateKey" IS NULL AND "title" = 'Reservation expired';
UPDATE "Activity" SET "templateKey" = 'contractSigned' WHERE "templateKey" IS NULL AND "title" = 'Contract signed';
UPDATE "Activity" SET "templateKey" = 'paymentReceived' WHERE "templateKey" IS NULL AND "title" = 'Payment received';
UPDATE "Activity" SET "templateKey" = 'refundIssued' WHERE "templateKey" IS NULL AND "title" = 'Refund issued';
UPDATE "Activity" SET "templateKey" = 'dealUpdated' WHERE "templateKey" IS NULL AND "title" = 'Deal updated';
UPDATE "Activity" SET "templateKey" = 'dealReassigned' WHERE "templateKey" IS NULL AND "title" = 'Deal reassigned to another manager';
UPDATE "Activity" SET "templateKey" = 'discountRequested' WHERE "templateKey" IS NULL AND "title" = 'Discount requested approval';
UPDATE "Activity" SET "templateKey" = 'discountApproved' WHERE "templateKey" IS NULL AND "title" = 'Discount approved';
UPDATE "Activity" SET "templateKey" = 'discountRejected' WHERE "templateKey" IS NULL AND "title" = 'Discount rejected';
UPDATE "Activity" SET "templateKey" = 'reservationAgreementGenerated' WHERE "templateKey" IS NULL AND "title" = 'Reservation agreement generated';
UPDATE "Activity" SET "templateKey" = 'saleContractGenerated' WHERE "templateKey" IS NULL AND "title" = 'Sale contract generated';
UPDATE "Activity" SET "templateKey" = 'reservationAgreementReissued' WHERE "templateKey" IS NULL AND "title" = 'Reservation agreement reissued at the approved price';
UPDATE "Activity" SET "templateKey" = 'paymentScheduleGenerated' WHERE "templateKey" IS NULL AND "title" = 'Payment schedule generated';
UPDATE "Activity" SET "templateKey" = 'unitRelistedAfterCancellation' WHERE "templateKey" IS NULL AND "title" = 'Unit relisted after deal cancellation';
UPDATE "Activity" SET "templateKey" = 'unitRelistedAfterExpiry' WHERE "templateKey" IS NULL AND "title" = 'Unit relisted after reservation expired';
UPDATE "Activity" SET "templateKey" = 'unitMarkedSold' WHERE "templateKey" IS NULL AND "title" = 'Unit marked sold';
UPDATE "Activity" SET "templateKey" = 'leadMovedBranch' WHERE "templateKey" IS NULL AND "title" = 'Lead moved to another branch';
UPDATE "Activity" SET "templateKey" = 'leadReassigned' WHERE "templateKey" IS NULL AND "title" = 'Lead reassigned to another manager';
UPDATE "Activity" SET "templateKey" = 'contactLogged' WHERE "templateKey" IS NULL AND "title" = 'Contact attempt logged';
UPDATE "Activity" SET "templateKey" = 'clientMovedBranch' WHERE "templateKey" IS NULL AND "title" = 'Client moved to another branch';
UPDATE "Activity" SET "templateKey" = 'documentRegenerated', "templateParams" = jsonb_build_object('documentType', (regexp_match("title", '^([A-Z_]+) document regenerated$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^([A-Z_]+) document regenerated$';
UPDATE "Activity" SET "templateKey" = 'receiptIssued', "templateParams" = jsonb_build_object('receipt', (regexp_match("title", '^Receipt (\S+) issued$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^Receipt (\S+) issued$';
UPDATE "Activity" SET "templateKey" = 'paymentVoided', "templateParams" = jsonb_build_object('payment', (regexp_match("title", '^Payment (.+) voided$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^Payment (.+) voided$';
UPDATE "Activity" SET "templateKey" = 'leadCreated', "templateParams" = jsonb_build_object('name', (regexp_match("title", '^Lead "(.*)" created$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^Lead "(.*)" created$';
UPDATE "Activity" SET "templateKey" = 'leadUpdated', "templateParams" = jsonb_build_object('name', (regexp_match("title", '^Lead "(.*)" updated$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^Lead "(.*)" updated$';
UPDATE "Activity" SET "templateKey" = 'leadConverted', "templateParams" = jsonb_build_object('name', (regexp_match("title", '^Lead "(.*)" converted to client$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^Lead "(.*)" converted to client$';
UPDATE "Activity" SET "templateKey" = 'clientCreated', "templateParams" = jsonb_build_object('name', (regexp_match("title", '^Client "(.*)" created$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^Client "(.*)" created$';
UPDATE "Activity" SET "templateKey" = 'clientUpdated', "templateParams" = jsonb_build_object('name', (regexp_match("title", '^Client "(.*)" updated$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^Client "(.*)" updated$';
UPDATE "Activity" SET "templateKey" = 'taskCreated', "templateParams" = jsonb_build_object('task', (regexp_match("title", '^Task "(.*)" created$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^Task "(.*)" created$';
UPDATE "Activity" SET "templateKey" = 'taskAutoCreated', "templateParams" = jsonb_build_object('task', (regexp_match("title", '^Task "(.*)" auto-created$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^Task "(.*)" auto-created$';
UPDATE "Activity" SET "templateKey" = 'taskReassigned', "templateParams" = jsonb_build_object('task', (regexp_match("title", '^Task "(.*)" reassigned$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^Task "(.*)" reassigned$';
UPDATE "Activity" SET "templateKey" = 'taskCompleted', "templateParams" = jsonb_build_object('task', (regexp_match("title", '^Task "(.*)" completed$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^Task "(.*)" completed$';
UPDATE "Activity" SET "templateKey" = 'taskStatusChanged', "templateParams" = jsonb_build_object('task', (regexp_match("title", '^Task "(.*)" status changed$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^Task "(.*)" status changed$';
UPDATE "Activity" SET "templateKey" = 'taskUpdated', "templateParams" = jsonb_build_object('task', (regexp_match("title", '^Task "(.*)" updated$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^Task "(.*)" updated$';
UPDATE "Activity" SET "templateKey" = 'taskDeleted', "templateParams" = jsonb_build_object('task', (regexp_match("title", '^Task "(.*)" deleted$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^Task "(.*)" deleted$';
UPDATE "Activity" SET "templateKey" = 'taskRestored', "templateParams" = jsonb_build_object('task', (regexp_match("title", '^Task "(.*)" restored$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^Task "(.*)" restored$';
UPDATE "Activity" SET "templateKey" = 'documentUploaded', "templateParams" = jsonb_build_object('name', (regexp_match("title", '^Document "(.*)" uploaded$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^Document "(.*)" uploaded$';
UPDATE "Activity" SET "templateKey" = 'documentDeleted', "templateParams" = jsonb_build_object('name', (regexp_match("title", '^Document "(.*)" deleted$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^Document "(.*)" deleted$';
UPDATE "Activity" SET "templateKey" = 'documentRestored', "templateParams" = jsonb_build_object('name', (regexp_match("title", '^Document "(.*)" restored$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^Document "(.*)" restored$';
UPDATE "Activity" SET "templateKey" = 'documentTemplateUpdated', "templateParams" = jsonb_build_object('name', (regexp_match("title", '^Document template "(.*)" updated$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^Document template "(.*)" updated$';
UPDATE "Activity" SET "templateKey" = 'projectCreated', "templateParams" = jsonb_build_object('name', (regexp_match("title", '^Project "(.*)" created$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^Project "(.*)" created$';
UPDATE "Activity" SET "templateKey" = 'projectStatusChanged', "templateParams" = jsonb_build_object('name', (regexp_match("title", '^Project "(.*)" status changed$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^Project "(.*)" status changed$';
UPDATE "Activity" SET "templateKey" = 'projectUpdated', "templateParams" = jsonb_build_object('name', (regexp_match("title", '^Project "(.*)" updated$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^Project "(.*)" updated$';
UPDATE "Activity" SET "templateKey" = 'projectDeleted', "templateParams" = jsonb_build_object('name', (regexp_match("title", '^Project "(.*)" deleted$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^Project "(.*)" deleted$';
UPDATE "Activity" SET "templateKey" = 'blockCreated', "templateParams" = jsonb_build_object('name', (regexp_match("title", '^Block "(.*)" created$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^Block "(.*)" created$';
UPDATE "Activity" SET "templateKey" = 'blockUpdated', "templateParams" = jsonb_build_object('name', (regexp_match("title", '^Block "(.*)" updated$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^Block "(.*)" updated$';
UPDATE "Activity" SET "templateKey" = 'blockDeleted', "templateParams" = jsonb_build_object('name', (regexp_match("title", '^Block "(.*)" deleted$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^Block "(.*)" deleted$';
UPDATE "Activity" SET "templateKey" = 'entranceCreated', "templateParams" = jsonb_build_object('name', (regexp_match("title", '^Entrance "(.*)" created$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^Entrance "(.*)" created$';
UPDATE "Activity" SET "templateKey" = 'entranceUpdated', "templateParams" = jsonb_build_object('name', (regexp_match("title", '^Entrance "(.*)" updated$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^Entrance "(.*)" updated$';
UPDATE "Activity" SET "templateKey" = 'entranceDeleted', "templateParams" = jsonb_build_object('name', (regexp_match("title", '^Entrance "(.*)" deleted$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^Entrance "(.*)" deleted$';
UPDATE "Activity" SET "templateKey" = 'unitCreated', "templateParams" = jsonb_build_object('unit', (regexp_match("title", '^Unit "(.*)" created$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^Unit "(.*)" created$';
UPDATE "Activity" SET "templateKey" = 'unitStatusChanged', "templateParams" = jsonb_build_object('unit', (regexp_match("title", '^Unit "(.*)" status changed$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^Unit "(.*)" status changed$';
UPDATE "Activity" SET "templateKey" = 'unitUpdated', "templateParams" = jsonb_build_object('unit', (regexp_match("title", '^Unit "(.*)" updated$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^Unit "(.*)" updated$';
UPDATE "Activity" SET "templateKey" = 'unitDeleted', "templateParams" = jsonb_build_object('unit', (regexp_match("title", '^Unit "(.*)" deleted$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^Unit "(.*)" deleted$';
UPDATE "Activity" SET "templateKey" = 'branchCreated', "templateParams" = jsonb_build_object('name', (regexp_match("title", '^Branch "(.*)" created$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^Branch "(.*)" created$';
UPDATE "Activity" SET "templateKey" = 'branchUpdated', "templateParams" = jsonb_build_object('name', (regexp_match("title", '^Branch "(.*)" updated$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^Branch "(.*)" updated$';
UPDATE "Activity" SET "templateKey" = 'branchDeactivated', "templateParams" = jsonb_build_object('name', (regexp_match("title", '^Branch "(.*)" deactivated$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^Branch "(.*)" deactivated$';
UPDATE "Activity" SET "templateKey" = 'branchReactivated', "templateParams" = jsonb_build_object('name', (regexp_match("title", '^Branch "(.*)" reactivated$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^Branch "(.*)" reactivated$';
UPDATE "Activity" SET "templateKey" = 'userCreated', "templateParams" = jsonb_build_object('name', (regexp_match("title", '^User "(.*)" created$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^User "(.*)" created$';
UPDATE "Activity" SET "templateKey" = 'userUpdated', "templateParams" = jsonb_build_object('name', (regexp_match("title", '^User "(.*)" updated$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^User "(.*)" updated$';
UPDATE "Activity" SET "templateKey" = 'userDeactivated', "templateParams" = jsonb_build_object('name', (regexp_match("title", '^User "(.*)" deactivated$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^User "(.*)" deactivated$';
UPDATE "Activity" SET "templateKey" = 'userReactivated', "templateParams" = jsonb_build_object('name', (regexp_match("title", '^User "(.*)" reactivated$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^User "(.*)" reactivated$';
UPDATE "Activity" SET "templateKey" = 'userMovedBranch', "templateParams" = jsonb_build_object('name', (regexp_match("title", '^User "(.*)" moved to another branch$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^User "(.*)" moved to another branch$';
UPDATE "Activity" SET "templateKey" = 'userRoleChanged', "templateParams" = jsonb_build_object('name', (regexp_match("title", '^Role changed for "(.*)"$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^Role changed for "(.*)"$';
UPDATE "Activity" SET "templateKey" = 'userPasswordReset', "templateParams" = jsonb_build_object('name', (regexp_match("title", '^Password reset for "(.*)"$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^Password reset for "(.*)"$';
UPDATE "Activity" SET "templateKey" = 'userSessionsRevoked', "templateParams" = jsonb_build_object('name', (regexp_match("title", '^Sessions revoked for "(.*)"$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^Sessions revoked for "(.*)"$';
UPDATE "Activity" SET "templateKey" = 'userChangedOwnPassword', "templateParams" = jsonb_build_object('name', (regexp_match("title", '^"(.*)" changed their password$'))[1]) WHERE "templateKey" IS NULL AND "title" ~ '^"(.*)" changed their password$';
UPDATE "Activity" SET "templateKey" = 'blockDuplicated', "templateParams" = jsonb_build_object('name', (regexp_match("title", '^Block "(.*)" created \(duplicated from "(.*)"\)$'))[1], 'source', (regexp_match("title", '^Block "(.*)" created \(duplicated from "(.*)"\)$'))[2]) WHERE "templateKey" IS NULL AND "title" ~ '^Block "(.*)" created \(duplicated from "(.*)"\)$';
UPDATE "Activity" SET "templateKey" = 'entranceDuplicated', "templateParams" = jsonb_build_object('name', (regexp_match("title", '^Entrance "(.*)" created \(duplicated from "(.*)"\)$'))[1], 'source', (regexp_match("title", '^Entrance "(.*)" created \(duplicated from "(.*)"\)$'))[2]) WHERE "templateKey" IS NULL AND "title" ~ '^Entrance "(.*)" created \(duplicated from "(.*)"\)$';
UPDATE "Activity" SET "templateKey" = 'unitDuplicated', "templateParams" = jsonb_build_object('unit', (regexp_match("title", '^Unit "(.*)" created \(duplicated from "(.*)"\)$'))[1], 'source', (regexp_match("title", '^Unit "(.*)" created \(duplicated from "(.*)"\)$'))[2]) WHERE "templateKey" IS NULL AND "title" ~ '^Unit "(.*)" created \(duplicated from "(.*)"\)$';
UPDATE "Activity" SET "templateKey" = 'floorCreated', "templateParams" = jsonb_build_object('floor', ((regexp_match("title", '^Floor (-?\d+) created$'))[1])::int) WHERE "templateKey" IS NULL AND "title" ~ '^Floor (-?\d+) created$';
UPDATE "Activity" SET "templateKey" = 'floorUpdated', "templateParams" = jsonb_build_object('floor', ((regexp_match("title", '^Floor (-?\d+) updated$'))[1])::int) WHERE "templateKey" IS NULL AND "title" ~ '^Floor (-?\d+) updated$';
UPDATE "Activity" SET "templateKey" = 'floorDeleted', "templateParams" = jsonb_build_object('floor', ((regexp_match("title", '^Floor (-?\d+) deleted$'))[1])::int) WHERE "templateKey" IS NULL AND "title" ~ '^Floor (-?\d+) deleted$';
UPDATE "Activity" SET "templateKey" = 'floorDuplicated', "templateParams" = jsonb_build_object('floor', ((regexp_match("title", '^Floor (-?\d+) created \(duplicated from floor (-?\d+)\)$'))[1])::int, 'source', ((regexp_match("title", '^Floor (-?\d+) created \(duplicated from floor (-?\d+)\)$'))[2])::int) WHERE "templateKey" IS NULL AND "title" ~ '^Floor (-?\d+) created \(duplicated from floor (-?\d+)\)$';
UPDATE "Activity" SET "templateKey" = 'floorsCreated', "templateParams" = jsonb_build_object('count', ((regexp_match("title", '^(\d+) floors created on entrance$'))[1])::int) WHERE "templateKey" IS NULL AND "title" ~ '^(\d+) floors created on entrance$';
UPDATE "Activity" SET "templateKey" = 'unitsCreated', "templateParams" = jsonb_build_object('count', ((regexp_match("title", '^(\d+) units created on floor$'))[1])::int) WHERE "templateKey" IS NULL AND "title" ~ '^(\d+) units created on floor$';
UPDATE "Activity" SET "templateKey" = 'unitsImported', "templateParams" = jsonb_build_object('count', ((regexp_match("title", '^(\d+) units imported$'))[1])::int) WHERE "templateKey" IS NULL AND "title" ~ '^(\d+) units imported$';
