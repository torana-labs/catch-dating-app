import {useRef, useState} from "react";
import type {WebsiteLeadForm, WebsiteLeadProblem, WebsiteLeadSubmission} from "../../shared/api/websiteLead";
import {createSiteLeadSubmission} from "./websiteLead";

type LeadPhase = "idle" | "submitting" | "sent" | "failed";
type LeadState = {phase: LeadPhase; problem: WebsiteLeadProblem | null; message: string};
const idle: LeadState = {phase: "idle", problem: null, message: ""};

/**
 * One website lead form's send: idle, submitting, sent, or failed with the
 * lead client's problem and its words. The submission is made once for the
 * form's life, so sending the same answers again after a failure reuses the
 * request id and is the same lead; changed answers are a new one. The
 * homepage's forms and the playbook pages' forms share it.
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
