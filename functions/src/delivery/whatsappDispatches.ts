/**
 * One collection holds the WhatsApp dispatch evidence for programme,
 * campaign, automation and approval-notification sends. Each document's
 * `source` names the sender that wrote it; attempt ids are content hashes, so
 * sources never share an id.
 */
export const WHATSAPP_DISPATCHES = "whatsappDispatches";
