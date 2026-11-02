import {useQuery} from "@tanstack/react-query";
import {useState} from "react";
import {
  loadMarketplace,
  type Marketplace,
  type MarketplaceRange,
} from "../api/marketplaceRepository";

export interface MarketplaceController {
  rangeDays: MarketplaceRange;
  marketId: string | null;
  data: Marketplace | null;
  loadState: "loading" | "error" | "ready";
  loadError: string | null;
  setRangeDays: (range: MarketplaceRange) => void;
  setMarketId: (marketId: string | null) => void;
}

/** The Marketplace for a range and city. */
export function useMarketplaceController(): MarketplaceController {
  const [rangeDays, setRangeDays] = useState<MarketplaceRange>(30);
  const [marketId, setMarketId] = useState<string | null>(null);
  const query = useQuery({queryKey: ["admin", "marketplace", rangeDays,
    marketId ?? "all"], queryFn: () => loadMarketplace(rangeDays, marketId)});
  return {rangeDays, marketId, data: query.data ?? null,
    loadState: query.isPending ? "loading" : query.isError ? "error" : "ready",
    loadError: query.error instanceof Error ? query.error.message : null,
    setRangeDays, setMarketId};
}
