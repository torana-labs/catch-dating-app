import {type FormEvent, useRef, useState} from "react";
import {activeMarket} from "@content/markets";
import {homePageCopy as copy} from "@content/homePage";
import {interpolateContent as fill} from "@content/interpolate";
import {
  createMarketingEventId,
  getMarketingConsent,
  trackAcceptedMarketingLead,
  trackMarketingEvent,
  waitlistAnalyticsPayload,
} from "../../analytics";
import {launchNoticePhone, launchNoticeRequest, postLaunchNotice} from "./launchNoticeModel";

type LaunchNoticeStatus = {phase: "idle" | "sending" | "joined"; message: string; tone: "" | "is-error" | "is-success"};

/**
 * Owns the launching-soon "Tell me when it opens" form (CAT-260): a WhatsApp
 * number for one message on opening day, and a separate marketing choice that
 * stays off unless the person ticks it (CAT-72). Sending is CAT-16's.
 */
export function useLaunchNoticeController(city: string, submit = postLaunchNotice) {
  const [phone, setPhone] = useState("");
  const [marketing, setMarketing] = useState(false);
  const [status, setStatus] = useState<LaunchNoticeStatus>({phase: "idle", message: "", tone: ""});
  const inFlight = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const e164 = launchNoticePhone(phone, activeMarket.dialCode);
    if (!e164) {
      setStatus({phase: "idle", message: copy.notice.invalidPhone, tone: "is-error"});
      return;
    }
    const eventId = createMarketingEventId("waitlist");
    const consent = getMarketingConsent();
    const body = {...launchNoticeRequest(city, e164, marketing), ...waitlistAnalyticsPayload(eventId, "member")};
    inFlight.current = true;
    setStatus({phase: "sending", message: "", tone: ""});
    trackMarketingEvent("launch_notice_submit_attempt", {city, event_id: eventId});
    try {
      const receipt = await submit(body);
      setStatus({phase: "joined", tone: "is-success",
        message: fill(receipt.alreadyJoined ? copy.notice.alreadyJoined : copy.notice.joined, {city})});
      trackMarketingEvent("launch_notice_submitted", {already_joined: receipt.alreadyJoined, city, event_id: eventId, marketing});
      trackAcceptedMarketingLead(eventId, "member_waitlist", receipt.alreadyJoined, consent);
    } catch (error) {
      setStatus({phase: "idle", tone: "is-error", message: error instanceof Error ? error.message : copy.notice.failed});
      trackMarketingEvent("launch_notice_submit_error", {city, event_id: eventId});
    } finally {
      inFlight.current = false;
    }
  }

  return {
    phone,
    setPhone: (value: string) => {
      setPhone(value);
      if (status.tone === "is-error") setStatus({phase: "idle", message: "", tone: ""});
    },
    marketing,
    setMarketing,
    status,
    sending: status.phase === "sending",
    joined: status.phase === "joined",
    handleSubmit,
  };
}

export type LaunchNoticeController = ReturnType<typeof useLaunchNoticeController>;
