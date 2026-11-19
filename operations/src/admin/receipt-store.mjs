import {LocalReceiptStore} from "../../../packages/command-client/src/receipt-store.mjs";

export class AdminActionReceiptStore extends LocalReceiptStore {
  constructor(root) {
    super(root, {conflictCode: "ADMIN_ACTION_RECEIPT_CONFLICT"});
  }
}
