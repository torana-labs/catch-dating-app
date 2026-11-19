import {describe, expect, it} from "vitest";
import {ownerTrackingSettings} from "./ownerViewTypes";

const base = {organizerId: "lantern-lane-runners", revision: 3, canEdit: true};

describe("owner tracking live state", () => {
  it("saved IDs under the disabled policy are not live, because of the policy review", () => {
    expect(ownerTrackingSettings({...base, metaPixelId: "481516234200", googleMeasurementId: null, enabled: false,
      publicationAllowed: false})).toEqual({...base, metaPixelId: "481516234200", googleMeasurementId: null,
      live: false, notLiveReason: "policyReview"});
  });

  it("nothing saved is not live, with its own reason", () => {
    expect(ownerTrackingSettings({...base, metaPixelId: null, googleMeasurementId: null, enabled: false,
      publicationAllowed: false})).toMatchObject({live: false, notLiveReason: "nothingSaved"});
  });

  it("is live only when the server says both enabled and allowed", () => {
    const saved = {...base, metaPixelId: null, googleMeasurementId: "G-LANTERN42"};
    expect(ownerTrackingSettings({...saved, enabled: true, publicationAllowed: false}).live).toBe(false);
    expect(ownerTrackingSettings({...saved, enabled: false, publicationAllowed: true}).live).toBe(false);
    expect(ownerTrackingSettings({...saved})).toMatchObject({live: false, notLiveReason: "policyReview", canEdit: true});
    expect(ownerTrackingSettings({...saved, enabled: true, publicationAllowed: true}))
      .toMatchObject({live: true, notLiveReason: null});
  });
});
