/**
 * One collection holds the WhatsApp dispatch evidence for programme,
 * automation and approval-notification sends. Each document's `source` names
 * the sender that wrote it; attempt ids are content hashes, so sources never
 * share an id. Campaign dispatches join once their claimed tests are free.
 */
export const WHATSAPP_DISPATCHES = "whatsappDispatches";
