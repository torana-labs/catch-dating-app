// One check for every mobile number the website and Admin take (issue #2144).
// libphonenumber-js's mobile metadata knows each country's mobile numbers, so a
// number is valid only when it is a mobile number in its country: in India, 10
// digits starting with 6 to 9. Functions run the same check on the server
// (functions/src/shared/phone). WhatsApp offers no lookup that confirms a number
// is on WhatsApp, so the check stops at format and mobile type.
import {
  Metadata,
  getCountries as coreCountries,
  getCountryCallingCode as coreCallingCode,
  isSupportedCountry as coreSupportsCountry,
  parsePhoneNumberFromString as coreParse,
  type CountryCode,
} from "libphonenumber-js/core";
import mobileMetadata from "libphonenumber-js/mobile/metadata";

const parse = (text: string, defaultCountry?: CountryCode) => coreParse(text, {defaultCountry}, mobileMetadata);
const getCountries = () => coreCountries(mobileMetadata);
const getCountryCallingCode = (countryCode: CountryCode) => coreCallingCode(countryCode, mobileMetadata);

/** How many national digits a mobile number has in a country (India: 10). */
function mobileLengths(countryCode: CountryCode): readonly number[] {
  const metadata = new Metadata(mobileMetadata);
  metadata.selectNumberingPlan(countryCode);
  // The typings leave out the numbering plan's per-type lookup, which the
  // runtime has; the plan's general lengths are the fallback.
  const plan = metadata.numberingPlan as unknown as {
    possibleLengths(): number[];
    type(name: "MOBILE"): {possibleLengths(): number[]} | undefined;
  } | undefined;
  return plan?.type("MOBILE")?.possibleLengths() ?? plan?.possibleLengths() ?? [];
}

/** An ISO 3166-1 alpha-2 country code, such as "IN". */
export type CatchPhoneCountryCode = CountryCode;

/** Why a number was refused, so the field can say what is wrong. */
export type CatchPhoneProblem = "empty" | "tooShort" | "tooLong" | "notMobile";

export type CatchPhoneCheck =
  | {readonly status: "valid"; readonly e164: string; readonly countryCode: CatchPhoneCountryCode}
  | {readonly status: "invalid"; readonly problem: CatchPhoneProblem; readonly countryCode: CatchPhoneCountryCode};

export interface CatchPhoneCountry {
  readonly countryCode: CatchPhoneCountryCode;
  /** The country's name in the given locale. */
  readonly name: string;
  /** Its dialling code with the plus, such as "+91". */
  readonly dialCode: string;
}

/** Whether a code names a country with mobile numbers the check knows. */
export function catchPhoneSupportsCountry(countryCode: string): countryCode is CatchPhoneCountryCode {
  return coreSupportsCountry(countryCode as CountryCode, mobileMetadata);
}

/** "00" is how most of the world dials out; treat it as the plus. */
function international(typed: string): string {
  const trimmed = typed.trim();
  return trimmed.startsWith("00") ? `+${trimmed.slice(2)}` : trimmed;
}

/**
 * Check a typed number. A number with a plus (or 00) carries its own country;
 * one without is read in `countryCode`, with the trunk zero people often type
 * dropped. Spaces, dashes, dots and brackets are ignored.
 */
export function catchPhoneCheck(input: string, countryCode: CatchPhoneCountryCode): CatchPhoneCheck {
  const typed = international(input);
  if (!/\d/u.test(typed)) return {status: "invalid", problem: "empty", countryCode};
  const parsed = parse(typed, countryCode);
  const country = parsed?.country ?? countryCode;
  if (parsed?.isValid()) return {status: "valid", e164: parsed.number, countryCode: country};
  // Too short and too long are measured against the country's mobile numbers,
  // not every number it has: eight digits is a valid length for India, but
  // never for an Indian mobile number.
  const lengths = mobileLengths(country);
  const digits = parsed ? parsed.nationalNumber.length : typed.replace(/\D/gu, "").length;
  const problem: CatchPhoneProblem = lengths.length === 0 ? "notMobile" :
    digits < Math.min(...lengths) ? "tooShort" : digits > Math.max(...lengths) ? "tooLong" : "notMobile";
  return {status: "invalid", problem, countryCode: country};
}

/** The number as E.164 ("+919876543210"), or null when it is not a valid mobile number. */
export function catchPhoneE164(input: string, countryCode: CatchPhoneCountryCode): string | null {
  const check = catchPhoneCheck(input, countryCode);
  return check.status === "valid" ? check.e164 : null;
}

/**
 * The country a pasted number names, when it starts with a plus (or 00) and
 * its dialling code is known; the field switches to it.
 */
export function catchPhoneCountryOf(input: string): CatchPhoneCountryCode | null {
  const typed = international(input);
  if (!typed.startsWith("+")) return null;
  return parse(typed)?.country ?? null;
}

/** A stored E.164 number written for reading, such as "+91 98765 43210". */
export function catchPhoneDisplay(e164: string): string {
  return parse(e164)?.formatInternational() ?? e164;
}

/** Its dialling code with the plus, such as "+91". */
export function catchPhoneDialCode(countryCode: CatchPhoneCountryCode): string {
  return `+${getCountryCallingCode(countryCode)}`;
}

/** Every country the check knows, named in `locale` and sorted by name. */
export function catchPhoneCountries(locale = "en-IN"): CatchPhoneCountry[] {
  const names = new Intl.DisplayNames([locale], {type: "region", fallback: "code"});
  const collator = new Intl.Collator(locale);
  return getCountries()
    .map((countryCode) => ({countryCode, name: names.of(countryCode) ?? countryCode, dialCode: catchPhoneDialCode(countryCode)}))
    .sort((left, right) => collator.compare(left.name, right.name));
}
