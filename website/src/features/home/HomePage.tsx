import {ConsumerHome} from "../../shared/ui/primitives/consumerHome";
import {renderConsumerHero, renderConsumerEvents, renderConsumerStory} from "./sections/consumerHomeSections";
import {useConsumerHomeController} from "./useConsumerHomeController";
import type {HomeCategory} from "./homeDiscovery";
type HomeRouteState = {city: string; category: HomeCategory};
import {ExplorePageLayout} from "../../shared/ui/primitives/explore";
import {renderExploreDiscovery} from "./sections/exploreSections";
import {useExploreController} from "./useExploreController";
import type {ExploreFilters} from "./exploreDiscovery";
import type {CaptureSlots} from "../../shared/media/MediaSlot";
import {
  PublicSiteFooter,
  PublicSiteHeader,
  WebsitePageMain,
} from "../../shared/site";

export function VisitorDiscoveryPage({routeState, onFiltersChange}: {captures: CaptureSlots; routeState?: ExploreFilters; onFiltersChange?: (filters: ExploreFilters) => void}) {
  const explore = useExploreController(routeState, onFiltersChange);
  return <ExplorePageLayout>
    <PublicSiteHeader />
    <WebsitePageMain id="top">{renderExploreDiscovery(explore)}</WebsitePageMain>
    <PublicSiteFooter />
  </ExplorePageLayout>;
}

export function HomePage({captures, routeState}: {captures: CaptureSlots; routeState?: HomeRouteState}) {
  const home = useConsumerHomeController(routeState?.city, routeState?.category);
  return <ConsumerHome >
    <PublicSiteHeader />
    <WebsitePageMain id="top">{renderConsumerHero(home)}{renderConsumerEvents(home)}{renderConsumerStory(home, captures)}</WebsitePageMain>
    <PublicSiteFooter />
  </ConsumerHome>;
}
