import {type FormEvent, useRef, useState} from "react";
import {trackMarketingEvent} from "../../analytics";
import type {WebsiteLeadSubmission} from "../../shared/api/websiteLead";
import {useLeadFormViewed} from "../marketing/useWebsiteLeadController";
import {createSiteLeadSubmission} from "../marketing/websiteLead";
import {cityAlertForm, type CityAlertInterest, type CityAlertPlace} from "./cityAlertsModel";

type Phase = "idle" | "sending" | "sent";

/**
 * Owns one "Get new plans in {city} on WhatsApp" form: the number, the
 * sending and sent states, and the lead client's words for a failure. The
 * submission lives as long as the form, so a retry of the same number is the
 * same lead; every send carries the site's App Check token. The form's
 * viewed event names its kind and entry; the site lead submission records
 * the rest of its lead form events.
 */
export function useCityAlertsController(place: CityAlertPlace, interests: readonly CityAlertInterest[],
  makeSubmission: () => WebsiteLeadSubmission = createSiteLeadSubmission) {
  useLeadFormViewed({kind: "city_alerts", formId: place.entry});
  const [submission] = useState(makeSubmission);
  const [phone, setPhone] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setPhase("sending");
    setError(null);
    const analytics = {city: place.citySlug, entry: place.entry, interests: interests.join(",")};
    trackMarketingEvent("city_alerts_submit_attempt", analytics);
    const outcome = await submission.submit(cityAlertForm(place, phone, interests));
    inFlight.current = false;
    if (outcome.status === "sent") {
      setPhase("sent");
      trackMarketingEvent("city_alerts_submitted", analytics);
      return;
    }
    setPhase("idle");
    setError(outcome.message);
    trackMarketingEvent("city_alerts_submit_error", {...analytics, problem: outcome.status});
  }

  return {
    phone,
    setPhone: (value: string) => {
      setPhone(value);
      if (error) setError(null);
    },
    error,
    sending: phase === "sending",
    sent: phase === "sent",
    handleSubmit,
  };
}

export type CityAlertsController = ReturnType<typeof useCityAlertsController>;
