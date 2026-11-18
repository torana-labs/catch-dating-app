import {activeMarket} from "@content/markets";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it} from "vitest";
import {exploreLeads} from "../../../../scripts/next/deployedSmoke.mjs";
import type {ExploreView} from "../exploreModel";
import {exploreStates} from "../useExplorePageController";
import {exploreHeading} from "./explorePageSections";

/**
 * The release smoke reads /explore/ and /mumbai/ (a city page renders the same
 * ExplorePage and headline) and passes only when the HTML holds one of
 * `exploreLeads`. It runs after deploy, never on a PR, so an Explore state
 * that leads with copy outside that list halted website releases (#1969,
 * fixed by #1996). Here every state and view the headline can draw, for every
 * city and live city, must render a lead the smoke accepts.
 */
describe("Explore headline and the release smoke", () => {
  // A Record, so a new view fails the typecheck until it is walked here too.
  const views = Object.keys({plans: true, organisers: true} satisfies Record<ExploreView, true>) as ExploreView[];
  const cities = activeMarket.cities.map(({label}) => ({label}));

  function headlineCases() {
    return exploreStates.flatMap((state) => views.flatMap((view) => cities.flatMap((city) =>
      [null, ...cities.filter((other) => other.label !== city.label)].map((liveCity) => {
        const {lead} = exploreHeading({state, city, filters: {view}, liveCity});
        // The smoke reads the served HTML, so the lead as React escapes it.
        const html = renderToStaticMarkup(createElement("p", null, lead));
        return {state, view, city: city.label, liveCity: liveCity?.label ?? null, lead, html};
      }))));
  }

  it("walks a market with a city to point a launching-soon page to", () => {
    expect(cities.length).toBeGreaterThan(1);
    expect(cities.map(({label}) => label)).toContain("Mumbai");
  });

  it("draws every state's lead in words the deployed smoke accepts", () => {
    // One line per state, view and lead, naming the first city that draws it.
    const rejected = new Map<string, string>();
    for (const {state, view, city, liveCity, lead, html} of headlineCases()) {
      const key = `${state} (${view}): ${lead}`;
      if (!exploreLeads.some((accepted) => html.includes(accepted)) && !rejected.has(key)) {
        rejected.set(key, `${key} [${city}${liveCity ? `, live city ${liveCity}` : ""}]`);
      }
    }
    expect([...rejected.values()]).toEqual([]);
  });

  it("keeps no smoke lead the headline can no longer draw", () => {
    const drawn = headlineCases().map(({html}) => html);
    expect(exploreLeads.filter((lead) => !drawn.some((html) => html.includes(lead)))).toEqual([]);
  });
});
