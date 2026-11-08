import type {GetProgramHouseholdRsvpViewCallablePayload as Credential} from "../../shared/contracts/generated/getProgramHouseholdRsvpViewCallablePayload";
import type {ProgramHouseholdRsvpViewCallableResponse as View} from "../../shared/contracts/generated/programHouseholdRsvpViewCallableResponse";
import type {SubmitProgramHouseholdRsvpCallablePayload as Submission} from "../../shared/contracts/generated/submitProgramHouseholdRsvpCallablePayload";

export type {Credential, View};
export type MemberView = View["members"][number];
export type MemberFunctionView = MemberView["functions"][number];
export type RsvpStatus = MemberFunctionView["rsvpStatus"];
export type ResponseDraft = Submission["responses"][number];
export type TravelEcho = MemberView["travel"][number];
export type TravelKind = TravelEcho["kind"];
export type TravelDraft =
  NonNullable<Submission["travel"]>[number];

const TOKEN_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

/**
 * Route-owned credential. The signed link token is only ever accepted from the
 * path parameter, never from query parameters, so it cannot leak via
 * analytics or referer captures the way an accidental query token could.
 */
export function householdRsvpCredential(
  householdToken: string | undefined,
): Credential | null {
  if (!householdToken || householdToken.length < 16 ||
      householdToken.length > 512 || !TOKEN_PATTERN.test(householdToken)) {
    return null;
  }
  return {token: householdToken};
}

const draftKey = (guestId: string, functionId: string) =>
  JSON.stringify([guestId, functionId]);


export function draftFor(
  drafts: ReadonlyMap<string, ResponseDraft>,
  guestId: string,
  functionId: string,
): ResponseDraft | undefined {
  return drafts.get(draftKey(guestId, functionId));
}

export function withResponseDraft(
  drafts: ReadonlyMap<string, ResponseDraft>,
  guestId: string,
  functionId: string,
  patch: Partial<ResponseDraft>,
): Map<string, ResponseDraft> {
  const next = new Map(drafts);
  const current = next.get(draftKey(guestId, functionId)) ?? {
    guestId, functionId, rsvpStatus: "pending" as RsvpStatus,
    partySize: null, responseNote: null,
  };
  next.set(draftKey(guestId, functionId), {...current, ...patch});
  return next;
}

/**
 * Builds the full draft map from the server view. Submitting sends every
 * member/function pair so the payload is deterministic and the server can
 * apply it atomically.
 */
export function draftsFromView(view: View): Map<string, ResponseDraft> {
  const drafts = new Map<string, ResponseDraft>();
  for (const member of view.members) {
    for (const fn of member.functions) {
      drafts.set(draftKey(member.guestId, fn.functionId), {
        guestId: member.guestId,
        functionId: fn.functionId,
        rsvpStatus: fn.rsvpStatus,
        partySize: fn.partySize ?? null,
        responseNote: fn.responseNote ?? null,
      });
    }
  }
  return drafts;
}

export function draftChanged(
  draft: ResponseDraft,
  fn: MemberFunctionView,
): boolean {
  return draft.rsvpStatus !== fn.rsvpStatus ||
    (draft.partySize ?? null) !== (fn.partySize ?? null) ||
    (draft.responseNote ?? null) !== (fn.responseNote ?? null);
}

const travelKey = (guestId: string, kind: TravelKind) =>
  JSON.stringify([guestId, kind]);

/** One travel draft per member and journey kind (arrival/departure). */
export function travelDraftFor(
  drafts: ReadonlyMap<string, TravelDraft>,
  guestId: string,
  kind: TravelKind,
): TravelDraft | undefined {
  return drafts.get(travelKey(guestId, kind));
}

export function withTravelDraft(
  drafts: ReadonlyMap<string, TravelDraft>,
  guestId: string,
  kind: TravelKind,
  patch: Partial<TravelDraft>,
): Map<string, TravelDraft> {
  const next = new Map(drafts);
  const current = next.get(travelKey(guestId, kind)) ?? {guestId, kind};
  next.set(travelKey(guestId, kind), {...current, ...patch});
  return next;
}

/** Seeds drafts from echoed legs so resubmits pre-fill. */
export function travelDraftsFromView(view: View): Map<string, TravelDraft> {
  const drafts = new Map<string, TravelDraft>();
  for (const member of view.members) {
    for (const echo of member.travel) {
      drafts.set(travelKey(member.guestId, echo.kind), {
        guestId: member.guestId,
        kind: echo.kind,
        flightNumber: echo.flightNumber,
        carrierCode: echo.carrierCode,
        originIata: echo.originIata,
        destinationIata: echo.destinationIata,
        scheduledArrivalAtMillis: echo.scheduledArrivalAtMillis,
        destinationHotelId: echo.destinationHotelId,
        destinationLabel: echo.destinationLabel,
        passengers: echo.passengers,
        luggageUnits: echo.luggageUnits,
      });
    }
  }
  return drafts;
}

/** A block with no itinerary content is never submitted. */
export function travelDraftHasContent(draft: TravelDraft): boolean {
  return Boolean(
    draft.flightNumber?.trim() || draft.originIata?.trim() ||
    draft.destinationIata?.trim() ||
    draft.scheduledArrivalAtMillis != null ||
    draft.destinationHotelId || draft.destinationLabel?.trim() ||
    (draft.passengers ?? 1) !== 1 || (draft.luggageUnits ?? 0) !== 0);
}

/** A partially-filled block needs a destination and an arrival time. */
export function travelDraftIncomplete(draft: TravelDraft): boolean {
  return travelDraftHasContent(draft) && (
    (!draft.destinationHotelId && !draft.destinationLabel?.trim()) ||
    draft.scheduledArrivalAtMillis == null);
}

export function travelDraftChanged(
  draft: TravelDraft,
  echo: TravelEcho | undefined,
): boolean {
  if (!echo) return travelDraftHasContent(draft);
  return (draft.flightNumber ?? null) !== echo.flightNumber ||
    (draft.carrierCode ?? null) !== echo.carrierCode ||
    (draft.originIata ?? null) !== echo.originIata ||
    (draft.destinationIata ?? null) !== echo.destinationIata ||
    (draft.scheduledArrivalAtMillis ?? null) !==
      echo.scheduledArrivalAtMillis ||
    (draft.destinationHotelId ?? null) !== echo.destinationHotelId ||
    (draft.destinationLabel ?? null) !== echo.destinationLabel ||
    (draft.passengers ?? 1) !== echo.passengers ||
    (draft.luggageUnits ?? 0) !== echo.luggageUnits;
}

export type HouseholdRsvpScreen =
  | {kind: "loading"}
  | {kind: "unavailable"; reason: "invalid" | "network"}
  | {
    kind: "ready";
    view: View;
    drafts: Map<string, ResponseDraft>;
    travelDrafts: Map<string, TravelDraft>;
    messagingConsent: boolean;
    dirty: boolean;
    pending: boolean;
    submitted: boolean;
    notice: string;
  };

/**
 * Where the RSVP page links on to: the household's weekend once someone has
 * replied (this visit or before), and its ID page when the programme
 * collects IDs for the hotels. Both reuse the RSVP link's own token.
 */
export function householdRsvpOnwardLinks(view: View, submitted: boolean, token: string | null):
  {itinerary: string | null; ids: string | null} {
  if (!token) return {itinerary: null, ids: null};
  const path = encodeURIComponent(token);
  const replied = submitted ||
    view.members.some((member) => member.functions.some((fn) => fn.rsvpStatus !== "pending"));
  return {
    itinerary: replied ? `/itinerary/${path}/` : null,
    ids: view.collectsGuestIds === true ? `/ids/${path}/` : null,
  };
}

