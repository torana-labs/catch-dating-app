import type {GuestListConverter} from "../canonical";
import {formNameAliases, formQuestionWords, indianPhoneAliases} from
  "./formQuestions";

/**
 * Google Forms responses, downloaded as CSV from the Responses tab or the
 * linked sheet. The first column is always "Timestamp"; "Email Address"
 * follows when the form collects emails. The other columns are the form's
 * questions, so names and phones are found from the question text.
 */
export const googleFormsConverter: GuestListConverter = {
  id: "google-forms-v1",
  provider: null,
  signature: ["timestamp", "emailaddress"],
  detect: (headers) => {
    if (headers[0] !== "timestamp") return 0;
    return headers[1] === "emailaddress" ? 1 : 0.7;
  },
  aliases: {displayName: formNameAliases, phone: indianPhoneAliases},
  // A form has no booking or ticket id; guests are keyed by phone or email.
  externalReferenceAliases: new Set(["responseid"]),
  questionWords: formQuestionWords,
};
