import {useMemo, useState} from "react";
import {listingRequestCopy as copy} from "@content/listingRequest";
import {
  createListingRequestSubmission,
  type ListingRequestReceipt,
  type ListingRequestSubmission,
} from "../../shared/api/listingRequest";
import {
  declarationsComplete,
  detailErrors,
  emptyDraft,
  prefillFromSearch,
  requestBody,
  rolesByType,
  type DeclarationKey,
  type ListingRequestDraft,
  type RequestType,
} from "./listingRequestModel";

export type ListingRequestStage = "type" | "details" | "declarations" | "sent";

/**
 * The listing request form: choose a type, fill its fixed fields, confirm
 * the declarations and send. Errors show once Continue or Send has been
 * tried. The target comes from the link the form opened from (`?organizer=`
 * or `?event=`), so a person reporting a listing never pastes its address.
 */
export function useListingRequestController({search = "", sourcePage = "/listings/request/", submission}: {
  search?: string;
  sourcePage?: string;
  /** Stories and tests pass their own; the page uses the site's intake client. */
  submission?: ListingRequestSubmission;
} = {}) {
  const prefill = useMemo(() => prefillFromSearch(search), [search]);
  const [draft, setDraft] = useState<ListingRequestDraft>(() => emptyDraft(prefill.target, prefill.type));
  const [stage, setStage] = useState<ListingRequestStage>(prefill.type ? "details" : "type");
  const [tried, setTried] = useState<{type: boolean; details: boolean; declarations: boolean}>(
    {type: false, details: false, declarations: false});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ListingRequestReceipt | null>(null);
  const [client] = useState(() => submission ?? createListingRequestSubmission());

  const errors = tried.details ? detailErrors(draft) : {};
  const prefilled = prefill.target.kind !== "url";

  return {
    stage,
    draft,
    errors,
    prefilled,
    error,
    sending,
    receipt,
    typeError: tried.type && !draft.type ? copy.errors.type : null,
    declarationsError: tried.declarations && !declarationsComplete(draft) ? copy.errors.declarations : null,
    update: <K extends keyof ListingRequestDraft>(key: K, value: ListingRequestDraft[K]) =>
      setDraft((current) => ({...current, [key]: value})),
    chooseType: (type: RequestType) => setDraft((current) => ({
      ...current, type,
      // A role the new type does not take is cleared, so the person chooses again.
      role: current.role && rolesByType[type].includes(current.role) ? current.role : null,
      proofMethod: null,
    })),
    declare: (key: DeclarationKey, value: boolean) =>
      setDraft((current) => ({...current, declarations: {...current.declarations, [key]: value}})),
    /** Step 1 → 2 once a type is chosen. */
    continueFromType: () => {
      setTried((current) => ({...current, type: true}));
      if (draft.type) setStage("details");
    },
    /** Step 2 → 3 once its fields are complete. */
    continueFromDetails: () => {
      setTried((current) => ({...current, details: true}));
      if (Object.keys(detailErrors(draft)).length === 0) setStage("declarations");
    },
    back: () => {
      setError(null);
      setStage((current) => current === "declarations" ? "details" : "type");
    },
    /** Edits the target after a prefilled link, by pasting a page link instead. */
    changeTarget: () => setDraft((current) => ({...current, target: {kind: "url", url: ""}})),
    send: async () => {
      setTried((current) => ({...current, declarations: true}));
      if (!declarationsComplete(draft) || Object.keys(detailErrors(draft)).length > 0) return;
      setSending(true);
      setError(null);
      const outcome = await client.submit(requestBody(draft, sourcePage));
      setSending(false);
      if (outcome.status === "sent") {
        setReceipt(outcome.receipt);
        setStage("sent");
        return;
      }
      setError(outcome.message ?? copy.errors[outcome.status]);
    },
    startAgain: () => {
      client.reset();
      setDraft(emptyDraft(prefill.target, null));
      setTried({type: false, details: false, declarations: false});
      setReceipt(null);
      setError(null);
      setStage("type");
    },
  };
}

export type ListingRequestController = ReturnType<typeof useListingRequestController>;
