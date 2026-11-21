/** Path and id checks for the public page reads; publication is decided by the read models. */
export function publicDocumentId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,179}$/u.test(value);
}

export function organizerPath(value: unknown): value is string {
  return typeof value === "string" && value.length <= 240 &&
    /^\/organizers\/(?:[a-z0-9-]+\/){1,2}$/u.test(value);
}

export {publicJsonLd} from "../shared/next/publicJsonLd.ts";
