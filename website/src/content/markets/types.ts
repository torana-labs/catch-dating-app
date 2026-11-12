/**
 * A city's lifecycle from contracts/catalogs/markets.json. Hidden cities are
 * never listed on the website, so they never appear here.
 */
export type MarketCityStatus = "waitlist" | "launching" | "live" | "paused";

export interface MarketCity {
  /** Catalog market id, such as in-mh-mumbai. */
  readonly id: string;
  /** Public path slug: /mumbai/. */
  readonly slug: string;
  /**
   * The market slug that names the city's cityPlans read model in Functions.
   * The catalog makes it the same as slug.
   */
  readonly marketSlug: string;
  readonly label: string;
  /** Other spellings listings use, such as Bangalore. */
  readonly aliases: readonly string[];
  /** Retired path slugs that redirect to slug, such as delhi. */
  readonly legacySlugs: readonly string[];
  readonly timezone: string;
  readonly status: MarketCityStatus;
  /** Planned launch day (YYYY-MM-DD) of a launching city. */
  readonly launchDate?: string;
  readonly countryIsoCode: string;
  /** The city centre, used only to snap an approximate location to a city. */
  readonly latitude: number;
  readonly longitude: number;
}

export interface MarketPack {
  readonly id: string;
  readonly countryCode: string;
  /** The phone dialling code, such as "+91", for numbers typed without one. */
  readonly dialCode: string;
  readonly appStoreCountryCodes: readonly string[];
  readonly locale: string;
  readonly currencyCode: string;
  readonly currencySymbol: string;
  readonly cities: readonly MarketCity[];
  readonly featuredCityId: string;
  readonly otherCityOptionLabel: string;
  readonly heroEyebrowTemplate: string;
  readonly heroTicketLabelTemplate: string;
  readonly downloadBodyTemplate: string;
  readonly comparisonColumns: readonly string[];
  readonly exampleEvent: {
    readonly name: string;
    readonly venue: string;
    readonly cityId: string;
    readonly timezone: string;
    readonly currencyCode: string;
  };
}
