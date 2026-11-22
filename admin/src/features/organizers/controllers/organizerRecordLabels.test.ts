import {describe, expect, it} from "vitest";
import {cameFromLabel, signupSourceLabel} from "./organizerRecordLabels";

describe("organizer overview labels", () => {
  it("names what the owner said in setup, apart from the derived channel", () => {
    expect(signupSourceLabel({source: "metaAd", answeredAt: "2026-11-01T08:00:00.000Z"}))
      .toBe("Instagram or Facebook ad");
    expect(signupSourceLabel(null)).toBe("Not answered");
    expect(cameFromLabel({channel: "came_to_us", nominator: null, firstPaidBookingAt: null}))
      .toBe("They came to us");
  });
});
