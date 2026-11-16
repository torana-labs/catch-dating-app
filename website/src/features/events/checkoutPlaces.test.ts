import {describe, expect, it} from "vitest";
import {
  checkoutPlaces,
  clampPlaces,
  guestNameValid,
  guestNamesRefused,
  normalizeGuestName,
  notEnoughPlacesLeft,
  placeFieldsConsistent,
  resizeGuestNames,
} from "./checkoutPlaces";

describe("checkout places", () => {
  it("clamps the place count to 1 to 4 and to the places left", () => {
    expect(clampPlaces(0)).toBe(1);
    expect(clampPlaces(3)).toBe(3);
    expect(clampPlaces(9)).toBe(4);
    expect(clampPlaces(4, 2)).toBe(2);
    expect(clampPlaces(2, 0)).toBe(1);
    expect(clampPlaces(Number.NaN)).toBe(1);
  });

  it("reads one place when the place fields are absent", () => {
    expect(checkoutPlaces({amountPaise: 50000})).toEqual({placeCount: 1, unitAmountPaise: 50000, guestUnitAmountPaise: 50000, memberPlaceCount: 0});
  });

  it("prices the member's own place at the member price and each guest at the list price", () => {
    expect(checkoutPlaces({amountPaise: 30000 + 2 * 50000, placeCount: 3, unitAmountPaise: 30000, memberPlaceCount: 1, guestUnitAmountPaise: 50000}))
      .toEqual({placeCount: 3, unitAmountPaise: 30000, guestUnitAmountPaise: 50000, memberPlaceCount: 1});
  });

  it("accepts only place fields whose prices add up to the whole amount", () => {
    expect(placeFieldsConsistent({amountPaise: 50000}, 4)).toBe(true);
    expect(placeFieldsConsistent({amountPaise: 50000, placeCount: 1, unitAmountPaise: 50000}, 20)).toBe(true);
    expect(placeFieldsConsistent({amountPaise: 150000, placeCount: 3, unitAmountPaise: 50000}, 4)).toBe(true);
    expect(placeFieldsConsistent({amountPaise: 130000, placeCount: 3, unitAmountPaise: 30000, memberPlaceCount: 1, guestUnitAmountPaise: 50000}, 4)).toBe(true);
    expect(placeFieldsConsistent({amountPaise: 140000, placeCount: 3, unitAmountPaise: 50000}, 4)).toBe(false);
    expect(placeFieldsConsistent({amountPaise: 250000, placeCount: 5, unitAmountPaise: 50000}, 4)).toBe(false);
    expect(placeFieldsConsistent({amountPaise: 100000, placeCount: 2}, 4)).toBe(false);
    expect(placeFieldsConsistent({amountPaise: 80000, placeCount: 2, unitAmountPaise: 30000, memberPlaceCount: 1}, 4)).toBe(false);
    expect(placeFieldsConsistent({amountPaise: 50000, unitAmountPaise: 40000}, 4)).toBe(false);
    expect(placeFieldsConsistent({amountPaise: 50000, memberPlaceCount: 1, guestUnitAmountPaise: 50000}, 4)).toBe(false);
  });

  it("applies the server's guest-name rule: trimmed, 1 to 80 characters, no control characters", () => {
    expect(normalizeGuestName("  Riya   Shah ")).toBe("Riya Shah");
    expect(guestNameValid("Riya")).toBe(true);
    expect(guestNameValid("   ")).toBe(false);
    expect(guestNameValid("a".repeat(80))).toBe(true);
    expect(guestNameValid("a".repeat(81))).toBe(false);
    expect(guestNameValid("Riya\u0007")).toBe(false);
    expect(guestNameValid("Riya\u0085")).toBe(false);
    // Code points, not UTF-16 units, as the contract counts.
    expect(guestNameValid("🙂".repeat(80))).toBe(true);
  });

  it("keeps typed names when the place count changes", () => {
    expect(resizeGuestNames([], 3)).toEqual(["", ""]);
    expect(resizeGuestNames(["Riya", "Arjun"], 2)).toEqual(["Riya"]);
    expect(resizeGuestNames(["Riya"], 4)).toEqual(["Riya", "", ""]);
    expect(resizeGuestNames(["Riya"], 1)).toEqual([]);
  });

  it("reads the places left from a notEnoughPlaces refusal and spots guest-name refusals", () => {
    expect(notEnoughPlacesLeft({details: {reason: "notEnoughPlaces", placesLeft: 2}})).toBe(2);
    expect(notEnoughPlacesLeft({details: {reason: "organizerPaymentsNotReady"}})).toBeNull();
    expect(notEnoughPlacesLeft(new Error("plain"))).toBeNull();
    expect(guestNamesRefused({details: {reason: "guestNamesCount", expected: 2, received: 1}})).toBe(true);
    expect(guestNamesRefused({details: {reason: "guestNameInvalid", index: 0}})).toBe(true);
    expect(guestNamesRefused({details: {reason: "notEnoughPlaces"}})).toBe(false);
  });
});
