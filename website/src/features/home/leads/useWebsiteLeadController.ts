import {useRef, useState} from "react";
import {websiteCities} from "@content/markets";
import type {WebsiteLeadForm, WebsiteLeadProblem, WebsiteLeadSubmission} from "../../../shared/api/websiteLead";
import {createSiteLeadSubmission} from "../../marketing/websiteLead";
import type {CitySource} from "../cityChoice";

/** The city a homepage lead is for: the page's city, and how the site reached it. */
export interface HomeLeadCity {
  readonly label: string;
  readonly slug: string;
  readonly source?: CitySource;
}

/**
 * The lead's city fields: the label as shown, and for a catalog city its id
 * and country and how the site reached it, so the intake counts the city.
 */
export function homeLeadCityFields(city: HomeLeadCity) {
  const listed = websiteCities.find((item) => item.slug === city.slug);
  return {
    city: city.label,
    ...(listed ? {cityId: listed.id, countryIsoCode: listed.countryIsoCode, ...(city.source ? {citySource: city.source} : {})} : {}),
  };
}

type LeadPhase = "idle" | "submitting" | "sent" | "failed";
type LeadState = {phase: LeadPhase; problem: WebsiteLeadProblem | null; message: string};
const idle: LeadState = {phase: "idle", problem: null, message: ""};

/**
 * One homepage lead form's send: idle, submitting, sent, or failed with the
 * lead client's problem and its words. The submission is made once for the
 * form's life, so sending the same answers again after a failure reuses the
 * request id and is the same lead; changed answers are a new one.
 */
export function useWebsiteLeadController(submission?: WebsiteLeadSubmission) {
  const [lead] = useState(() => submission ?? createSiteLeadSubmission());
  const [state, setState] = useState<LeadState>(idle);
  const inFlight = useRef(false);

  async function send(form: WebsiteLeadForm) {
    if (inFlight.current) return;
    inFlight.current = true;
    setState({phase: "submitting", problem: null, message: ""});
    try {
      const outcome = await lead.submit(form);
      setState(outcome.status === "sent" ? {phase: "sent", problem: null, message: ""} :
        {phase: "failed", problem: outcome.status, message: outcome.message});
    } finally {
      inFlight.current = false;
    }
  }

  const failed = state.phase === "failed";
  return {
    send,
    /** Clears a shown failure, as when the person edits an answer. */
    clearProblem: () => {
      if (failed) setState(idle);
    },
    submitting: state.phase === "submitting",
    sent: state.phase === "sent",
    /** The number was not a mobile number; nothing was sent. */
    phoneProblem: failed && state.problem === "invalid_phone" ? state.message : null,
    /** A send that did not go through: its words, and the button offers to try again. */
    sendProblem: failed && state.problem !== "invalid_phone" ? state.message : null,
  };
}
