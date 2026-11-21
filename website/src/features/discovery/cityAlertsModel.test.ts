import {describe, expect, it} from "vitest";
import {isJoinWaitlistHttpRequest} from "../../shared/api/joinWaitlistContract";
import {websiteLeadRequest} from "../../shared/api/websiteLead";
import {cityAlertForm, cityAlertInterests, exploreAlertInterests} from "./cityAlertsModel";

const place = {citySlug: "mumbai", cityLabel: "Mumbai", sourcePage: "/mumbai/run-clubs/", entry: "cf-wa"};

describe("city alerts lead", () => {
  it("is a city_alerts website lead the join-waitlist contract accepts", () => {
    const form = cityAlertForm(place, "98000 00000", ["runs"]);
    expect(form).toMatchObject({kind: "city_alerts", phone: "98000 00000", consentVersion: "city-new-plans-whatsapp-v3",
      sourcePage: "/mumbai/run-clubs/", entry: "cf-wa", answers: {interests: ["runs"]}, city: "Mumbai", countryIsoCode: "IN"});
    expect(form.cityId).toBeTruthy();
    const body = websiteLeadRequest(form, "+919800000000", "a".repeat(32));
    expect(body).toMatchObject({requestKind: "city_alerts", lead: {consent: {purpose: "cityNewPlans"}, cityAlerts: {interests: ["runs"]}}});
    expect(isJoinWaitlistHttpRequest(body)).toBe(true);
    // No interest is a valid lead too (outdoors, or Explore with every format).
    expect(isJoinWaitlistHttpRequest(websiteLeadRequest(cityAlertForm(place, "", []), "+919800000000", "a".repeat(32)))).toBe(true);
  });

  it("maps formats to the contract's interests once each, racket sports to courts", () => {
    expect(cityAlertInterests(["pickleball", "padel", "runClubs", "outdoors"])).toEqual(["runs", "courts"]);
    expect(cityAlertInterests(["quizNights", "supper", "runClubs"])).toEqual(["runs", "dinners", "quizzes"]);
    expect(exploreAlertInterests("games")).toEqual(["quizzes"]);
    expect(exploreAlertInterests("all")).toEqual([]);
    expect(exploreAlertInterests("other")).toEqual([]);
  });
});
