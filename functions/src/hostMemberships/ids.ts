import {createHash, randomInt} from "node:crypto";

const alphabet =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function randomToken(length: number): string {
  let value = "";
  for (let i = 0; i < length; i++) {
    value += alphabet[randomInt(alphabet.length)];
  }
  return value;
}

/** One paid membership per member per organizer, so rejoining keeps tenure. */
export function hostMembershipId(organizerId: string, uid: string): string {
  return "hm_" + createHash("sha256")
    .update(JSON.stringify([organizerId, uid])).digest("hex");
}

export function newHostMembershipPlanId(): string {
  return "hmp_" + randomToken(20);
}

export function newHostMembershipCheckoutId(): string {
  return "hmc_" + randomToken(20);
}

export function hostMembershipBenefitUseId(eventId: string, uid: string):
  string {
  return `${eventId}_${uid}`;
}

export function hostMembershipWebhookReceiptId(key: string): string {
  return "hmwh_" + createHash("sha256").update(key).digest("hex");
}

export const isHostMembershipPlanId = (value: unknown): value is string =>
  typeof value === "string" && /^hmp_[A-Za-z0-9]{20}$/u.test(value);
export const isHostMembershipCheckoutId = (value: unknown): value is string =>
  typeof value === "string" && /^hmc_[A-Za-z0-9]{20}$/u.test(value);
