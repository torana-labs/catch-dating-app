// What a client must collect before it applies a command, by effect class
// (contracts/commands/catalog.json "effectClasses"). The server enforces the
// preview hash for messages-guests and moves-money; clients are stricter and
// also ask for an explicit confirmation before anything is published. Every
// client (the catch CLI, AI tool definitions, later WhatsApp) reads this one
// table; the parity test fails when the catalog gains an effect class that is
// missing here.
export const EFFECT_CONFIRMATION_POLICY = Object.freeze({
  "draft": Object.freeze({
    confirmCommandId: false,
    previewHash: false,
    explain: "Writes only your own private, unpublished records.",
  }),
  "publishes": Object.freeze({
    confirmCommandId: true,
    previewHash: false,
    explain: "Makes something public, so it needs an explicit confirmation.",
  }),
  "messages-guests": Object.freeze({
    confirmCommandId: true,
    previewHash: true,
    explain: "Sends a message to guests, so it needs confirmation of the reviewed preview.",
  }),
  "moves-money": Object.freeze({
    confirmCommandId: true,
    previewHash: true,
    explain: "Charges, refunds or pays out, so it needs confirmation of the reviewed preview.",
  }),
});

export function confirmationPolicy(effect) {
  const policy = EFFECT_CONFIRMATION_POLICY[effect];
  if (!policy) throw new Error(`No confirmation policy for effect class ${effect}.`);
  return policy;
}
