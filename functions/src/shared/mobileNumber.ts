// The server half of the one mobile number check (issue #2144). The website and
// Admin run the same check before they send a number (@catch/web-ui/phone):
// libphonenumber-js's mobile metadata, so a number is valid only when it is a
// mobile number in its country. The contracts' E.164 pattern stays as the
// shape check; this adds the country's own rules.
import {parsePhoneNumberFromString} from "libphonenumber-js/mobile";

/**
 * A submitted number as E.164 when it is a valid mobile number, else null.
 * The website sends E.164; spaces, dashes, dots and brackets are tolerated.
 * @param {unknown} value The submitted number.
 * @return {string | null} The E.164 number, or null.
 */
export function validMobileNumber(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const typed = value.trim().replace(/[\s().-]/gu, "");
  if (!/^\+[1-9][0-9]{7,14}$/u.test(typed)) return null;
  const parsed = parsePhoneNumberFromString(typed);
  return parsed?.isValid() ? parsed.number : null;
}
