import {type FormEvent, useRef, useState} from "react";
import {activeMarket} from "@content/markets";
import {homePageCopy as copy} from "@content/homePage";
import {
  createMarketingEventId,
  getMarketingConsent,
  trackAcceptedMarketingLead,
  trackMarketingEvent,
  waitlistAnalyticsPayload,
} from "../../analytics";
import {appNoticeRequest, launchNoticePhone, postLaunchNotice, type LaunchNoticePlace} from "./launchNoticeModel";

type AppNoticeStatus = {phase: "idle" | "sending" | "joined"; message: string; tone: "" | "is-error" | "is-success"};

/**
 * Owns the guest app's "Get notified" form (leak 2): a WhatsApp number for
 * one message when the app is on the stores, and a separate new-plans choice
 * that stays off unless the person ticks it. Nothing is sent from here.
 */
export function useAppNoticeController(city: string, submit = postLaunchNotice, place?: LaunchNoticePlace) {
  const [phone, setPhone] = useState("");
  const [newPlans, setNewPlans] = useState(false);
  const [status, setStatus] = useState<AppNoticeStatus>({phase: "idle", message: "", tone: ""});
  const inFlight = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const e164 = launchNoticePhone(phone, activeMarket.dialCode);
    if (!e164) {
      setStatus({phase: "idle", message: copy.app.notify.invalidPhone, tone: "is-error"});
      return;
    }
    const eventId = createMarketingEventId("waitlist");
    const consent = getMarketingConsent();
    const body = {...appNoticeRequest(city, e164, newPlans, place), ...waitlistAnalyticsPayload(eventId, "member")};
    inFlight.current = true;
    setStatus({phase: "sending", message: "", tone: ""});
    trackMarketingEvent("app_notice_submit_attempt", {city, event_id: eventId});
    try {
      const receipt = await submit(body);
      setStatus({phase: "joined", tone: "is-success", message: receipt.alreadyJoined ? copy.app.notify.alreadyJoined : copy.app.notify.joined});
      trackMarketingEvent("app_notice_submitted", {already_joined: receipt.alreadyJoined, city, event_id: eventId, new_plans: newPlans});
      trackAcceptedMarketingLead(eventId, "member_waitlist", receipt.alreadyJoined, consent);
    } catch (error) {
      setStatus({phase: "idle", tone: "is-error", message: error instanceof Error ? error.message : copy.app.notify.failed});
      trackMarketingEvent("app_notice_submit_error", {city, event_id: eventId});
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
    newPlans,
    setNewPlans,
    status,
    sending: status.phase === "sending",
    joined: status.phase === "joined",
    handleSubmit,
  };
}
