// What the Support inbox shows for an inbound WhatsApp message that is not
// plain text. Media is never downloaded: a photo becomes "[photo]", a voice
// note "[voice note]", a document "[document: menu.pdf]", a location
// "[location]" and a button or list reply the label the person tapped.
// The webhook stores this placeholder in the receipt's text field; only
// messageType "text" is ever treated as words the person typed (nomination
// parsing, STOP and the reply trial all require it).

const MAX_PART = 300;

/** Delivery noise that never needs a reply: reactions and system notices. */
const SILENT_TYPES = new Set(["reaction", "system", "request_welcome",
  "ephemeral"]);

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ?
    value as Record<string, unknown> : {};
}

function part(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const flat = value.replace(/[\p{Cc}\s]+/gu, " ").trim();
  if (!flat) return null;
  return flat.length > MAX_PART ? `${flat.slice(0, MAX_PART - 1)}…` : flat;
}

function withCaption(label: string, caption: unknown): string {
  const text = part(caption);
  return text ? `${label} ${text}` : label;
}

/**
 * The Support placeholder for one raw Cloud API message of a non-text type,
 * or null for a reaction or system notice, which Support does not show.
 * @param {string} messageType The message's type field.
 * @param {unknown} message The raw message object from the webhook.
 * @return {string | null} Placeholder text.
 */
export function catchInboundPlaceholder(messageType: string,
  message: unknown): string | null {
  if (SILENT_TYPES.has(messageType)) return null;
  const raw = record(message);
  const content = record(raw[messageType]);
  switch (messageType) {
  case "image":
    return withCaption("[photo]", content.caption);
  case "video":
    return withCaption("[video]", content.caption);
  case "audio":
    return content.voice === true ? "[voice note]" : "[audio]";
  case "document": {
    const name = part(content.filename);
    return withCaption(name ? `[document: ${name}]` : "[document]",
      content.caption);
  }
  case "sticker":
    return "[sticker]";
  case "location": {
    const name = part(content.name);
    return name ? `[location: ${name}]` : "[location]";
  }
  case "contacts": {
    const count = Array.isArray(raw.contacts) ? raw.contacts.length : 0;
    return count > 1 ? `[${count} contacts]` : "[contact]";
  }
  case "button":
    return part(content.text) ?? "[button reply]";
  case "interactive":
    return part(record(content.button_reply).title) ??
      part(record(content.list_reply).title) ?? "[form reply]";
  case "order":
    return "[order]";
  default:
    return "[message type WhatsApp could not show]";
  }
}

/**
 * The text a Support conversation records for a stored receipt: a text
 * message's body, the stored placeholder, or (for receipts stored before
 * placeholders existed) one derived from the type alone.
 * @param {object} receipt Inbound receipt fields.
 * @return {string | null} Text, or null when Support should skip it.
 */
export function catchSupportInboundText(receipt: {
  messageType?: string | null;
  text?: string | null;
}): string | null {
  const type = receipt.messageType;
  if (!type) return null;
  if (type === "text") {
    return typeof receipt.text === "string" && receipt.text.trim() ?
      receipt.text : null;
  }
  if (SILENT_TYPES.has(type)) return null;
  if (typeof receipt.text === "string" && receipt.text.trim()) {
    return receipt.text;
  }
  return catchInboundPlaceholder(type, null);
}
