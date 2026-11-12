import {websiteCities} from "../content/markets";
import type {HomeCatalog, HomeCatalogReply} from "../features/home/homeTypes";
import {guessCity, reportCityGuessHeaders, type CityGuess} from "./cityGuess";
import {readHomeCatalog} from "./homeCatalog";

/**
 * The homepage's HTML is the same for everyone so the CDN can keep it; it
 * shows the default city. The browser then asks here for a remembered city
 * (?city=slug) or, with ?guess=1, for the city the request's network location
 * suggests. The answer depends on the visitor, so nothing may cache it.
 */
export async function homeCatalogResponse(request: Request, read: (city: string | undefined) => Promise<HomeCatalog> = readHomeCatalog) {
  const headers = {"Cache-Control": "private, no-store", "X-Robots-Tag": "noindex"};
  const query = new URL(request.url).searchParams;
  const requested = query.get("city");
  let slug = websiteCities.some((city) => city.slug === requested) ? requested! : null;
  let guess: CityGuess | undefined;
  if (!slug && query.get("guess") === "1") {
    guess = guessCity(request.headers);
    reportCityGuessHeaders(request.headers, guess);
    slug = guess.slug;
  }
  const reply = (catalog: HomeCatalog | null): HomeCatalogReply => ({catalog,
    ...(guess ? {guess: {cityId: guess.cityId, slug: guess.slug, countryIsoCode: guess.countryIsoCode}} : {})});
  if (!slug) return Response.json(reply(null), {headers});
  try {
    const catalog = await read(slug);
    // A city that could not be read is not worth swapping in: the page keeps what it has.
    return Response.json(reply(catalog.phase === "unavailable" ? null : catalog), {headers});
  } catch {
    return Response.json(reply(null), {status: 503, headers});
  }
}
