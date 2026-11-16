import {cityAlertsCopy as copy} from "@content/discovery/cityAlerts";
import {activeMarket} from "@content/markets";
import {type FormEvent, useRef, useState} from "react";
import {trackMarketingEvent} from "../../analytics";
import {launchNoticePhone} from "../home/launchNoticeModel";
import {
  cityAlertRequest,
  cityAlertRequestId,
  postCityAlert,
  type CityAlertInterest,
  type CityAlertPlace,
  type CityAlertReceipt,
} from "./cityAlertsModel";
import type {JoinWaitlistHTTPRequest} from "../../shared/api/joinWaitlistContract";

type Phase = "idle" | "sending" | "sent";

/**
 * Owns one "Get new plans in {city} on WhatsApp" form: the number, the
 * request id that makes a retry the same lead, and the sending and sent
 * states. Sending is the lead intake's; this only builds and posts the
 * city_alerts request.
 */
export function useCityAlertsController(place: CityAlertPlace, interests: readonly CityAlertInterest[],
  submit: (body: JoinWaitlistHTTPRequest) => Promise<CityAlertReceipt> = postCityAlert) {
  const [phone, setPhone] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  // One id per number: a retry of the same number is the same lead; a new number is a new one.
  const requestId = useRef<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const e164 = launchNoticePhone(phone, activeMarket.dialCode);
    if (!e164) {
      setError(copy.invalidPhone);
      return;
    }
    requestId.current ??= cityAlertRequestId();
    inFlight.current = true;
    setPhase("sending");
    setError(null);
    const analytics = {city: place.citySlug, entry: place.entry, interests: interests.join(",")};
    trackMarketingEvent("city_alerts_submit_attempt", analytics);
    try {
      await submit(cityAlertRequest(place, e164, requestId.current, interests));
      setPhase("sent");
      trackMarketingEvent("city_alerts_submitted", analytics);
    } catch (failure) {
      setPhase("idle");
      setError(failure instanceof Error && failure.message ? failure.message : copy.failed);
      trackMarketingEvent("city_alerts_submit_error", analytics);
    } finally {
      inFlight.current = false;
    }
  }

  return {
    phone,
    setPhone: (value: string) => {
      setPhone(value);
      requestId.current = null;
      if (error) setError(null);
    },
    error,
    sending: phase === "sending",
    sent: phase === "sent",
    handleSubmit,
  };
}

export type CityAlertsController = ReturnType<typeof useCityAlertsController>;
