import {activeMarket} from "@content/markets";
import {websiteLeadCopy} from "@content/websiteLead";
import {
  createWebsiteLeadSubmission,
  type WebsiteLeadSubmission,
  type WebsiteLeadSubmissionOptions,
} from "../../shared/api/websiteLead";

/**
 * One lead form's submissions with the site's words for each failure and the
 * active market's dialling code. Make one per form and keep it for the form's
 * life (for example `useState(createSiteLeadSubmission)`), so a retry reuses
 * the request id. Each send carries the site's App Check token.
 */
export function createSiteLeadSubmission(
  overrides: Omit<WebsiteLeadSubmissionOptions, "messages" | "dialCode"> = {},
): WebsiteLeadSubmission {
  return createWebsiteLeadSubmission({messages: websiteLeadCopy.problems, dialCode: activeMarket.dialCode, ...overrides});
}
