import {useEffect, useState} from "react";
import {readCityChoice, type CitySource} from "./cityChoice";
import type {HomeCatalog, HomeCatalogReply} from "./homeTypes";

export type HomeCatalogLoader = (query: string, signal: AbortSignal) => Promise<HomeCatalogReply | null>;

const loadHomeCatalog: HomeCatalogLoader = async (query, signal) => {
  const response = await fetch(`/api/home-catalog?${query}`, {cache: "no-store", credentials: "omit", signal});
  return response.ok ? await response.json() as HomeCatalogReply : null;
};

/**
 * The homepage's city. The cached HTML shows the default city; when the
 * address names no city, the browser swaps in the city the visitor chose last
 * or, failing that, the one their network location suggests. A named city
 * (?city=) always wins. The source says how the city was reached.
 */
export function useHomeCity(initial: HomeCatalog, load: HomeCatalogLoader = loadHomeCatalog) {
  const [state, setState] = useState<{catalog: HomeCatalog; source?: CitySource}>({catalog: initial});
  useEffect(() => {
    setState({catalog: initial});
    const choice = readCityChoice();
    const named = new URLSearchParams(window.location.search).has("city");
    if (named || choice?.slug === initial.selected.slug) {
      if (choice?.slug === initial.selected.slug) setState({catalog: initial, source: choice.source});
      return;
    }
    const controller = new AbortController();
    load(choice ? `city=${encodeURIComponent(choice.slug)}` : "guess=1", controller.signal).then((reply) => {
      const catalog = reply?.catalog;
      if (controller.signal.aborted || !catalog || catalog.selected.slug === initial.selected.slug) return;
      setState({catalog, source: choice ? choice.source : "network_guess"});
    }).catch(() => undefined);
    return () => controller.abort();
  }, [initial, load]);
  return state;
}
