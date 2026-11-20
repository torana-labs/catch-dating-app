import type {CatchFieldPhoneCopy} from "@catch/web-ui";

/** What Admin's phone fields say, as on the website (issue #2144). `{country}` is the country's name. */
export const adminPhoneFieldCopy: CatchFieldPhoneCopy = {
  country: "Country code",
  search: "Search countries",
  noMatches: "No country matches",
  close: "Close",
  problems: {
    tooShort: "That's too short for a mobile number in {country}.",
    tooLong: "That's too long for a mobile number in {country}.",
    notMobile: "That isn't a mobile number in {country}.",
  },
};
