import {act, cleanup, fireEvent, render, renderHook, screen} from "@testing-library/react";
import type {PropsWithChildren} from "react";
import {afterEach, expect, it, vi} from "vitest";
import {useExploreController} from "./useExploreController";
import {buildExploreDiscovery, exploreRouteStateForSearch, exploreDiscoveryHref} from "./exploreDiscovery";
import {renderExploreDiscovery} from "./sections/exploreSections";
import {publicEventListingsContext} from "../organizers/usePublicEventListingsController";
import {hostListings} from "../organizers/data";
import type {HostListing, HostListingCatchEvent} from "../organizers/types";
import {publicExperienceActivities} from "../organizers/publicExperience";
afterEach(cleanup);
const now = Date.parse("2030-01-01");
const ordinary: HostListingCatchEvent = {id:"dinner", role:"Hosted event", title:"Long Table", summary:"Dinner", activityKind:"dinner", timeline:"upcoming", startTime:"2030-01-03", endTime:"2030-01-04", date:"3 Jan", location:"Khar", capacityLimit:20, bookedCount:1, checkedInCount:0, waitlistedCount:0, priceLabel:"₹400", publicRegistrationEnabled:true};
const experience: HostListingCatchEvent = {...ordinary,id:"pickleball",title:"New Partners",activityKind:"pickleball",location:"Bandra",startTime:"2030-01-02",catchExperienceActivities:["introductions"]};
const listing: HostListing = {...hostListings[0],id:"club",name:"Court Club",city:"Mumbai",citySlug:"mumbai",authority:{...hostListings[0].authority,publishStatus:"published",claimState:"claimed"},catchEvents:[ordinary,experience],externalEvents:[]};
const wrapper = ({children}: PropsWithChildren) => <publicEventListingsContext.Provider value={{listings:[listing],phase:"ready",readAt:now}}>{children}</publicEventListingsContext.Provider>;
it("composes city, format, query, date and participation filters without inferring badges",()=>{
 const filters=exploreRouteStateForSearch("");
 expect(buildExploreDiscovery([listing],filters,now).events.map(e=>e.eventId)).toEqual(["pickleball","dinner"]);
 expect(buildExploreDiscovery([listing],{...filters,experience:true},now).events.map(e=>e.eventId)).toEqual(["pickleball"]);
 expect(buildExploreDiscovery([listing],{...filters,query:"table khar",date:"week",category:"food"},now).events.map(e=>e.eventId)).toEqual(["dinner"]);
 expect(buildExploreDiscovery([listing],{...filters,city:"indore"},now).events).toEqual([]);
 expect(buildExploreDiscovery([{...listing,catchEvents:[{...experience,startTime:"2030-02-05"}]}],{...filters,date:"month"},now).events).toEqual([]);
 for(const value of [undefined,[],["checkIn"],["rotations","checkIn"],["rotations","rotations"],{enabled:true}]) expect(publicExperienceActivities(value)).toEqual([]);
});
it("excludes past, unpublished and ambiguous duplicate events",()=>{
 const data=buildExploreDiscovery([{...listing,catchEvents:[experience,{...ordinary,startTime:"2020-01-01"}]},{...listing,id:"private",authority:{...listing.authority,publishStatus:"draft"}}],exploreRouteStateForSearch(""),now);
 expect(data.events.map(e=>e.eventId)).toEqual(["pickleball"]);
 expect(buildExploreDiscovery([listing,{...listing,id:"duplicate"}],exploreRouteStateForSearch(""),now).events).toEqual([]);
});
it("round trips only bounded public filters",()=>{
 const filters=exploreRouteStateForSearch("?city=indore&format=sport&q=two+words&when=week&experience=1&token=private");
 expect(exploreRouteStateForSearch(exploreDiscoveryHref(filters).split("?")[1])).toEqual(filters);
 expect(exploreDiscoveryHref(filters)).not.toContain("token");
 expect(exploreRouteStateForSearch("?city=bad&format=bad&when=bad&experience=yes&q="+"a".repeat(130))).toEqual({city:"mumbai",category:"all",date:"any",experience:false,query:"a".repeat(120)});
});
it("keeps the city when clearing, and responds to controlled URL history changes",()=>{
 const notify=vi.fn();
 const {result,rerender}=renderHook(({initial})=>useExploreController(initial,notify),{wrapper,initialProps:{initial:exploreRouteStateForSearch("?city=indore&format=sport&experience=1")}});
 act(()=>result.current.clear());
 expect(notify).toHaveBeenCalledWith({city:"indore",category:"all",date:"any",experience:false,query:""});
 rerender({initial:exploreRouteStateForSearch("?city=mumbai&experience=1")});
 expect(result.current.events.map(e=>e.eventId)).toEqual(["pickleball"]);
 rerender({initial:exploreRouteStateForSearch("?city=mumbai")});
 expect(result.current.events).toHaveLength(2);
});
it("shows distinct badges, applies search on submit and recovers from no matches",()=>{
 function View(){return renderExploreDiscovery(useExploreController());}
 render(<View/>,{wrapper});
 expect(screen.getByRole("heading",{name:"Long Table"})).toBeTruthy();
 expect(screen.getByRole("heading",{name:"New Partners"})).toBeTruthy();
 fireEvent.click(screen.getByRole("button",{name:"Catch Experiences only"}));
 expect(screen.queryByRole("heading",{name:"Long Table"})).toBeNull();
 fireEvent.change(screen.getByLabelText("Search events"),{target:{value:"unfindable"}});
 expect(screen.getByRole("heading",{name:"New Partners"})).toBeTruthy();
 fireEvent.submit(screen.getByRole("search"));
 expect(screen.getByRole("heading",{name:"No events match these filters."})).toBeTruthy();
 fireEvent.click(screen.getByRole("button",{name:"See all events in Mumbai"}));
 expect(screen.getByRole("heading",{name:"Long Table"})).toBeTruthy();
 fireEvent.change(screen.getByLabelText("City"),{target:{value:"indore"}});
 expect(screen.getByRole("heading",{name:"No upcoming events listed in Indore yet."})).toBeTruthy();
});
it("withholds stale cards when the feed is unavailable",()=>{
 function View(){return renderExploreDiscovery(useExploreController());}
 render(<publicEventListingsContext.Provider value={{listings:[listing],phase:"unavailable",readAt:now}}><View/></publicEventListingsContext.Provider>);
 expect(screen.getByRole("heading",{name:"We couldn’t load events right now."})).toBeTruthy();
 expect(screen.queryByRole("heading",{name:"Long Table"})).toBeNull();
});
