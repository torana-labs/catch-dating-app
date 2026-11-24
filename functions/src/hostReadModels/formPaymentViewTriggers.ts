import {reconcileFormPaymentView} from "./formPaymentViewStore";
import {defineProjections} from "../platform/dispatch/runtime";

/**
 * A form fee payment: its ledger row view.
 * Served by dispatchGuestPayments (issue #2451); it re-reads its sources,
 * so a retry or a replay converges.
 */
export const hostFormPaymentViewProjections = defineProjections(
  "guestPayments", [{
    id: "hostFormPaymentView", kind: "projection",
    when: ({before, after}) => before?.purpose === "form" ||
      after?.purpose === "form",
    run: (change, ctx) => reconcileFormPaymentView(ctx.db, change.documentId),
  }]);
