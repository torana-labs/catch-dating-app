import {useQuery} from "@tanstack/react-query";
import {loadCityInterest, type CityInterest} from "../api/cityInterestRepository";

export interface CityInterestController {
  data: CityInterest | null;
  loadState: "loading" | "error" | "ready";
  loadError: string | null;
}

/** Waitlist interest by city. */
export function useCityInterestController(): CityInterestController {
  const query = useQuery({queryKey: ["admin", "cityInterest"], queryFn: loadCityInterest});
  return {data: query.data ?? null,
    loadState: query.isPending ? "loading" : query.isError ? "error" : "ready",
    loadError: query.error instanceof Error ? query.error.message : null};
}
