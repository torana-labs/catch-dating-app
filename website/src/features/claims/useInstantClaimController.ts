import {useMutation, useQuery} from "@tanstack/react-query";
import {type FormEvent, useEffect, useState} from "react";
import {trackMarketingEvent} from "../../analytics";
import {claimFirebaseConfigured} from "../../firebaseConfig";
import type {
  OrganizerClaimAttemptState,
  OrganizerClaimVerificationMethod,
  OrganizerClaimVerificationStart,
} from "../../firebase";
import {useWebsiteAccountController} from "../account/useWebsiteAccountController";
import {claimVerificationCopy} from "@content/claimVerification";
import {parseProofUrls, readableError} from "./claimModel";
import {useClaimRequestMutation} from "./useClaimRequestMutation";

export type InstantClaimPhase = "unavailable" | "account" | "loading" | "choose" | "code" | "review" |
  "requested" | "done";

/**
 * Claiming one listing, after a single phone sign-in. The usual way proves
 * ownership straight away: a code sent from the listing's Instagram account,
 * or pasted into its Luma calendar, and the backend approves the claim when
 * the proof arrives. When neither works, the organiser sends a link that
 * shows the page is theirs and staff review it. The account already holds
 * their name and verified phone, so the review asks for nothing else.
 */
export function useInstantClaimController(organizerId: string, onStart: () => void = () => undefined) {
  const account = useWebsiteAccountController();
  const [method, setMethod] = useState<OrganizerClaimVerificationMethod | null>(null);
  const [attempt, setAttempt] = useState<OrganizerClaimVerificationStart | null>(null);
  const [attemptState, setAttemptState] = useState<OrganizerClaimAttemptState | null>(null);
  const [lumaMissing, setLumaMissing] = useState(false);
  const [verified, setVerified] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [proofLinks, setProofLinks] = useState("");
  const [note, setNote] = useState("");
  const [reviewRequestId, setReviewRequestId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const options = useQuery({
    queryKey: ["claim-verification-options", account.uid, organizerId],
    enabled: claimFirebaseConfigured && account.ready && Boolean(account.uid),
    gcTime: 0, staleTime: 0, retry: false,
    queryFn: async () => (await import("../../firebase")).getOrganizerClaimVerificationOptions({organizerId}),
  });
  const methods = (options.data?.methods ?? []).filter((item) => item.available && item.proofTarget);
  const chosen = methods.find((item) => item.method === method) ?? methods[0] ?? null;

  const start = useMutation({retry: false, gcTime: 0,
    mutationFn: async (next: OrganizerClaimVerificationMethod) =>
      (await import("../../firebase")).startOrganizerClaimVerification({organizerId, method: next})});
  const confirm = useMutation({retry: false, gcTime: 0,
    mutationFn: async (attemptId: string) =>
      (await import("../../firebase")).confirmOrganizerClaimVerification({attemptId})});
  const review = useClaimRequestMutation(organizerId);

  // The Instagram webhook completes the attempt; the page follows it.
  useEffect(() => {
    if (!attempt || attempt.method !== "instagramMessage") return;
    let stop: () => void = () => undefined;
    let cancelled = false;
    void import("../../firebase")
      .then(({watchOrganizerClaimAttempt}) => watchOrganizerClaimAttempt(attempt.attemptId,
        (state) => {if (!cancelled) setAttemptState(state);},
        () => {if (!cancelled) setError(claimFailure);}))
      .then((unsubscribe) => {if (cancelled) unsubscribe(); else stop = unsubscribe;})
      .catch(() => {if (!cancelled) setError(claimFailure);});
    return () => {cancelled = true; stop();};
  }, [attempt]);

  useEffect(() => {
    if (attemptState?.status === "verified" && !verified) {
      setVerified(true);
      trackMarketingEvent("claim_flow_verified", {club_id: organizerId, verification_method: "instagramMessage"});
    }
  }, [attemptState?.status, organizerId, verified]);

  useEffect(() => {
    if (!attempt || verified) return;
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, [attempt, verified]);

  const expiresAtMillis = attemptState?.expiresAtMillis ?? (attempt ? Date.parse(attempt.expiresAt) : null);
  const expired = Boolean(attempt && !verified && (attemptState?.status === "expired" ||
    attemptState?.status === "superseded" || (expiresAtMillis !== null && now >= expiresAtMillis)));

  async function showCode() {
    if (!chosen || start.isPending) return;
    onStart();
    setError(""); setLumaMissing(false); setCopied(false); setAttemptState(null);
    try {
      const next = await start.mutateAsync(chosen.method);
      setAttempt(next);
      setNow(Date.now());
      trackMarketingEvent("claim_flow_code_shown", {club_id: organizerId, verification_method: next.method});
    } catch (cause) {
      setError(readableError(cause));
    }
  }

  async function checkLuma() {
    if (!attempt || confirm.isPending) return;
    setError(""); setLumaMissing(false);
    try {
      const result = await confirm.mutateAsync(attempt.attemptId);
      if (result.status === "verified") {
        setVerified(true);
        trackMarketingEvent("claim_flow_verified", {club_id: organizerId, verification_method: "lumaDescription"});
      } else if (result.status === "awaitingProof") {
        setLumaMissing(true);
      } else if (result.status === "expired") {
        setAttemptState({status: "expired", expiresAtMillis: null, rejection: null});
      } else {
        setError(claimVerificationCopy.claimUnavailable);
      }
    } catch (cause) {
      setError(readableError(cause));
    }
  }

  async function requestReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const profile = account.account;
    if (!profile || review.isPending) return;
    onStart();
    const proofUrls = parseProofUrls(proofLinks);
    if (!proofUrls.length) {
      setError(claimVerificationCopy.reviewNeedsLink);
      return;
    }
    setError("");
    try {
      const response = await review.mutateAsync({organizerId, requesterName: profile.displayName,
        requesterRole: "owner", businessEmail: null, businessPhone: profile.phoneNumber, proofUrls,
        message: note.trim() || null});
      setReviewRequestId(response.requestId);
      trackMarketingEvent("claim_flow_submitted", {club_id: organizerId, proof_count: proofUrls.length,
        request_id: response.requestId});
    } catch (cause) {
      setError(readableError(cause));
    }
  }

  function copyCode() {
    if (!attempt) return;
    try {
      void navigator.clipboard?.writeText(attempt.proofText).catch(() => undefined);
    } catch {
      // Copying is best effort; the code stays on screen.
    }
    setCopied(true);
  }

  function chooseAgain() {
    setAttempt(null); setAttemptState(null); setLumaMissing(false); setError(""); setCopied(false);
    setReviewOpen(false);
  }

  function openReview() {
    onStart();
    setAttempt(null); setAttemptState(null); setError(""); setReviewOpen(true);
  }

  const phase: InstantClaimPhase = !claimFirebaseConfigured ? "unavailable" :
    verified ? "done" :
    !account.ready ? "account" :
    options.isPending ? "loading" :
    reviewRequestId ? "requested" :
    attempt ? "code" :
    reviewOpen || (options.isSuccess && !chosen) ? "review" : "choose";

  return {
    account, phase, methods, chosen, attempt, expired, copied, error: error ||
      (options.error ? claimFailure : ""),
    rejection: attemptState?.status === "awaitingProof" ? attemptState.rejection : null,
    lumaMissing, starting: start.isPending, checking: confirm.isPending,
    catchInstagramHandle: options.data?.catchInstagramHandle ?? attempt?.catchInstagramHandle ?? null,
    proofLinks, setProofLinks, note, setNote, requesting: review.isPending,
    setMethod, showCode, checkLuma, copyCode, chooseAgain, openReview, requestReview,
  };
}

const claimFailure = claimVerificationCopy.failed;

export type InstantClaimController = ReturnType<typeof useInstantClaimController>;
