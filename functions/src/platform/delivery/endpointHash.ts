import {createHash} from "node:crypto";

/** Opaque endpoint key: the SHA-256 hex digest of an E.164 address. */
export function hashEndpoint(e164: string): string {
  return createHash("sha256").update(e164).digest("hex");
}
