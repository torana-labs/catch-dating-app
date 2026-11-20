import * as admin from "firebase-admin";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {reconcileOrganizerBillView} from "./organizerBillViewStore";

/** A bill's owner view follows the bill: sent, paid, written off, free. */
export const onHostOrganizerBillViewBillChanged = onDocumentWritten({
  retry: true, document: "organizerBills/{billId}",
}, (event) => reconcileOrganizerBillView(admin.firestore(),
  event.params.billId));
