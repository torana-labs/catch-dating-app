import {act, cleanup, renderHook} from "@testing-library/react";
import type {PropsWithChildren} from "react";
import {afterEach, expect, it} from "vitest";
import {useConsumerHomeController} from "./useConsumerHomeController";
import {homeRouteStateForSearch, buildHomeDiscovery, categoryForActivity} from "./homeDiscovery";
import {publicEventListingsContext} from "../organizers/usePublicEventListingsController";
import {hostListings} from "../organizers/data";
import type {HostListing} from "../organizers/types";
afterEach(cleanup);
it("retains discovery choices in the destination and clears format on city change", () => {
 const wrapper = ({children}: PropsWithChildren) => <publicEventListingsContext.Provider value={{listings: [], phase: "ready", readAt: 0}}>{children}</publicEventListingsContext.Provider>;
 const {result} = renderHook(() => useConsumerHomeController("mumbai", "sport"), {wrapper});
 expect(result.current.discoveryHref).toBe("/explore/?city=mumbai&format=sport#events");
 act(() => result.current.selectCity("indore"));
 expect(result.current.category).toBe("all");
 expect(result.current.discoveryHref).toBe("/explore/?city=indore#events");
});
it("allows only public city/format inputs and classifies partner-rotation sports", () => {
 expect(homeRouteStateForSearch("?city=indore&format=sport&token=private")).toEqual({city: "indore", category: "sport"});
 expect(homeRouteStateForSearch("?city=invalid&format=invalid")).toEqual({city: "mumbai", category: "all"});
 expect(categoryForActivity("pickleball")).toBe("sport");
});
it("does not show past, unpublished, or other-city events and does not invent badge eligibility", () => {
 const event = {id: "future", role: "Hosted event", title: "Future run", summary: "", activityKind: "socialRun", timeline: "upcoming", startTime: "2030-01-03", endTime: "2030-01-04", date: "Tomorrow", location: "Park", capacityLimit: 20, bookedCount: 20, checkedInCount: 0, waitlistedCount: 0, priceLabel: "Free", publicRegistrationEnabled: true} as const;
 const source: HostListing = {...hostListings[0], city: "Mumbai", citySlug: "mumbai", authority: {...hostListings[0].authority, publishStatus: "published", claimState: "claimed"}, catchEvents: [event, {...event, id: "past", startTime: "2020-01-01"}]};
 const hidden: HostListing = {...source, id: "hidden", authority: {...source.authority, publishStatus: "draft"}};
 const data = buildHomeDiscovery([source, hidden], "mumbai", "runs", Date.parse("2030-01-01"));
 expect(data.events).toHaveLength(1);
 expect(data.events[0].availability).toBe("Sold out");
 expect(data.events[0]).not.toHaveProperty("catchExperience");
 expect(data.events[0]).toMatchObject({photoUrl: null, activityKind: "socialRun"});
 expect(buildHomeDiscovery([source], "indore", "all", Date.parse("2030-01-01")).events).toEqual([]);
});
