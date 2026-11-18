import type {ListingRequestHTTPRequest} from "../contracts/generated/listingRequestHTTPRequest";
import type {ListingRequestHTTPResponse} from "../contracts/generated/listingRequestHTTPResponse";

/**
 * The listing request client: /listings/request/ posts one structured
 * request to /api/listing-request (functions/src/takedownRequests/intake.ts).
 * It follows the website lead client: a request id per submission, kept
 * while the answers stay the same so a retry is the same request, and the
 * site's App Check token on every send. It owns no copy: each failure names
 * its state and the caller words it.
 */

export type ListingRequestBody = ListingRequestHTTPRequest;
export type ListingRequestReceipt = Extract<ListingRequestHTTPResponse, {ok: true}>["request"];

/** The body without its request id, which the client adds. */
export type ListingRequestDraftBody = ListingRequestBody extends infer Body ?
  Body extends ListingRequestBody ? Omit<Body, "clientRequestId"> : never : never;

export const listingRequestProblems = ["invalid", "refresh", "changed", "busy", "failed"] as const;
export type ListingRequestProblem = typeof listingRequestProblems[number];

export type ListingRequestOutcome =
  | {readonly status: "sent"; readonly receipt: ListingRequestReceipt}
  | {readonly status: ListingRequestProblem; readonly message: string | null};

const problemByStatus: Readonly<Record<number, ListingRequestProblem>> = {
  400: "invalid", 401: "refresh", 409: "changed", 429: "busy",
};

const instant = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/u;

/** The receipt when the response is one, else null. */
export function parseListingRequestReceipt(value: unknown): ListingRequestReceipt | null {
  if (!value || typeof value !== "object" || (value as {ok?: unknown}).ok !== true) return null;
  const request = (value as {request?: Record<string, unknown>}).request;
  if (!request || typeof request !== "object") return null;
  const valid = typeof request.requestId === "string" && /^lr-[a-f0-9]{40}$/u.test(request.requestId) &&
    typeof request.reference === "string" && /^LR-[A-Z2-9]{8}$/u.test(request.reference) &&
    typeof request.requestType === "string" && typeof request.isNew === "boolean" &&
    typeof request.ackDueAt === "string" && instant.test(request.ackDueAt) &&
    typeof request.resolveDueAt === "string" && instant.test(request.resolveDueAt) &&
    (request.actionDueAt === null || (typeof request.actionDueAt === "string" && instant.test(request.actionDueAt)));
  return valid ? request as unknown as ListingRequestReceipt : null;
}

/** A request id for one submission: 32 hex characters, as the contract asks. */
export function listingRequestId(random: () => string = () => globalThis.crypto.randomUUID()): string {
  return random().replace(/-/gu, "");
}

async function siteAppCheckToken(): Promise<string | null> {
  return (await import("../../firebase")).getWebsiteAppCheckToken();
}

export interface ListingRequestSubmissionOptions {
  readonly appCheckToken?: () => Promise<string | null>;
  readonly post?: typeof fetch;
  readonly newRequestId?: () => string;
}

export interface ListingRequestSubmission {
  submit(body: ListingRequestDraftBody): Promise<ListingRequestOutcome>;
  reset(): void;
}

/** One form's submissions; a send never throws. */
export function createListingRequestSubmission(options: ListingRequestSubmissionOptions = {}): ListingRequestSubmission {
  const {appCheckToken = siteAppCheckToken, post = (...args) => fetch(...args),
    newRequestId = () => listingRequestId()} = options;
  let current: {signature: string; requestId: string} | null = null;
  return {
    reset() {
      current = null;
    },
    async submit(draft) {
      const signature = JSON.stringify(draft);
      if (current?.signature !== signature) current = {signature, requestId: newRequestId()};
      const body = {...draft, clientRequestId: current.requestId} as ListingRequestBody;
      const token = await appCheckToken().catch(() => null);
      let response: Response;
      try {
        response = await post("/api/listing-request", {
          method: "POST",
          headers: {"Content-Type": "application/json", ...(token ? {"X-Firebase-AppCheck": token} : {})},
          body: JSON.stringify(body),
        });
      } catch {
        return {status: "failed", message: null};
      }
      if (!response.ok) {
        if (response.status === 409) current = null;
        // A 400 carries the intake's own words for a rule the form could not check.
        const message = response.status === 400 ?
          await response.json().then((data: {error?: unknown}) => typeof data?.error === "string" ? data.error : null).catch(() => null) : null;
        return {status: problemByStatus[response.status] ?? "failed", message};
      }
      const receipt = parseListingRequestReceipt(await response.json().catch(() => null));
      return receipt ? {status: "sent", receipt} : {status: "failed", message: null};
    },
  };
}
