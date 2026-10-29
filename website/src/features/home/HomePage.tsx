import {ExplorePageLayout} from "../../shared/ui/primitives/explore";
import type {CaptureSlots} from "../../shared/media/captureSlot";
import {PublicSiteFooter, PublicSiteHeader, WebsitePageMain} from "../../shared/site";
import type {ExploreFilters} from "./exploreDiscovery";
import type {HomeCatalog} from "./homeTypes";
import {renderExploreDiscovery} from "./sections/exploreSections";
import {HomePageSections} from "./sections/homeSections";
import {useExploreController} from "./useExploreController";
import {useHomePageController} from "./useHomePageController";

export function VisitorDiscoveryPage({routeState, onFiltersChange}: {captures: CaptureSlots; routeState?: ExploreFilters; onFiltersChange?: (filters: ExploreFilters) => void}) {
  const explore = useExploreController(routeState, onFiltersChange);
  return <ExplorePageLayout>
    <PublicSiteHeader />
    <WebsitePageMain id="top">{renderExploreDiscovery(explore)}</WebsitePageMain>
    <PublicSiteFooter />
  </ExplorePageLayout>;
}

/**
 * The Website v2 homepage (CAT-260, the WebHomeV2 board): one city's plans
 * from its cityPlans read model, or its launching-soon state, around the
 * guest story and the host band.
 */
export function HomePage({catalog, downloadUrl, navigate}: {
  catalog: HomeCatalog;
  /** One link for both stores; the QR code appears once there is one (CAT-204). */
  downloadUrl?: string;
  navigate?: (href: string) => void;
}) {
  const home = useHomePageController(catalog, navigate);
  return <HomePageSections downloadUrl={downloadUrl} home={home} />;
}
