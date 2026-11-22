/** Correlation only; callbacks still require the signed private queue. */
export function whatsappStatusCorrelation(attemptId: string,
  payloadHash: string): string {
  if (!/^attempt:[a-f0-9]{64}$/.test(attemptId) || attemptId.length !== 72 ||
      !/^[a-f0-9]{64}$/.test(payloadHash) || payloadHash.length !== 64) {
    throw new Error("Invalid WhatsApp status correlation");
  }
  return "ce-wa-status1." + attemptId.slice(8) + "." + payloadHash;
}

export function whatsappAttemptFromStatus(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^ce-wa-status1\.([a-f0-9]{64})\.[a-f0-9]{64}$/.exec(value);
  return match?.[0] === value ? "attempt:" + match[1] : null;
}
