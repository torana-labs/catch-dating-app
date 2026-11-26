import {useMutation} from "@tanstack/react-query";
import {useEffect, useId, useMemo, useRef, useState} from "react";
import {accountCopy} from "../../content/account";
import {organizerPageCopy} from "../../content/organizerPage";
import {trackMarketingEvent} from "../../analytics";
import {setWebsiteOrganizerFollow} from "../../firebase";
import {publicReviewsFirebaseConfigured} from "../../firebaseConfig";
import {useWebsiteAccountController} from "../account/useWebsiteAccountController";
import {observeOrganizerPageView, trackOrganizerAnalytics, trackOrganizerLinkClick} from "./analytics";
import {observeOrganizerProviders} from "./observeOrganizerProviders";
import type {OrganizerPageRecord} from "./organizerPage";
import {organizerPageView, type OrganizerEventView, type OrganizerLinkView} from "./organizerPageView";
import type {HostListing} from "./types";
import {catchPhoneDisplay, catchPhoneE164} from "@catch/web-ui/phone";
import {activePhoneCountry} from "@content/markets";

/** A sent phone code: confirming it signs in (or links) that verified phone. */
export interface PhoneCodeChallenge {
  confirm: (code: string) => Promise<void>;
  clear: () => void;
}

/**
 * Backends the page calls. Follow by phone (CAT-253) is live: the website's
 * phone-code sign-in, then followOrganizerByPhone with the follower's own
 * WhatsApp tick. Reviews from anyone (CAT-169) post through
 * createPublicOrganizerReview, which stores them unverified; the reply says
 * whether the review is up or waiting for moderation.
 */
export interface OrganizerPageBackends {
  followByPhone: null | {
    sendCode: (input: {phoneNumber: string; recaptchaId: string}) => Promise<PhoneCodeChallenge>;
    follow: (input: {organizerId: string; requestId: string; whatsappUpdates: boolean}) => Promise<void>;
  };
  submitReview: null | ((input: PublicReviewInput) => Promise<PublicReviewOutcome>);
}

export interface PublicReviewInput {
  organizerId: string;
  rating: number;
  comment: string;
  reviewerName: string;
  /** The page the review was written on; the server checks it is the organiser's canonical page. */
  submittedFromPath: string;
}

/** A posted review is up at once, or held for moderation first. */
export type PublicReviewOutcome = "published" | "pending";

/** The callable's comment limit (create_public_organizer_review_payload). */
export const reviewCommentMaxLength = 1000;

/** The reviewed copy version the WhatsApp tick shows (follower-whatsapp-v1). */
export const followerWhatsappTermsVersion = "follower-whatsapp-v1";

export const organizerPageBackends: OrganizerPageBackends = {
  followByPhone: {
    sendCode: async ({phoneNumber, recaptchaId}) => {
      const {beginWebsiteAccountPhoneVerification} = await import("../../firebase");
      const challenge = await beginWebsiteAccountPhoneVerification(phoneNumber, recaptchaId);
      return {confirm: async (code) => {await challenge.confirm(code);}, clear: () => challenge.clear()};
    },
    follow: async ({organizerId, requestId, whatsappUpdates}) => {
      const {followWebsiteOrganizerByPhone} = await import("../../firebase");
      await followWebsiteOrganizerByPhone({organizerId, requestId, whatsappUpdates,
        ...(whatsappUpdates ? {termsVersion: followerWhatsappTermsVersion} : {})});
    },
  },
  submitReview: publicReviewsFirebaseConfigured ? async (input) => {
    const {createPublicOrganizerReview} = await import("../../firebase");
    const {review} = await createPublicOrganizerReview({...input, isAnonymous: false});
    return review.moderationStatus === "published" ? "published" : "pending";
  } : null,
};

const newRequestId = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`)
  .replace(/[^A-Za-z0-9_-]/gu, "").slice(0, 100);

/**
 * Who is looking. The owner view (CAT-257) adds "owner"; until then every
 * visitor, signed in or not, sees the public page.
 */
export type OrganizerPageRole = "guest";

type FollowStep = "phone" | "code" | "done";

export function useOrganizerPageController({backends = organizerPageBackends, listing, page, readAt}: {
  backends?: OrganizerPageBackends;
  listing: HostListing;
  page: OrganizerPageRecord;
  readAt: number;
}) {
  const view = useMemo(() => organizerPageView(page, readAt), [page, readAt]);
  const role: OrganizerPageRole = "guest";
  const copy = organizerPageCopy;

  // Account follow: today's follow, kept until follow by phone (CAT-253) replaces it.
  const account = useWebsiteAccountController({organizerId: listing.id});
  const [accountFollowRequested, setAccountFollowRequested] = useState(false);
  const [followError, setFollowError] = useState("");
  const followBusy = useRef(false);
  const current = useRef({uid: account.uid, id: listing.id});
  current.current = {uid: account.uid, id: listing.id};
  const followMutation = useMutation({retry: false, gcTime: 0,
    mutationFn: (following: boolean) => setWebsiteOrganizerFollow(listing.id, following, account.uid!)});
  const accountFollowing = account.account?.following === true;

  // Follow by phone (CAT-253): number and the WhatsApp tick, then the code.
  const recaptchaId = `follow-${useId().replace(/:/gu, "")}`;
  const [followStep, setFollowStep] = useState<FollowStep | null>(null);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [whatsappUpdates, setWhatsappUpdates] = useState(false);
  const challenge = useRef<PhoneCodeChallenge | null>(null);
  const followRequestId = useRef(newRequestId());
  useEffect(() => () => {challenge.current?.clear(); challenge.current = null;}, []);
  const phoneMutation = useMutation({retry: false, gcTime: 0, mutationFn: (step: () => Promise<void>) => step()});

  // Share and QR.
  const [shareOpen, setShareOpen] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  // Review form (CAT-169).
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewStars, setReviewStars] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewName, setReviewName] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [reviewDone, setReviewDone] = useState<PublicReviewOutcome | null>(null);
  const reviewMutation = useMutation({retry: false, gcTime: 0,
    mutationFn: (post: () => Promise<PublicReviewOutcome>) => post()});

  const previousUid = useRef(account.uid);
  useEffect(() => {
    if (previousUid.current && previousUid.current !== account.uid) setAccountFollowRequested(false);
    previousUid.current = account.uid;
    setFollowError("");
  }, [account.uid]);

  useEffect(() => {
    setAccountFollowRequested(false); setFollowError(""); setFollowStep(null); setPhone(""); setCode("");
    setWhatsappUpdates(false); challenge.current?.clear(); challenge.current = null;
    followRequestId.current = newRequestId();
    setShareOpen(false); setCopyState("idle");
    setReviewOpen(false); setReviewStars(0); setReviewText(""); setReviewName(""); setReviewError(""); setReviewDone(null);
  }, [listing.id]);

  useEffect(() => observeOrganizerPageView(listing, "listingView", "listing_page"), [listing]);
  const tracking = page.tracking;
  useEffect(() => observeOrganizerProviders(listing, null, {tracking}), [listing, tracking]);

  async function changeAccountFollow(following: boolean) {
    if (followBusy.current) return;
    const identity = current.current;
    followBusy.current = true;
    setAccountFollowRequested(false); setFollowError("");
    try {
      await followMutation.mutateAsync(following);
      if (current.current.uid !== identity.uid || current.current.id !== identity.id) return;
      await account.refresh();
      if (following) trackOrganizerAnalytics(listing, "organizerSave", "organizer_page");
    } catch {
      if (current.current.uid === identity.uid && current.current.id === identity.id) setFollowError(accountCopy.followFailed);
    } finally {followBusy.current = false;}
  }
  useEffect(() => {
    if (accountFollowRequested && account.ready) void changeAccountFollow(true);
  }, [accountFollowRequested, account.ready]);

  // A signed-out visitor follows with just a phone number; a signed-in one
  // keeps following through their account, as before.
  const phoneFollow = account.uid === null || followStep !== null ? backends.followByPhone : null;
  function pressFollow() {
    if (phoneFollow && !accountFollowing) {
      setFollowError("");
      setFollowStep((step) => (step === null ? "phone" : step === "done" ? "done" : null));
      return;
    }
    if (account.ready) void changeAccountFollow(!accountFollowing);
    else setAccountFollowRequested((requested) => !requested);
  }

  async function sendCode() {
    const e164 = catchPhoneE164(phone, activePhoneCountry);
    if (!e164) {setFollowError(copy.followSheet.invalidPhone); return;}
    if (!phoneFollow || phoneMutation.isPending) return;
    setFollowError("");
    try {
      await phoneMutation.mutateAsync(async () => {
        challenge.current?.clear();
        challenge.current = await phoneFollow.sendCode({phoneNumber: e164, recaptchaId});
      });
      setCode(""); setFollowStep("code");
    } catch {setFollowError(copy.followSheet.failed);}
  }

  async function confirmCode() {
    if (!/^\d{6}$/u.test(code.trim())) {setFollowError(copy.followSheet.invalidCode); return;}
    if (!phoneFollow || phoneMutation.isPending) return;
    setFollowError("");
    try {
      await phoneMutation.mutateAsync(async () => {
        if (!challenge.current) throw new Error("expired");
        await challenge.current.confirm(code.trim());
        challenge.current.clear(); challenge.current = null;
        await phoneFollow.follow({organizerId: listing.id, requestId: followRequestId.current, whatsappUpdates});
      });
      followRequestId.current = newRequestId();
      setFollowStep("done");
      trackOrganizerAnalytics(listing, "organizerSave", "organizer_page");
    } catch {setFollowError(copy.followSheet.failed);}
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(view.shareUrl);
      setCopyState("copied");
      trackMarketingEvent("listing_share_completed", {club_id: listing.id, method: "clipboard"});
    } catch {
      setCopyState("failed");
      trackMarketingEvent("listing_share_error", {club_id: listing.id, aborted: false});
    }
  }

  async function submitReview() {
    const submit = backends.submitReview;
    if (!reviewStars) {setReviewError(copy.reviewForm.noStars); return;}
    if (reviewText.trim().length < 20) {setReviewError(copy.reviewForm.tooShort); return;}
    if (reviewText.trim().length > reviewCommentMaxLength) {setReviewError(copy.reviewForm.tooLong); return;}
    if (!reviewName.trim()) {setReviewError(copy.reviewForm.noName); return;}
    if (!submit || reviewMutation.isPending) return;
    setReviewError("");
    try {
      const outcome = await reviewMutation.mutateAsync(() => submit({organizerId: listing.id, rating: reviewStars,
        comment: reviewText.trim(), reviewerName: reviewName.trim(), submittedFromPath: page.path}));
      setReviewDone(outcome);
    } catch {setReviewError(copy.reviewForm.failed);}
  }

  const phoneE164 = catchPhoneE164(phone, activePhoneCountry);
  const phoneShown = phoneE164 ? catchPhoneDisplay(phoneE164) : "";
  return {
    role,
    view,
    follow: {
      following: followStep === "done" || accountFollowing,
      /** Follow by phone is live (CAT-253): the page says a phone number is all it takes. */
      byPhone: phoneFollow !== null,
      pending: followMutation.isPending || (accountFollowRequested && account.loading),
      press: pressFollow,
      error: followError,
      /** Today's account follow form, shown after a press until the account is ready. */
      account: phoneFollow || !accountFollowRequested ? null : account,
      phone: phoneFollow && followStep ? {
        step: followStep,
        number: phone,
        setNumber: (value: string) => {setPhone(value); setFollowError("");},
        shown: phoneShown,
        code,
        setCode: (value: string) => {setCode(value.replace(/\D/gu, "").slice(0, 6)); setFollowError("");},
        recaptchaId,
        /** The explicit WhatsApp tick; unticked until the follower ticks it. */
        whatsapp: whatsappUpdates,
        setWhatsapp: (value: boolean) => {setWhatsappUpdates(value); setFollowError("");},
        pending: phoneMutation.isPending,
        sendCode: () => void sendCode(),
        confirm: () => void confirmCode(),
      } : null,
    },
    share: {
      open: shareOpen,
      toggle: () => {setShareOpen((open) => !open); setCopyState("idle");},
      url: view.shareUrl,
      displayUrl: view.shareUrl.replace(/^https:\/\//u, "").replace(/\/$/u, ""),
      copy: () => void copyLink(),
      copyState,
    },
    review: backends.submitReview && view.reviews.writable ? {
      open: reviewOpen,
      toggle: () => setReviewOpen((open) => !open),
      stars: reviewStars,
      setStars: (value: number) => {setReviewStars(value); setReviewError("");},
      text: reviewText,
      setText: (value: string) => {setReviewText(value); setReviewError("");},
      name: reviewName,
      setName: (value: string) => {setReviewName(value); setReviewError("");},
      error: reviewError,
      pending: reviewMutation.isPending,
      /** Set once posted: up at once, or waiting for moderation. */
      done: reviewDone,
      submit: () => void submitReview(),
    } : null,
    openLink: ({analytics}: OrganizerLinkView) => analytics.eventName === "linkClick" ?
      trackOrganizerLinkClick(listing, analytics.linkId, analytics.source) :
      trackOrganizerAnalytics(listing, analytics.eventName, analytics.source),
    openEvent: (event: OrganizerEventView) => trackOrganizerAnalytics(listing, "outboundClick",
      event.source === "external" ? "external_event_booking" : "catch_event_card", event.eventId),
    openClaim: () => trackOrganizerAnalytics(listing, "claimClick", "claim_unlocks_panel"),
  };
}

export type OrganizerPageController = ReturnType<typeof useOrganizerPageController>;
