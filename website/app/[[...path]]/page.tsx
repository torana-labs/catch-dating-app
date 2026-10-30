import {readHomeCatalog} from "../../src/server/homeCatalog";
import {markPublicPageUnavailable} from "../../src/server/publicPageCacheResponse";
import {notFound, permanentRedirect} from "next/navigation";
import {resolvePublicRoute} from "../../src/server/publicRoute";
import {PublicProviders} from "../../src/app/next/PublicProviders";
import {PublicPage} from "../../src/app/next/PublicPage";
import {organizerDirectoryDestination} from "../../src/app/retiredMarketingRoutes";
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
  const query = new URLSearchParams(Object.entries(search).flatMap(([key, value]) =>
    (Array.isArray(value) ? value : value === undefined ? [] : [value]).map((item) => [key, item])));
  // The organiser directory is Explore's organisers view now; its query comes along (CAT-261).
  if (route.page === "organizers") permanentRedirect(organizerDirectoryDestination(query));
  const requestedCity = typeof search.city === "string" ? search.city : undefined;
  // The homepage, Explore and the city pages read cityPlans documents instead of the catalog.
  const cityCatalog = route.page === "home" || route.page === "visitor_discovery" ?
    await readHomeCatalog(route.citySlug ?? requestedCity) : undefined;
  // A city that could not be read keeps its message but answers 503, so no cache keeps it.
  if (cityCatalog?.phase === "unavailable") markPublicPageUnavailable();
  // Only public allowlisted discovery choices enter the initial client state.
  const publicSearch = new URLSearchParams(["city", "format", "q", "when", "show"].flatMap((key) =>
    typeof search[key] === "string" && search[key] ? [[key, search[key] as string]] : []));
  const initialSearch = route.page === "visitor_discovery" ? (publicSearch.size ? `?${publicSearch}` : "")
    : route.page === "home" && cityCatalog ? `?${new URLSearchParams({city: cityCatalog.selected.slug})}` : "";
  return <PublicProviders pathname={route.pathname} initialSearch={initialSearch} catalog={route.catalog} live={route.live}>
    <PublicPage page={route.page} readAt={route.catalog.readAt} contact={route.contact ?? undefined} home={cityCatalog} />
  </PublicProviders>;
}
