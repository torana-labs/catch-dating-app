// CSS- and React-free entry point (@catch/web-ui/phone): the one mobile number
// check, kept off the main barrel so its country metadata loads only where a
// form takes a number.
export {
  catchPhoneCheck,
  catchPhoneCountries,
  catchPhoneCountryOf,
  catchPhoneDialCode,
  catchPhoneDisplay,
  catchPhoneE164,
  catchPhoneSupportsCountry,
} from "./catchPhone";
export type {CatchPhoneCheck, CatchPhoneCountry, CatchPhoneCountryCode, CatchPhoneProblem} from "./catchPhone";
