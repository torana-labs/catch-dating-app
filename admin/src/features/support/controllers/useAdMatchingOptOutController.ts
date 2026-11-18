import {useMutation} from "@tanstack/react-query";
import {useCallback, useState} from "react";
import {useAdminPendingOperationGuard} from
  "../../../shared/pendingOperation";
import {
  manageAdMatchingOptOut,
  type AdMatchingKind,
  type AdMatchingOptOutAction,
  type AdMatchingOptOutResult,
} from "../api/adMatchingOptOutRepository";

export interface AdMatchingContact {
  phone: string;
  email: string;
  note: string;
}

export interface AdMatchingOptOutController {
  /** The latest answer, for the contact it was asked about. */
  result: AdMatchingOptOutResult | null;
  isSaving: boolean;
  check: (contact: AdMatchingContact) => Promise<boolean>;
  record: (contact: AdMatchingContact) => Promise<boolean>;
  remove: (contact: AdMatchingContact) => Promise<boolean>;
  clear: () => void;
}

const kindLabel: Record<AdMatchingKind, string> = {
  phone: "phone number", email: "email",
};

/** "phone number and email", "email", or "" for none. */
export function adMatchingKindsLabel(kinds: AdMatchingKind[]): string {
  return kinds.map((kind) => kindLabel[kind]).join(" and ");
}

/** What the latest answer means, in a sentence for the operator. */
export function adMatchingStatusLabel(
  result: AdMatchingOptOutResult | null
): string | null {
  if (!result) return null;
  if (result.optedOut.length === 0) {
    return "Ad matching is on for this contact.";
  }
  return `Ad matching is off for the ${
    adMatchingKindsLabel(result.optedOut)}.`;
}

function notice(result: AdMatchingOptOutResult): string {
  const changed = adMatchingKindsLabel(result.changed);
  if (result.action === "record") {
    return changed ? `Ad matching stopped for the ${changed}.` :
      "Already opted out; nothing changed.";
  }
  if (result.action === "remove") {
    return changed ? `Ad matching resumed for the ${changed}.` :
      "No opt-out was on file; nothing changed.";
  }
  return adMatchingStatusLabel(result) ?? "Checked.";
}

/**
 * Support's ad-matching opt-out: a person asks Catch to stop sending their
 * data to advertising partners. The operator checks, records or removes it
 * for the phone and/or email the request names. Nothing typed here is kept
 * in the browser after the answer.
 */
export function useAdMatchingOptOutController({
  onError,
  onNotice,
}: {
  onError: (message: string | null) => void;
  onNotice: (message: string | null) => void;
}): AdMatchingOptOutController {
  const {beginOperation, endOperation} = useAdminPendingOperationGuard();
  const [result, setResult] = useState<AdMatchingOptOutResult | null>(null);
  const mutation = useMutation({mutationFn: manageAdMatchingOptOut});

  const run = useCallback(async (action: AdMatchingOptOutAction,
    contact: AdMatchingContact): Promise<boolean> => {
    const phone = contact.phone.trim() || null;
    const email = contact.email.trim() || null;
    if (!phone && !email) {
      onError("Enter the phone number or email the request names.");
      return false;
    }
    const operation = beginOperation();
    if (!operation) return false;
    try {
      const answer = await mutation.mutateAsync({action, phone, email,
        source: "support", note: contact.note.trim() || null});
      setResult(answer);
      onError(null);
      onNotice(notice(answer));
      return true;
    } catch (error) {
      onError(error instanceof Error && error.message ? error.message :
        "Unable to update ad matching.");
      return false;
    } finally {
      endOperation(operation);
    }
  }, [beginOperation, endOperation, mutation, onError, onNotice]);

  return {
    result,
    isSaving: mutation.isPending,
    check: useCallback((contact) => run("check", contact), [run]),
    record: useCallback((contact) => run("record", contact), [run]),
    remove: useCallback((contact) => run("remove", contact), [run]),
    clear: useCallback(() => setResult(null), []),
  };
}
