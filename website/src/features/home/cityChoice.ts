import {websiteCities} from "@content/markets";

/**
 * How the site came to its city, as the waitlist contract records it:
 * picked from the list, guessed from the network, from the browser's
 * location after "Use my location", or typed in a form.
 */
export type CitySource = "picked" | "network_guess" | "precise" | "typed";

export interface CityChoice {
  readonly cityId: string;
  readonly slug: string;
  readonly source: "picked" | "precise";
}

// Essential storage: it keeps a city the visitor chose, and holds nothing else.
const storageKey = "catch_city_choice_v1";

function storage(): Storage | null {
  try { return typeof window === "undefined" ? null : window.localStorage; } catch { return null; }
}

/** The city the visitor chose last, if it is still listed. */
export function readCityChoice(store: Storage | null = storage()): CityChoice | null {
  try {
    const value = JSON.parse(store?.getItem(storageKey) ?? "null") as Partial<CityChoice> | null;
    const city = websiteCities.find((item) => item.slug === value?.slug);
    if (!city || (value?.source !== "picked" && value?.source !== "precise")) return null;
    return {cityId: city.id, slug: city.slug, source: value.source};
  } catch { return null; }
}

/** Remembers a city the visitor chose. Only the city is kept, never a location. */
export function rememberCityChoice(slug: string, source: CityChoice["source"], store: Storage | null = storage()) {
  const city = websiteCities.find((item) => item.slug === slug);
  if (!city) return;
  try { store?.setItem(storageKey, JSON.stringify({slug: city.slug, source})); } catch { /* Optional storage. */ }
}
