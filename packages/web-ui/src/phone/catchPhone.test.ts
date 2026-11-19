// @vitest-environment node
import {describe, expect, it} from "vitest";
import {
  catchPhoneCheck,
  catchPhoneCountries,
  catchPhoneCountryOf,
  catchPhoneDialCode,
  catchPhoneDisplay,
  catchPhoneE164,
  catchPhoneSupportsCountry,
} from "./catchPhone";

describe("catchPhoneCheck", () => {
  it("accepts an Indian mobile number however it is typed", () => {
    for (const typed of ["98765 43210", "098765-43210", "(987) 654 3210", "+91 98765 43210", "0091 9876543210"]) {
      expect(catchPhoneE164(typed, "IN"), typed).toBe("+919876543210");
    }
  });

  it("refuses the eight-digit number the old shape check let through", () => {
    // The old check turned 12345678 into +9112345678 and accepted it.
    expect(catchPhoneCheck("12345678", "IN")).toEqual({status: "invalid", problem: "tooShort", countryCode: "IN"});
  });

  it("says what is wrong: empty, too short, too long, or not a mobile number", () => {
    expect(catchPhoneCheck("  ", "IN")).toMatchObject({problem: "empty"});
    expect(catchPhoneCheck("98765", "IN")).toMatchObject({problem: "tooShort"});
    expect(catchPhoneCheck("98765432101234", "IN")).toMatchObject({problem: "tooLong"});
    // Ten digits, but an Indian mobile number starts with 6 to 9.
    expect(catchPhoneCheck("1234567890", "IN")).toMatchObject({problem: "notMobile"});
  });

  it("reads a number with a plus in its own country, whatever the default", () => {
    expect(catchPhoneCheck("+61 412 345 678", "IN")).toEqual({status: "valid", e164: "+61412345678", countryCode: "AU"});
    expect(catchPhoneCheck("0412 345 678", "AU")).toEqual({status: "valid", e164: "+61412345678", countryCode: "AU"});
  });

  it("refuses a landline, since WhatsApp needs a mobile number", () => {
    // A Sydney landline: valid as a number, not as a mobile one.
    expect(catchPhoneCheck("02 9374 4000", "AU")).toMatchObject({status: "invalid", problem: "notMobile"});
  });
});

describe("catchPhone helpers", () => {
  it("finds the country a pasted number names", () => {
    expect(catchPhoneCountryOf("+977 980-1234567")).toBe("NP");
    expect(catchPhoneCountryOf("0061 412 345 678")).toBe("AU");
    expect(catchPhoneCountryOf("98765 43210")).toBeNull();
  });

  it("writes a stored number for reading and names dialling codes", () => {
    expect(catchPhoneDisplay("+919876543210")).toBe("+91 98765 43210");
    expect(catchPhoneDialCode("IN")).toBe("+91");
    expect(catchPhoneSupportsCountry("IN")).toBe(true);
    expect(catchPhoneSupportsCountry("XX")).toBe(false);
  });

  it("lists every country by name with its dialling code", () => {
    const countries = catchPhoneCountries("en-IN");
    expect(countries.length).toBeGreaterThan(200);
    expect(countries.find((country) => country.countryCode === "IN")).toEqual({countryCode: "IN", name: "India", dialCode: "+91"});
    const names = countries.map((country) => country.name);
    expect(names).toEqual([...names].sort((left, right) => left.localeCompare(right, "en-IN")));
  });
});
