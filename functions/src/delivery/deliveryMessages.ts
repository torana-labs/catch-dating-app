/**
 * One outbox collection for automation, programme, campaign and
 * approval-notification messages. Each record's `source` names the adapter
 * that owns it; message ids are `outbox:` content hashes over the source's own
 * context, so sources never share an id.
 */
export const DELIVERY_MESSAGES = "deliveryMessages";
