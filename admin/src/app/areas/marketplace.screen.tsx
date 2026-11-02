import {lazy} from "react";
import {adminPathForNav} from "../adminRoutes";
import type {AdminAreaRender} from "../adminAreaKit";

const MarketplaceRouteScreen = lazy(() => import("../../features/marketplace/ui/MarketplaceRouteScreen").then((m) => ({default: m.MarketplaceRouteScreen})));

const render: AdminAreaRender = ({navigate}) => (
  <MarketplaceRouteScreen onOpenOrganizer={(organizerId) => navigate(`${adminPathForNav("organizers")}/${encodeURIComponent(organizerId)}`)} />
);

export default render;
