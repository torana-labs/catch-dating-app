export type MarketCityStatus = "live" | "waitlist";

export interface MarketCity {
  readonly id: string;
  readonly slug: string;
  /**
   * The canonical market slug in functions/src/locations/marketConfig.ts,
   * which names the city's cityPlans read model.
   */
  readonly marketSlug: string;
  readonly label: string;
  readonly aliases: readonly string[];
  readonly timezone: string;
  readonly status: MarketCityStatus;
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
