import {afterEach, describe, expect, it, vi} from "vitest";
import {isJoinWaitlistHttpRequest} from "../../shared/api/joinWaitlistContract";
import {
  cityAlertInterests,
  cityAlertRequest,
  cityAlertRequestId,
  cityAlertSourcePage,
  postCityAlert,
} from "./cityAlertsModel";

const place = {citySlug: "mumbai", cityLabel: "Mumbai", sourcePage: "/mumbai/run-clubs/", entry: "cf-wa"};
afterEach(() => vi.unstubAllGlobals());

describe("city alerts lead", () => {
  it("is a city_alerts website lead the join-waitlist contract accepts", () => {
    const body = cityAlertRequest(place, "+919800000000", cityAlertRequestId(() => "0b6f4a1e-2c3d-4e5f-8a9b-0c1d2e3f4a5b"), ["runs"]);
    expect(body).toMatchObject({
      requestKind: "city_alerts",
      city: "Mumbai",
      countryIsoCode: "IN",
      website: "",
      lead: {
        requestId: "0b6f4a1e2c3d4e5f8a9b0c1d2e3f4a5b",
        phone: "+919800000000",
        consent: {purpose: "cityNewPlans", version: "city-new-plans-whatsapp-v1"},
        sourcePage: "/mumbai/run-clubs/",
        entry: "cf-wa",
        cityAlerts: {interests: ["runs"]},
      },
    });
    expect(body.cityId).toBeTruthy();
    expect(isJoinWaitlistHttpRequest(body)).toBe(true);
    // No interest is a valid lead too (outdoors, or Explore with every format).
    expect(isJoinWaitlistHttpRequest(cityAlertRequest(place, "+919800000000", "a".repeat(32), []))).toBe(true);
  });

  it("maps formats to the contract's interests once each, racket sports to courts", () => {
    expect(cityAlertInterests(["pickleball", "padel", "runClubs", "outdoors"])).toEqual(["runs", "courts"]);
    expect(cityAlertInterests(["quizNights", "supper", "runClubs"])).toEqual(["runs", "dinners", "quizzes"]);
  });

  it("says where it came from without the query or fragment", () => {
    expect(cityAlertSourcePage("/mumbai/?utm_source=ig#notify")).toBe("/mumbai/");
    expect(cityAlertSourcePage("")).toBe("/");
  });

  it("posts to the site's waitlist route with the App Check token when there is one", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ok: true, alreadyJoined: false,
      lead: {leadId: "f".repeat(64), requestKind: "city_alerts", isNew: true}}), {status: 200}));
    vi.stubGlobal("fetch", fetch);
    const body = cityAlertRequest(place, "+919800000000", "a".repeat(32), ["runs"]);
    await expect(postCityAlert(body, async () => "token")).resolves.toMatchObject({ok: true});
    expect(fetch).toHaveBeenCalledWith("/api/join-waitlist", expect.objectContaining({
      method: "POST", headers: {"Content-Type": "application/json", "X-Firebase-AppCheck": "token"}, body: JSON.stringify(body)}));
  });

  it("surfaces the endpoint's refusal", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({error: "Please enter a valid WhatsApp number."}), {status: 400})));
    await expect(postCityAlert(cityAlertRequest(place, "+919800000000", "a".repeat(32), []))).rejects.toThrow("Please enter a valid WhatsApp number.");
  });
});
