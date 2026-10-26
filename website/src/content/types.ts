

export type StorePlatform = "android" | "ios";

export interface StoreCtaCopy {
  readonly platform: StorePlatform;
  readonly kicker: string;
  readonly label: string;
  readonly shortLabel: string;
}

export interface StaticPageMetaCopy {
  readonly title: string;
  readonly description: string;
  readonly canonicalPath: string;
  readonly twitterDescription: string;
  readonly robots?: "noindex, follow";
}

export interface ListingMetaCopy {
  readonly titleTemplate: string;
  readonly staticLabels: {
    readonly profileEyebrow: string;
    readonly formatsHeading: string;
    readonly factsHeading: string;
    readonly sourcesHeading: string;
    readonly lastVerifiedPrefix: string;
    readonly notRecorded: string;
    readonly homeBreadcrumb: string;
    readonly organizersBreadcrumb: string;
  };
}

export interface EventMetaCopy {
  readonly titleTemplate: string;
  readonly catchTwitterTemplate: string;
  readonly externalTwitterTemplate: string;
  readonly staticLabels: {
    readonly eventEyebrow: string;
    readonly hostedByPrefix: string;
    readonly scheduleHeading: string;
    readonly locationLabel: string;
    readonly priceLabel: string;
    readonly sourceLabel: string;
    readonly reviewsHeading: string;
    readonly lastReviewedPrefix: string;
    readonly homeBreadcrumb: string;
    readonly organizersBreadcrumb: string;
  };
}

export interface WebsiteMetaCopy {
  readonly routes: Readonly<
    Record<
      "sales_demo" | "home" | "visitor_discovery" | "host" | "host_apply" |  "event_runtime" | "event_rehearsal" | "event_assistance" | "event_offer" | "event_booking" | "event_invite" | "household_rsvp" | "public_form" | "organizers" | "claim" | "privacy" | "terms" | "help" | "account_deletion" | "refunds" | "contact" | "not_found",
      StaticPageMetaCopy
    >
  >;
  readonly listing: ListingMetaCopy;
  readonly event: EventMetaCopy;
}

export type PublishedLegalPath = "/help/" | "/privacy/" | "/terms/" | "/delete-account/" | "/refunds/" | "/contact/";
export type PublishedLegalPageKey = "help" | "privacy" | "terms" | "account_deletion" | "refunds" | "contact";

export interface PublishedLegalSection {
  readonly heading: string;
  readonly paragraphs: readonly string[];
  readonly bullets?: readonly string[];
  readonly links?: readonly PublishedLegalLink[];
}

export interface PublishedLegalLink {
  readonly href: `/${string}/`;
  readonly label: string;
}

export interface PublishedLegalPage {
  readonly path: PublishedLegalPath;
  readonly eyebrow: string;
  readonly title: string;
  readonly summary: string;
  /** Overrides the shared effective date when only this document changed. */
  readonly effectiveDate?: string;
  readonly sections: readonly PublishedLegalSection[];
}

export interface PublishedLegalContent {
  readonly operator: {
    readonly name: string;
    readonly supportEmail: string;
    readonly formalAddress: string;
    readonly governingCourts: string;
    readonly grievanceOfficer: string;
  };
  readonly ui: {
    readonly homeLabel: string;
    readonly organizersLabel: string;
    readonly hostsLabel: string;
    readonly contactLabel: string;
    readonly effectivePrefix: string;
    readonly contactPrompt: string;
    readonly footerBody: string;
  };
  readonly effectiveDate: string;
  readonly pages: Readonly<Record<PublishedLegalPageKey, PublishedLegalPage>>;
}
