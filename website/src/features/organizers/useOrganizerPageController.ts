import {useMutation} from "@tanstack/react-query";
import {useEffect, useId, useMemo, useRef, useState} from "react";
import {accountCopy} from "../../content/account";
import {organizerPageCopy} from "../../content/organizerPage";
import {trackMarketingEvent} from "../../analytics";
import {setWebsiteOrganizerFollow} from "../../firebase";
import {useWebsiteAccountController} from "../account/useWebsiteAccountController";
import {observeOrganizerPageView, trackOrganizerAnalytics, trackOrganizerLinkClick} from "./analytics";
import {observeOrganizerProviders} from "./observeOrganizerProviders";
import type {OrganizerPageRecord} from "./organizerPage";
import {organizerPageView, type OrganizerEventView, type OrganizerLinkView} from "./organizerPageView";
import type {HostListing} from "./types";

/** A sent phone code: confirming it signs in (or links) that verified phone. */
export interface PhoneCodeChallenge {
  confirm: (code: string) => Promise<void>;
  clear: () => void;
}

/**
 * Backends the page calls. Follow by phone (CAT-253) is live: the website's
 * phone-code sign-in, then followOrganizerByPhone with the follower's own
 * WhatsApp tick. Unverified reviews from anyone (CAT-169) stay null, and
 * their UI hidden, until that backend lands.
 */
export interface OrganizerPageBackends {
  followByPhone: null | {
    sendCode: (input: {phoneNumber: string; recaptchaId: string}) => Promise<PhoneCodeChallenge>;
    follow: (input: {organizerId: string; requestId: string; whatsappUpdates: boolean}) => Promise<void>;
  };
  submitReview: null | ((input: {organizerId: string; rating: number; comment: string; reviewerName: string}) => Promise<void>);
}

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
  submitReview: null,
};

const newRequestId = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`)
  .replace(/[^A-Za-z0-9_-]/gu, "").slice(0, 100);

/**
 * Who is looking. The owner view (CAT-257) adds "owner"; until then every
 * visitor, signed in or not, sees the public page.
 */
export type OrganizerPageRole = "guest";

type FollowStep = "phone" | "code" | "done";

const phoneDigits = (raw: string) => {
  const digits = raw.replace(/\D/gu, "");
  const local = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/u.test(local) ? local : "";
};

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
  const [reviewDone, setReviewDone] = useState(false);
  const reviewMutation = useMutation({retry: false, gcTime: 0, mutationFn: (post: () => Promise<void>) => post()});

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
    setReviewOpen(false); setReviewStars(0); setReviewText(""); setReviewName(""); setReviewError(""); setReviewDone(false);
  }, [listing.id]);

  useEffect(() => observeOrganizerPageView(listing, "listingView", "listing_page"), [listing]);
  useEffect(() => observeOrganizerProviders(listing), [listing]);

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
    const local = phoneDigits(phone);
    if (!local) {setFollowError(copy.followSheet.invalidPhone); return;}
    if (!phoneFollow || phoneMutation.isPending) return;
    setFollowError("");
    try {
      await phoneMutation.mutateAsync(async () => {
        challenge.current?.clear();
        challenge.current = await phoneFollow.sendCode({phoneNumber: `+91${local}`, recaptchaId});
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
    if (!reviewName.trim()) {setReviewError(copy.reviewForm.noName); return;}
    if (!submit || reviewMutation.isPending) return;
    setReviewError("");
    try {
      await reviewMutation.mutateAsync(() =>
        submit({organizerId: listing.id, rating: reviewStars, comment: reviewText.trim(), reviewerName: reviewName.trim()}));
      setReviewDone(true);
    } catch {setReviewError(copy.reviewForm.failed);}
  }

  const phoneShown = phoneDigits(phone);
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
        shown: phoneShown ? `+91 ${phoneShown.slice(0, 5)} ${phoneShown.slice(5)}` : "",
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
    review: backends.submitReview ? {
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
