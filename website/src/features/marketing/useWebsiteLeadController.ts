import {useEffect, useRef, useState} from "react";
import {trackWebsiteLeadFormEvent, type WebsiteLeadFormIdentity} from "../../analytics";
import type {WebsiteLeadForm, WebsiteLeadProblem, WebsiteLeadSubmission} from "../../shared/api/websiteLead";
import {createSiteLeadSubmission} from "./websiteLead";

type LeadPhase = "idle" | "submitting" | "sent" | "failed";
type LeadState = {phase: LeadPhase; problem: WebsiteLeadProblem | null; message: string};
const idle: LeadState = {phase: "idle", problem: null, message: ""};

/**
 * Records, once per form and after analytics consent, that a website lead
 * form was shown: its lead kind and form id (the lead's entry), never an
 * answer. The site lead submission records the rest of the form's events.
 * Forms that keep their own send state (the discovery pages' city alerts)
 * call it directly.
 */
export function useLeadFormViewed({kind, formId}: WebsiteLeadFormIdentity) {
  const recorded = useRef<string | null>(null);
  useEffect(() => {
    const key = `${kind}:${formId}`;
    if (recorded.current === key) return;
    recorded.current = key;
    trackWebsiteLeadFormEvent("viewed", {kind, formId});
  }, [kind, formId]);
}

/**
 * One website lead form's send: idle, submitting, sent, or failed with the
 * lead client's problem and its words. The submission is made once for the
 * form's life, so sending the same answers again after a failure reuses the
 * request id and is the same lead; changed answers are a new one. `identity`
 * names the form for its viewed event. The homepage's forms and the playbook
 * pages' forms share it.
 */
export function useWebsiteLeadController(identity: WebsiteLeadFormIdentity, submission?: WebsiteLeadSubmission) {
  useLeadFormViewed(identity);
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
