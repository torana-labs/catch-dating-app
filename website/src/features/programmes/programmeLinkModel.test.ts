import {describe, expect, it} from "vitest";
import {householdRsvpViewFixture} from "../../content/householdRsvp";
import {programmeFixtures} from "../../content/programmes";
import {itineraryOf, joinNames} from "./programmeItineraryModel";
import {roomIdCount, roomIdLinks, roomingListCsv} from "./programmeHotelHandoverModel";
import {programmeLinkFailure, programmeLinkScreen, programmeUploadProblem} from "./programmeLinkModel";

describe("programme link model", () => {
  it("sorts failed reads into invalid, expired and network", () => {
    expect(programmeLinkFailure({code: "functions/permission-denied"})).toBe("invalid");
    expect(programmeLinkFailure({code: "functions/unauthenticated"})).toBe("invalid");
    expect(programmeLinkFailure({code: "functions/deadline-exceeded"})).toBe("expired");
    expect(programmeLinkFailure(new Error("offline"))).toBe("network");
    expect(programmeLinkScreen({credential: null, view: undefined, pending: true, error: null}))
      .toEqual({kind: "unavailable", reason: "invalid"});
    // A failed refresh keeps the page it already has.
    expect(programmeLinkScreen({credential: {token: "t"}, view: 1, pending: false, error: new Error("x")}))
      .toEqual({kind: "ready", view: 1});
  });

  it("accepts photos and PDFs up to 10 MB", () => {
    expect(programmeUploadProblem(new File(["x"], "a.webp", {type: "image/webp"}))).toBeNull();
    expect(programmeUploadProblem(new File(["x"], "a.gif", {type: "image/gif"}))).toBe("wrongType");
    expect(programmeUploadProblem(new File([], "a.jpg", {type: "image/jpeg"}))).toBe("tooLarge");
  });

  it("builds the household's weekend from its own replies and journeys", () => {
    const itinerary = itineraryOf(householdRsvpViewFixture);
    expect(itinerary.functions.map((fn) => fn.name)).toEqual(["Reception"]);
    expect(itinerary.functions[0]).toMatchObject({maybe: false, venueName: "Grand Hall"});
    expect(itinerary.arrivals).toHaveLength(1);
    expect(itinerary.arrivals[0]).toMatchObject({flight: "AI 610", passengers: 2});
    expect(itinerary.departures).toEqual([]);
    expect(joinNames(["Neha", "Rohan", "Kiara"])).toBe("Neha, Rohan and Kiara");
  });

  it("gives the hotel only accepted ID photos, and a CSV without ID numbers", () => {
    const [ritu, mehra] = programmeFixtures.hotelHandover.rooms;
    expect(roomIdCount(mehra)).toEqual({accepted: 2, total: 2, tone: "success"});
    expect(roomIdCount(ritu).tone).toBe("warning");
    expect(roomIdLinks(ritu)).toEqual([]);
    expect(roomIdLinks(mehra).map((link) => link.href)).toEqual([
      "https://example.com/front-neha", "https://example.com/back-neha", "https://example.com/front-rohan"]);
    const csv = roomingListCsv(programmeFixtures.hotelHandover);
    expect(csv.split("\n")[0]).toBe("Room,Guest,Arrives,Leaves,ID");
    expect(csv).toContain("214,Neha Mehra,");
    expect(csv).not.toContain("3307");
    expect(csv).not.toContain("https://");
  });
});
