import {describe, expect, it} from "vitest";

import {displayAdminCode, displayAdminQueueTitle} from "./adminPresentation";

describe("displayAdminQueueTitle", () => {
  it("uses human operational labels for known queue codes", () => {
    expect(displayAdminQueueTitle("harassment")).toBe("Harassment in chat");
    expect(displayAdminQueueTitle("fake_profile")).toBe("Possible fake profile");
    expect(displayAdminQueueTitle("banned_text")).toBe("Banned language");
    expect(displayAdminQueueTitle("explicit_photo")).toBe("Explicit profile photo");
  });

  it("humanizes unknown machine identifiers without changing natural titles", () => {
    expect(displayAdminQueueTitle("source_review_pending"))
      .toBe("Source review pending");
    expect(displayAdminQueueTitle("Maya Shah")).toBe("Maya Shah");
  });
});

describe("displayAdminCode", () => {
  it("turns stored codes into words", () => {
    expect(displayAdminCode("singlesMixer")).toBe("Singles mixer");
    expect(displayAdminCode("mumbai")).toBe("Mumbai");
    expect(displayAdminCode("first_time-host")).toBe("First time host");
  });
});
