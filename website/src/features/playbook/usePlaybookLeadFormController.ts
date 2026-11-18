import {type FormEvent, useState} from "react";
import {playbookCopy} from "../../content/playbook/playbookCopy";
import type {PlaybookLeadForm} from "../../content/playbook/playbookContract.ts";
import type {WebsiteLeadSubmission} from "../../shared/api/websiteLead";
import {useWebsiteLeadController} from "../marketing/useWebsiteLeadController";
import {
  playbookLeadProblems,
  playbookLeadRequest,
  type PlaybookLeadAnswers,
  type PlaybookLeadField,
  type PlaybookSendableLeadKind,
} from "./playbookLeadModel";

type FieldKey = PlaybookLeadField | "phone";

/**
 * Owns one playbook page's lead form: its answers, the line under any field
 * it cannot send yet, and the send through the site lead client (idle,
 * sending, sent, or failed with words and a retry). The submission lives as
 * long as the form, so a retry of the same answers is the same lead; changed
 * answers are a new one. Staff answer on WhatsApp.
 */
export function usePlaybookLeadFormController(form: PlaybookLeadForm, kind: PlaybookSendableLeadKind, submission?: WebsiteLeadSubmission) {
  const lead = useWebsiteLeadController(submission);
  const [answers, setAnswers] = useState<PlaybookLeadAnswers>({});
  const [problems, setProblems] = useState<Partial<Record<FieldKey, string>>>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = playbookLeadProblems(form, answers);
    setProblems(found);
    if (Object.keys(found).length > 0) return;
    await lead.send(playbookLeadRequest(form, kind, answers, window.location.pathname));
  }

  return {
    answers,
    set: (field: FieldKey) => (value: string) => {
      setAnswers((current) => ({...current, [field]: value}));
      setProblems((current) => {
        if (!(field in current)) return current;
        const next = {...current};
        delete next[field];
        return next;
      });
      lead.clearProblem();
    },
    /** The words under a field the form cannot send yet, or the number the lead client refused. */
    problem: (field: FieldKey): string | null => problems[field] ?? (field === "phone" ? lead.phoneProblem : null),
    submitting: lead.submitting,
    sent: lead.sent,
    sentMessage: playbookCopy.leadForm.sent[kind],
    sendProblem: lead.sendProblem,
    /** The button's words: the page's, or the retry after a send that did not go through. */
    submitLabel: lead.sendProblem ? playbookCopy.leadForm.retry : form.submitLabel,
    handleSubmit,
  };
}
