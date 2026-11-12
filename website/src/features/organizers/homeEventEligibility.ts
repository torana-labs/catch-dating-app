import type {MarketCityStatus} from "../../content/markets/types";

export interface HomeEventEligibilityOptions {
  readonly now: number;
  readonly cities: ReadonlyArray<{
    readonly id: string;
    readonly label: string;
    readonly aliases: readonly string[];
    readonly status: MarketCityStatus;
  }>;
}

interface CatchEventCandidate {
  readonly id: string;
  readonly startTime: string;
}

interface ListingCandidate<Event extends CatchEventCandidate> {
  readonly city: string;
  readonly catchEvents?: readonly Event[];
}

export function eligibleHomeCatchEvents<
  Event extends CatchEventCandidate,
  Listing extends ListingCandidate<Event>,
>(
  listings: readonly Listing[],
  options: HomeEventEligibilityOptions
): Array<{listing: Listing; event: Event; sortTime: number}> {
  const liveCityIds = new Set(
    options.cities.filter((city) => city.status === "live").map((city) => city.id)
  );
  const cityIdByKey = new Map(
    options.cities.flatMap((city) =>
      [city.label, ...city.aliases].map((label) => [normalizedCityKey(label), city.id])
    )
  );
  return listings
    .flatMap((listing) => {
      const cityId = cityIdByKey.get(normalizedCityKey(listing.city));
      if (!cityId || !liveCityIds.has(cityId)) return [];
      return (listing.catchEvents ?? []).flatMap((event) => {
        const sortTime = Date.parse(event.startTime);
        if (!Number.isFinite(sortTime) || sortTime <= options.now) return [];
        return [{listing, event, sortTime}];
      });
    })
    .sort((a, b) => a.sortTime - b.sortTime);
}

function normalizedCityKey(value: string) {
  return value.trim().toLocaleLowerCase("en-IN");
}
