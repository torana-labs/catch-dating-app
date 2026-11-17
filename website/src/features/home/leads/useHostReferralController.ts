import {type FormEvent, useState} from "react";
import {homePageCopy as copy} from "@content/homePage";
import {interpolateContent as fill} from "@content/interpolate";
import {activeMarket} from "@content/markets";
import {websiteLeadCopy} from "@content/websiteLead";
import {websiteLeadPhone, type WebsiteLeadSubmission} from "../../../shared/api/websiteLead";
import {homeLeadCityFields, useWebsiteLeadController, type HomeLeadCity} from "./useWebsiteLeadController";

export type HostReferralField = "fullName" | "phone" | "hostName" | "hostLink" | "relationship";
type Answers = Record<HostReferralField, string>;

const empty: Answers = {fullName: "", phone: "", hostName: "", hostLink: "", relationship: ""};
const typed = (value: string) => value.trim().replace(/\s+/gu, " ");

/** Each answer the form cannot send, with the words under its field. */
function referralProblems(answers: Answers): Partial<Record<HostReferralField, string>> {
  const problems: Partial<Record<HostReferralField, string>> = {};
  // The intake needs at least two letters of a name.
  if (typed(answers.fullName).length < 2) problems.fullName = copy.refer.required.fullName;
  if (!websiteLeadPhone(answers.phone, activeMarket.dialCode)) problems.phone = websiteLeadCopy.problems.invalid_phone;
  if (!typed(answers.hostName)) problems.hostName = copy.refer.required.hostName;
  if (!typed(answers.hostLink)) problems.hostLink = copy.refer.required.hostLink;
  if (!typed(answers.relationship)) problems.relationship = copy.refer.required.relationship;
  return problems;
}

/**
 * Owns the "Know a host" form: the person's name and WhatsApp number, and the
 * host's name, their Instagram or website and how the person knows them, sent
 * as a referral lead (staff follow up on WhatsApp). Every field is checked
 * before anything is sent; the page's city goes with it.
 */
export function useHostReferralController(city: HomeLeadCity, submission?: WebsiteLeadSubmission) {
  const lead = useWebsiteLeadController(submission);
  const [answers, setAnswers] = useState<Answers>(empty);
  const [problems, setProblems] = useState<Partial<Record<HostReferralField, string>>>({});
  const [sentHost, setSentHost] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = referralProblems(answers);
    setProblems(found);
    if (Object.keys(found).length > 0) return;
    setSentHost(typed(answers.hostName));
    await lead.send({
      kind: "referral",
      fullName: answers.fullName,
      phone: answers.phone,
      consentVersion: copy.refer.consentVersion,
      sourcePage: window.location.pathname,
      entry: copy.refer.entry,
      answers: {hostName: typed(answers.hostName), hostLink: typed(answers.hostLink), relationship: typed(answers.relationship)},
      ...homeLeadCityFields(city),
    });
  }

  return {
    answers,
    set: (field: HostReferralField) => (value: string) => {
      setAnswers((current) => ({...current, [field]: value}));
      setProblems((current) => {
        if (!(field in current)) return current;
        const next = {...current};
        delete next[field];
        return next;
      });
      lead.clearProblem();
    },
    /** The words under each field the form cannot send yet, or the number the lead client refused. */
    problem: (field: HostReferralField): string | null => problems[field] ?? (field === "phone" ? lead.phoneProblem : null),
    submitting: lead.submitting,
    sent: lead.sent,
    sentMessage: fill(copy.refer.sent, {host: sentHost}),
    sendProblem: lead.sendProblem,
    handleSubmit,
  };
}
