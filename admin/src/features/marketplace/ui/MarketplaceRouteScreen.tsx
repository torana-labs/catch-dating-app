import {useMarketplaceController} from "../controllers/useMarketplaceController";
import {MarketplaceScreen} from "./MarketplaceScreen";

/** Marketplace as the shell routes it. */
export function MarketplaceRouteScreen({onOpenOrganizer}: {onOpenOrganizer: (organizerId: string) => void}) {
  const controller = useMarketplaceController();
  return <MarketplaceScreen controller={controller} onOpenOrganizer={onOpenOrganizer} />;
}
