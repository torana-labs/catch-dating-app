import {websiteLeadCopy} from "@content/websiteLead";
import {getMarketingConsent, trackHostLeadAccepted, trackWebsiteLeadFormEvent} from "../../analytics";
import {
  createWebsiteLeadSubmission,
  type WebsiteLeadSubmission,
  type WebsiteLeadSubmissionOptions,
} from "../../shared/api/websiteLead";
import {catchPhoneE164} from "@catch/web-ui/phone";
import {activePhoneCountry} from "@content/markets";

/**
 * One lead form's submissions with the site's words for each failure and the
 * active market's dialling code. Make one per form and keep it for the form's
 * life (for example `useState(createSiteLeadSubmission)`), so a retry reuses
 * the request id. Each send carries the site's App Check token (and a
 * referral the signed-in referrer's ID token), and records the lead form
 * events after analytics consent: submitted, then succeeded or failed with
 * the lead client's problem, each naming only the lead kind, the form id
 * (the lead's entry) and the page. An accepted host enquiry also reaches the
 * Google and Meta tags under the marketing choice the send started with
 * (`trackHostLeadAccepted`), with the number just typed for ad matching.
 */
export function createSiteLeadSubmission(
  overrides: Omit<WebsiteLeadSubmissionOptions, "messages" | "phoneCountry"> = {},
): WebsiteLeadSubmission {
  const lead = createWebsiteLeadSubmission({messages: websiteLeadCopy.problems, phoneCountry: activePhoneCountry, ...overrides});
  return {
    reset: () => lead.reset(),
    async submit(form) {
      const identity = {kind: form.kind, formId: form.entry};
      const submissionConsent = getMarketingConsent();
      trackWebsiteLeadFormEvent("submitted", identity);
      const outcome = await lead.submit(form);
      if (outcome.status === "sent") {
        trackWebsiteLeadFormEvent("succeeded", identity);
        trackHostLeadAccepted({kind: form.kind, leadId: outcome.leadId,
          phone: catchPhoneE164(form.phone, activePhoneCountry)}, submissionConsent);
      } else trackWebsiteLeadFormEvent("failed", identity, outcome.status);
      return outcome;
    },
  };
}
