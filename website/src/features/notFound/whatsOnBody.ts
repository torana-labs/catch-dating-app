import {interpolateContent} from "@content/interpolate";
import {activeEventLiveCities, activeMarket} from "@content/markets";
import {notFoundCopy} from "@content/notFound";

/**
 * What’s on's line on the not-found page: this week's plans in the live
 * cities of the market catalog (the cities the public catalog serves), as a
 * list in the market's locale, "A and B" or "A, B and C". With no
 * live city it says near you instead of naming none.
 */
export function whatsOnBody(
  cities: readonly {label: string}[] = activeEventLiveCities,
  locale: string = activeMarket.locale,
): string {
  if (cities.length === 0) return notFoundCopy.whatsOnNoCities;
  const list = new Intl.ListFormat(locale, {style: "long", type: "conjunction"}).format(cities.map((city) => city.label));
  return interpolateContent(notFoundCopy.tiles.whatsOn.body, {cities: list});
}
