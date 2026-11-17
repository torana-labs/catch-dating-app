import {type FormEvent, useState} from "react";
import {homePageCopy as copy} from "@content/homePage";
import type {WebsiteLeadSubmission} from "../../../shared/api/websiteLead";
import {homeLeadCityFields, useWebsiteLeadController, type HomeLeadCity} from "./useWebsiteLeadController";

/**
 * Owns a thin week's "Want to hear first?" bar: a WhatsApp number for new
 * plans in the page's city, sent as a city alerts lead under its own
 * new-plans consent. The bar has no format chips, so it asks for none.
 */
export function useCityAlertsController(city: HomeLeadCity, submission?: WebsiteLeadSubmission) {
  const lead = useWebsiteLeadController(submission);
  const [phone, setPhone] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await lead.send({
      kind: "city_alerts",
      phone,
      consentVersion: copy.alerts.consentVersion,
      sourcePage: window.location.pathname,
      entry: copy.alerts.entry,
      answers: {interests: []},
      ...homeLeadCityFields(city),
    });
  }

  return {
    phone,
    setPhone: (value: string) => {
      setPhone(value);
      lead.clearProblem();
    },
    submitting: lead.submitting,
    sent: lead.sent,
    phoneProblem: lead.phoneProblem,
    sendProblem: lead.sendProblem,
    handleSubmit,
  };
}
