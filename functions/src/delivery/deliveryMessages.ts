/**
 * One outbox collection for automation, programme and approval-notification
 * messages. Each record's `source` names the adapter that owns it; message
 * ids are `outbox:` content hashes over the source's own context, so sources
 * never share an id. The campaign outbox joins once its claimed tests are free.
 */
export const DELIVERY_MESSAGES = "deliveryMessages";
