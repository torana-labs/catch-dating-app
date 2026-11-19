import {describe, expect, it} from "vitest";
import {catchPhoneSupportsCountry} from "@catch/web-ui/phone";
import {activeMarket, activePhoneCountry} from "./index";

describe("activePhoneCountry", () => {
  it("is the site's country, and one the mobile number check knows", () => {
    expect(activePhoneCountry).toBe(activeMarket.countryCode);
    expect(catchPhoneSupportsCountry(activePhoneCountry)).toBe(true);
  });
});
