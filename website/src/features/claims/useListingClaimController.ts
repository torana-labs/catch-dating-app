import {websiteCopy} from "@content/generated";
import {organizerListingCopy} from "@content/organizer";
import {type FormEvent, useRef, useState} from "react";
import {trackMarketingEvent} from "../../analytics";
import {claimFirebaseConfigured} from "../../firebaseConfig";
import type {FormStatus} from "../../shared/forms/types";
import {usePendingRequestRegistration} from "../../shared/pendingRequest";
import {organizerPolicyForListing} from "../organizers/organizerPolicy";
import {listingClaimPresentationFor} from "../organizers/listingPresentation";
import type {HostListing} from "../organizers/types";
import {
  claimContactValidationMessage,
  nullableString,
  parseProofUrls,
  type ClaimRole,
} from "./claimModel";
import {
  useClaimAuthController,
  useClaimRequestMutation,
} from "./useClaimRequestMutation";

export function useListingClaimController(listing: HostListing) {
  const policy = organizerPolicyForListing(listing);
  const publicApiEnabled = policy.canRequestClaim;
  const presentation = listingClaimPresentationFor({
    canRequestClaim: policy.canRequestClaim,
    isPubliclyReadable: policy.isPubliclyReadable,
    runtimeAvailable: claimFirebaseConfigured,
  });
  const [status, setStatus] = useState<FormStatus>({
    message: "",
    tone: "",
  });

  const claimRequestMutation = useClaimRequestMutation(listing.id);
  const submissionInFlight = useRef<Promise<unknown> | null>(null);
  usePendingRequestRegistration(claimRequestMutation.isPending);
  const {
    authReady,
    handleSignIn: handleAuthSignIn,
    handleSignOut: handleAuthSignOut,
    isSigningIn,
    user,
  } = useClaimAuthController({
    eventPrefix: "listing_claim",
    listingId: listing.id,
    setStatus,
  });

  async function handleSignIn() {
    if (submissionInFlight.current) return;
    await handleAuthSignIn();
  }

  async function handleSignOut() {
    if (submissionInFlight.current) return;
    await handleAuthSignOut();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionInFlight.current) return;
    if (!publicApiEnabled) {
      setStatus({
        message: policy.claimRequestReason,
        tone: "is-error",
      });
      return;
    }
    if (!claimFirebaseConfigured) {
      setStatus({
        message: organizerListingCopy.claims.runtimeUnavailable,
        tone: "is-error",
      });
      return;
    }
    if (!user) {
      setStatus({
        message: websiteCopy["uselistingclaimcontroller_0107"],
        tone: "is-error",
      });
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const requesterName = String(formData.get("requesterName") || "").trim();
    const requesterRole = String(formData.get("requesterRole") || "") as
      ClaimRole;
    const businessEmail = nullableString(formData.get("businessEmail"));
    const businessPhone = nullableString(formData.get("businessPhone"));
    const proofUrls = parseProofUrls(formData.get("proofUrls"));
    const message = nullableString(formData.get("message"));

    const validationMessage = claimContactValidationMessage({
      businessEmail,
      businessPhone,
      parsedProofUrls: proofUrls,
      requesterName,
      requesterRole,
    });
    if (validationMessage) {
      setStatus({message: validationMessage, tone: "is-error"});
      return;
    }

    setStatus({message: "", tone: ""});
    trackMarketingEvent("listing_claim_submit_attempt", {
      club_id: listing.id,
      claim_role: requesterRole,
      proof_count: proofUrls.length,
    });

    const request = claimRequestMutation.mutateAsync({
      organizerId: listing.id,
      requesterName,
      requesterRole,
      businessEmail,
      businessPhone,
      proofUrls,
      message,
    });
    submissionInFlight.current = request;
    try {
      await request;
      form.reset();
      setStatus({
        message: websiteCopy["uselistingclaimcontroller_0106"],
        tone: "is-success",
      });
      trackMarketingEvent("listing_claim_submitted", {
        club_id: listing.id,
        claim_role: requesterRole,
        proof_count: proofUrls.length,
      });
    } catch (error) {
      setStatus({
        message:
          error instanceof Error ?
            error.message :
            "We could not submit this claim request. Please try again.",
        tone: "is-error",
      });
      trackMarketingEvent("listing_claim_submit_error", {
        club_id: listing.id,
      });
    } finally {
      if (submissionInFlight.current === request) {
        submissionInFlight.current = null;
      }
    }
  }

  return {
    authReady,
    handleSignIn,
    handleSignOut,
    handleSubmit,
    isConfigured: claimFirebaseConfigured && publicApiEnabled,
    notConfiguredReason: publicApiEnabled ?
      organizerListingCopy.claims.runtimeUnavailable :
      policy.claimRequestReason,
    publicApiEnabled,
    presentation,
    isSigningIn,
    isSubmitting: claimRequestMutation.isPending,
    status,
    user,
  };
}
