import {organizerDirectoryOptions, organizerDirectorySearchParams, readOrganizerFiltersFromUrl} from "../../src/features/organizers/selectors";
import {exploreRouteStateForSearch, exploreDiscoveryHref} from "../../src/features/home/exploreDiscovery";
import {readHomeCatalog} from "../../src/server/homeCatalog";
import {notFound} from "next/navigation";
import {resolvePublicRoute} from "../../src/server/publicRoute";
import {PublicProviders} from "../../src/app/next/PublicProviders";
import {PublicPage} from "../../src/app/next/PublicPage";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Props = {params: Promise<{path?: string[]}>; searchParams: Promise<Record<string, string | string[] | undefined>>};
async function routeFor({params}: Props) {
  const {path = []} = await params;
  const pathname = path.length ? `/${path.map(encodeURIComponent).join("/")}/` : "/";
  return {pathname, ...await resolvePublicRoute(pathname)};
}
export async function generateMetadata(props: Props) {return (await routeFor(props)).metadata;}
export default async function Page(props: Props) {
  const route = await routeFor(props);
  if (route.page === "not_found") notFound();
  const search = await props.searchParams;
  const requestedCity = typeof search.city === "string" ? search.city : undefined;
  // The homepage reads one cityPlans document per city instead of the catalog.
  const home = route.page === "home" ? await readHomeCatalog(requestedCity) : undefined;
  // Only public allowlisted discovery choices enter the initial client state.
  const publicSearch = new URLSearchParams(Object.fromEntries(["city", "format", "q", "when", "experience"].map(key => [key, typeof search[key] === "string" ? search[key] : ""])));
  const directoryOptions = organizerDirectoryOptions(route.catalog.listings);
  const directorySearch = new URLSearchParams(Object.fromEntries(["q", "city", "format", "status", "rating", "upcoming", "sort"].map(key => [key, typeof search[key] === "string" ? search[key] : ""])));
  const initialSearch = route.page === "visitor_discovery"
    ? exploreDiscoveryHref(exploreRouteStateForSearch(publicSearch.toString())).replace("/explore/", "")
    : route.page === "organizers" ? `?${organizerDirectorySearchParams(readOrganizerFiltersFromUrl(directoryOptions.cityOptions, directoryOptions.formatOptions, directorySearch))}`
    : route.page === "home" && home ? `?${new URLSearchParams({city: home.selected.slug})}` : "";
  return <PublicProviders pathname={route.pathname} initialSearch={initialSearch} catalog={route.catalog} live={route.live}>
    <PublicPage page={route.page} readAt={route.catalog.readAt} contact={route.contact ?? undefined} home={home} />
  </PublicProviders>;
}
