import {type FormEvent, useState} from "react";
import {appLinkCopy} from "@content/appDownload";
import {websiteLeadCopy} from "@content/websiteLead";
import {activePhoneCountry} from "@content/markets";
import {catchPhoneE164} from "@catch/web-ui/phone";
import type {WebsiteLeadForm, WebsiteLeadSubmission} from "../../shared/api/websiteLead";
import {useWebsiteLeadController} from "./useWebsiteLeadController";

/**
 * The lead a "Text me the link" request files: an app_link lead for the host
 * app, the number as typed, the capture's consent version, the page path and
 * the form id as its entry. No name, no city.
 */
export function appLinkLeadRequest(phone: string, sourcePage: string, formId: string = appLinkCopy.formId): WebsiteLeadForm<"app_link"> {
  return {kind: "app_link", phone, consentVersion: appLinkCopy.consentVersion, sourcePage, entry: formId, answers: {app: "host"}};
}

/**
 * Owns one "Text me the link" capture: the number, the line under it when it
 * is not a mobile number, and the send through the site lead client (idle,
 * sending, sent, or failed with words and a retry of the same request). A
 * host app link request is a host lead: the site lead submission records its
 * form events and, under the marketing choice, the host-lead conversion.
 */
export function useAppLinkCaptureController(formId: string = appLinkCopy.formId, submission?: WebsiteLeadSubmission) {
  const lead = useWebsiteLeadController({kind: "app_link", formId}, submission);
  const [phone, setPhone] = useState("");
  const [phoneProblem, setPhoneProblem] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!catchPhoneE164(phone, activePhoneCountry)) {
      setPhoneProblem(websiteLeadCopy.problems.invalid_phone);
      return;
    }
    await lead.send(appLinkLeadRequest(phone, window.location.pathname, formId));
  }

  return {
    phone,
    setPhone: (value: string) => {
      setPhone(value);
      setPhoneProblem(null);
      lead.clearProblem();
    },
    /** The line under the number: one the form found, or one the lead client refused. */
    phoneProblem: phoneProblem ?? lead.phoneProblem,
    submitting: lead.submitting,
    sent: lead.sent,
    sendProblem: lead.sendProblem,
    handleSubmit,
  };
}
