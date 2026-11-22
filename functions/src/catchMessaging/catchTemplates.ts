import type {MetaTemplateSnapshot} from
  "../platform/delivery/organizerWhatsappProvider";
import {BRAND} from "../shared/generated/brand";

// The approved WhatsApp templates Catch's own number sends, by name and
// language. Catch's sender token can send messages but cannot read the
// template list, so each one is described here exactly as Meta approved it
// rather than fetched: the name, the language, and where its one variable
// goes. Both have static buttons (URL or quick reply), so a send carries no
// button parameters. The text is what the Support thread shows for the send;
// WhatsApp itself renders the approved wording.

export type CatchTemplateName = "host_app_link" | "host_lead_follow_up";

export interface CatchTemplate {
  name: CatchTemplateName;
  snapshot: MetaTemplateSnapshot;
  /** The conversation subject when the send starts a Support thread. */
  subject: string;
  /** The message text as the Support thread records it. */
  text: (variables: Record<string, string>) => string;
}

function snapshot(name: CatchTemplateName,
  category: MetaTemplateSnapshot["category"], variableNames: string[],
  buttonKinds: MetaTemplateSnapshot["buttonKinds"],
  buttonLabels: string[]): MetaTemplateSnapshot {
  return {
    providerTemplateId: `catch-static-${name}`,
    name,
    language: "en",
    category,
    status: "APPROVED",
    variableNames,
    parameterBindings: variableNames.map((variableName, index) => ({
      variableName, component: "body" as const, position: index + 1,
      buttonIndex: null})),
    hasMediaHeader: false,
    buttonKinds,
    buttonLabels,
    parameterFormat: "POSITIONAL",
  };
}

const hostApp = BRAND.stores.hostAppName;

export const CATCH_TEMPLATES: Readonly<Record<CatchTemplateName,
  CatchTemplate>> = Object.freeze({
    host_app_link: {
      name: "host_app_link",
      snapshot: snapshot("host_app_link", "UTILITY", [], ["URL", "URL"],
        ["iPhone", "Android"]),
      subject: `${hostApp} app link`,
      text: () => `Here's the ${hostApp} link you asked for. Tap below to ` +
        "download it, then reply here if you'd like help setting up your " +
        "first event. [Buttons: iPhone, Android]",
    },
    host_lead_follow_up: {
      name: "host_lead_follow_up",
      snapshot: snapshot("host_lead_follow_up", "MARKETING", ["first_name"],
        ["QUICK_REPLY", "QUICK_REPLY"], ["Book a walkthrough", "Not now"]),
      subject: `${hostApp} follow-up`,
      text: (variables) => `Hi ${variables.first_name}, thanks for asking ` +
        `about ${hostApp}, and sorry we missed you. Would a 15-minute ` +
        "walkthrough help? Reply with a time that suits you. " +
        "[Buttons: Book a walkthrough, Not now]",
    },
  });

const FIRST_NAME_LIMIT = 40;

/**
 * The follow-up's {{1}}: the first word of the lead's name, or "there".
 * Punctuation at either end is dropped ("Asha," reads "Asha"), and a word
 * with no letter in it is not a name.
 * @param {unknown} fullName The name the lead typed.
 * @return {string} A first name, or "there".
 */
export function leadFirstName(fullName: unknown): string {
  if (typeof fullName !== "string") return "there";
  const first = fullName.replace(/[\p{Cc}]/gu, " ").trim().split(/\s+/u)[0] ??
    "";
  const word = first.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
  if (!/\p{L}/u.test(word)) return "there";
  return [...word].slice(0, FIRST_NAME_LIMIT).join("");
}
