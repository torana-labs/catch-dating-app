import {describe, expect, it} from "vitest";
import worldJson from "../../../../tool/demo/demo_seed/scenarios/host-marketing-india.json";
import {eventStateAt as validatorEventStateAt} from "../../../../tool/demo/lib/demo_world.mjs";
import {
  demoEventId,
  eventDetailAt,
  eventStateAt,
  guestsAt,
  organizerListingAt,
  viewerGuest,
  type DemoMoment,
} from "./demoWorld";

describe("demo world reader", () => {
  it("derives guest state with the validator's rule at every moment", () => {
    for (const moment of Object.keys(worldJson.moments) as DemoMoment[]) {
      expect(eventStateAt(demoEventId, moment)).toEqual(validatorEventStateAt(worldJson, demoEventId, moment));
    }
  });

  it("names booked and checked-in guests from the India cohort", () => {
    expect(guestsAt(demoEventId, "planning")).toEqual([]);
    const live = guestsAt(demoEventId, "live");
    expect(live).toHaveLength(24);
    expect(live.filter((guest) => guest.checkedIn)).toHaveLength(18);
    expect(viewerGuest(demoEventId).displayName).toBe("Ananya Kulkarni");
  });

  it("builds the organiser listing and event detail records the guest pages read", () => {
    const listing = organizerListingAt("planning");
    expect(listing).toMatchObject({name: "Evening Club", city: "Mumbai", country: "India",
      host: {name: "Meher Bhatia"}, path: "/organizers/mumbai/evening-club/"});

    const upcoming = eventDetailAt(demoEventId, "planning");
    expect(upcoming).toMatchObject({title: "Saturday Trivia Social", location: "Harbour Room",
      priceLabel: "Free", registrationState: "webOtp", remainingCapacity: 30, isUpcoming: true,
      timezone: "Asia/Kolkata", startTime: "2026-10-17T13:00:00.000Z", endTime: "2026-10-17T15:00:00.000Z"});
    expect(upcoming.meetingLocation?.address).toBe("Bandra West, Mumbai");

    expect(eventDetailAt(demoEventId, "followUp")).toMatchObject({isUpcoming: false, registrationState: "closed"});
  });
});
