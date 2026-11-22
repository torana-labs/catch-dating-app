import {createHmac, timingSafeEqual} from "node:crypto";

/** Constant-time comparison for webhook secrets and signatures. */
export function equalSecret(actual: unknown, expected: string): boolean {
  if (typeof actual !== "string" || !expected || actual.length > 1024) {
    return false;
  }
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length &&
    timingSafeEqual(actualBytes, expectedBytes);
}

export function verifyCatchWebhookSignature(rawBody: Buffer,
  signature: string | undefined, appSecret: string): boolean {
  if (!/^sha256=[a-f0-9]{64}$/.test(signature ?? "") || !appSecret) {
    return false;
  }
  const expected = "sha256=" + createHmac("sha256", appSecret)
    .update(rawBody).digest("hex");
  return equalSecret(signature, expected);
}
