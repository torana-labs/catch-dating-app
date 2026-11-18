import {LocalReceiptStore} from "../command-client/receipt-store.mjs";

export class AdminActionReceiptStore extends LocalReceiptStore {
  constructor(root) {
    super(root, {conflictCode: "ADMIN_ACTION_RECEIPT_CONFLICT"});
  }
}
