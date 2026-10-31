import {
  BigQueryClient,
  dateParam,
  defaultBigQueryClient,
  intParam,
  stringArrayParam,
  stringParam,
} from "../shared/bigQuery";

export interface HostAnalyticsBigQueryRange {
  startDate: string;
  endDate: string;
}

export interface HostAnalyticsBigQueryScope {
  organizerIds: string[];
  eventId: string | null;
}

export interface HostAnalyticsMartRow {
  date: string;
  organizerId: string;
  organizerName: string | null;
  eventId: string | null;
  eventTitle: string | null;
  eventStartTime: string | null;
  eventStatus: string | null;
  capacityLimit: number;
  bookedCount: number;
  checkedInCount: number;
  waitlistedCount: number;
  grossRevenueMinor: number;
  currency: string | null;
  checkoutStartedCount: number;
  checkoutDropoffCount: number;
  paymentCompletedCount: number;
  paymentFailedCount: number;
  paymentRefundedCount: number;
  reviewCount: number;
  ratingTotal: number;
  verifiedReviewCount: number;
  publicReviewCount: number;
  ownerResponseCount: number;
  demandCount: number;
  inviteOpenCount: number;
  mutualMatchCount: number;
  chatStartedCount: number;
  repeatAttendeeCount: number;
  listingViews: number;
  searchAppearances: number;
  eventViews: number;
  organizerSaves: number;
  eventSaves: number;
  contactClicks: number;
  claimClicks: number;
  outboundClicks: number;
  outboundBookingClicks?: number;
  linkClicks: number;
}

/** Owner link clicks for one organizer, link and traffic source. */
export interface HostAnalyticsLinkRow {
  organizerId: string;
  linkId: string;
  trafficSource: string | null;
  linkClicks: number;
}

export interface HostAnalyticsBigQuerySource {
  loadRows(
    range: HostAnalyticsBigQueryRange,
    scope: HostAnalyticsBigQueryScope,
  ): Promise<HostAnalyticsMartRow[]>;
  loadLinkRows(
    range: HostAnalyticsBigQueryRange,
    organizerIds: string[],
  ): Promise<HostAnalyticsLinkRow[]>;
}

interface RawHostAnalyticsMartRow {
  date: string;
  organizerId: string;
  organizerName: string | null;
  eventId: string | null;
  eventTitle: string | null;
  eventStartTime: string | null;
  eventStatus: string | null;
  capacityLimit: string | number | null;
  bookedCount: string | number | null;
  checkedInCount: string | number | null;
  waitlistedCount: string | number | null;
  grossRevenueMinor: string | number | null;
  currency: string | null;
  checkoutStartedCount: string | number | null;
  checkoutDropoffCount: string | number | null;
  paymentCompletedCount: string | number | null;
  paymentFailedCount: string | number | null;
  paymentRefundedCount: string | number | null;
  reviewCount: string | number | null;
  ratingTotal: string | number | null;
  verifiedReviewCount: string | number | null;
  publicReviewCount: string | number | null;
  ownerResponseCount: string | number | null;
  demandCount: string | number | null;
  inviteOpenCount: string | number | null;
  mutualMatchCount: string | number | null;
  chatStartedCount: string | number | null;
  repeatAttendeeCount: string | number | null;
  listingViews: string | number | null;
  searchAppearances: string | number | null;
  eventViews: string | number | null;
  organizerSaves: string | number | null;
  eventSaves: string | number | null;
  contactClicks: string | number | null;
  claimClicks: string | number | null;
  outboundClicks: string | number | null;
  outboundBookingClicks?: string | number | null;
  linkClicks?: string | number | null;
}

interface RawHostAnalyticsLinkRow {
  organizerId: string;
  linkId: string;
  trafficSource: string | null;
  linkClicks: string | number | null;
}

export class BigQueryHostAnalyticsSource
implements HostAnalyticsBigQuerySource {
  constructor(
    private readonly client: BigQueryClient = defaultBigQueryClient,
    private readonly table = hostAnalyticsMartTable(),
    private readonly linkTable = hostAnalyticsLinkMartTable(),
  ) {}

  async loadRows(
    range: HostAnalyticsBigQueryRange,
    scope: HostAnalyticsBigQueryScope,
  ): Promise<HostAnalyticsMartRow[]> {
    if (scope.organizerIds.length === 0) return [];
    const rows = await this.client.query<RawHostAnalyticsMartRow>(
      hostAnalyticsRowsSql(this.table),
      [
        dateParam("startDate", range.startDate),
        dateParam("endDate", range.endDate),
        stringArrayParam("organizerIds", scope.organizerIds),
        stringParam("eventId", scope.eventId),
        intParam("limit", 5000),
      ],
    );
    return rows.map(normalizeMartRow);
  }

  async loadLinkRows(
    range: HostAnalyticsBigQueryRange,
    organizerIds: string[],
  ): Promise<HostAnalyticsLinkRow[]> {
    if (organizerIds.length === 0) return [];
    const rows = await this.client.query<RawHostAnalyticsLinkRow>(
      hostAnalyticsLinkRowsSql(this.linkTable),
      [
        dateParam("startDate", range.startDate),
        dateParam("endDate", range.endDate),
        stringArrayParam("organizerIds", organizerIds),
        intParam("limit", 2000),
      ],
    );
    return rows.map((row) => ({
      organizerId: row.organizerId,
      linkId: row.linkId,
      trafficSource: row.trafficSource,
      linkClicks: numberValue(row.linkClicks),
    }));
  }
}

export const defaultHostAnalyticsBigQuerySource =
  new BigQueryHostAnalyticsSource();

export function hostAnalyticsRowsSql(table: string): string {
  // Serialize the range variable rather than reference the additive column:
  // pre-migration schemas and unrefreshed NULL rows remain unknown, not zero.
  const optionalBookingClicks = "SAFE_CAST(JSON_VALUE(" +
    "TO_JSON_STRING(martRow), '$.outbound_booking_clicks') AS INT64)";
  const optionalLinkClicks = "SAFE_CAST(JSON_VALUE(" +
    "TO_JSON_STRING(martRow), '$.link_clicks') AS INT64)";
  return `
SELECT
  CAST(date AS STRING) AS date,
  club_id AS organizerId,
  ANY_VALUE(club_name) AS organizerName,
  event_id AS eventId,
  ANY_VALUE(event_title) AS eventTitle,
  CAST(ANY_VALUE(event_start_time) AS STRING) AS eventStartTime,
  ANY_VALUE(event_status) AS eventStatus,
  SUM(capacity_limit) AS capacityLimit,
  SUM(booked_count) AS bookedCount,
  SUM(checked_in_count) AS checkedInCount,
  SUM(waitlisted_count) AS waitlistedCount,
  SUM(gross_revenue_minor) AS grossRevenueMinor,
  COALESCE(ANY_VALUE(currency), 'INR') AS currency,
  SUM(checkout_started_count) AS checkoutStartedCount,
  SUM(checkout_dropoff_count) AS checkoutDropoffCount,
  SUM(payment_completed_count) AS paymentCompletedCount,
  SUM(payment_failed_count) AS paymentFailedCount,
  SUM(payment_refunded_count) AS paymentRefundedCount,
  SUM(review_count) AS reviewCount,
  SUM(rating_total) AS ratingTotal,
  SUM(verified_review_count) AS verifiedReviewCount,
  SUM(public_review_count) AS publicReviewCount,
  SUM(owner_response_count) AS ownerResponseCount,
  SUM(demand_count) AS demandCount,
  SUM(invite_open_count) AS inviteOpenCount,
  SUM(mutual_match_count) AS mutualMatchCount,
  SUM(chat_started_count) AS chatStartedCount,
  SUM(repeat_attendee_count) AS repeatAttendeeCount,
  SUM(listing_views) AS listingViews,
  SUM(search_appearances) AS searchAppearances,
  SUM(event_views) AS eventViews,
  SUM(organizer_saves) AS organizerSaves,
  SUM(event_saves) AS eventSaves,
  SUM(contact_clicks) AS contactClicks,
  SUM(claim_clicks) AS claimClicks,
  SUM(outbound_clicks) AS outboundClicks,
  CASE WHEN COUNT(*) = COUNT(${optionalBookingClicks})
    THEN SUM(${optionalBookingClicks})
    ELSE NULL END AS outboundBookingClicks,
  COALESCE(SUM(${optionalLinkClicks}), 0) AS linkClicks
FROM \`${table}\` AS martRow
WHERE date >= @startDate
  AND date <= @endDate
  AND club_id IN UNNEST(@organizerIds)
  AND (@eventId IS NULL OR event_id = @eventId)
GROUP BY date, club_id, event_id
ORDER BY date ASC
LIMIT @limit`;
}

export function hostAnalyticsLinkRowsSql(table: string): string {
  return `
SELECT
  club_id AS organizerId,
  link_id AS linkId,
  traffic_source AS trafficSource,
  SUM(link_clicks) AS linkClicks
FROM \`${table}\`
WHERE date >= @startDate
  AND date <= @endDate
  AND club_id IN UNNEST(@organizerIds)
GROUP BY club_id, link_id, traffic_source
ORDER BY linkClicks DESC
LIMIT @limit`;
}

function normalizeMartRow(
  row: RawHostAnalyticsMartRow,
): HostAnalyticsMartRow {
  return {
    date: row.date,
    organizerId: row.organizerId,
    organizerName: row.organizerName,
    eventId: row.eventId,
    eventTitle: row.eventTitle,
    eventStartTime: row.eventStartTime,
    eventStatus: row.eventStatus,
    capacityLimit: numberValue(row.capacityLimit),
    bookedCount: numberValue(row.bookedCount),
    checkedInCount: numberValue(row.checkedInCount),
    waitlistedCount: numberValue(row.waitlistedCount),
    grossRevenueMinor: numberValue(row.grossRevenueMinor),
    currency: row.currency,
    checkoutStartedCount: numberValue(row.checkoutStartedCount),
    checkoutDropoffCount: numberValue(row.checkoutDropoffCount),
    paymentCompletedCount: numberValue(row.paymentCompletedCount),
    paymentFailedCount: numberValue(row.paymentFailedCount),
    paymentRefundedCount: numberValue(row.paymentRefundedCount),
    reviewCount: numberValue(row.reviewCount),
    ratingTotal: numberValue(row.ratingTotal),
    verifiedReviewCount: numberValue(row.verifiedReviewCount),
    publicReviewCount: numberValue(row.publicReviewCount),
    ownerResponseCount: numberValue(row.ownerResponseCount),
    demandCount: numberValue(row.demandCount),
    inviteOpenCount: numberValue(row.inviteOpenCount),
    mutualMatchCount: numberValue(row.mutualMatchCount),
    chatStartedCount: numberValue(row.chatStartedCount),
    repeatAttendeeCount: numberValue(row.repeatAttendeeCount),
    listingViews: numberValue(row.listingViews),
    searchAppearances: numberValue(row.searchAppearances),
    eventViews: numberValue(row.eventViews),
    organizerSaves: numberValue(row.organizerSaves),
    eventSaves: numberValue(row.eventSaves),
    contactClicks: numberValue(row.contactClicks),
    claimClicks: numberValue(row.claimClicks),
    outboundClicks: numberValue(row.outboundClicks),
    outboundBookingClicks: row.outboundBookingClicks == null ?
      undefined : numberValue(row.outboundBookingClicks),
    linkClicks: numberValue(row.linkClicks ?? null),
  };
}

function numberValue(value: string | number | null): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function hostAnalyticsMartTable(): string {
  return process.env.HOST_ANALYTICS_MART_TABLE ||
    `${hostAnalyticsDatasetPath()}.mart_host_event_daily`;
}

function hostAnalyticsLinkMartTable(): string {
  return process.env.HOST_ANALYTICS_LINK_MART_TABLE ||
    `${hostAnalyticsDatasetPath()}.mart_host_link_daily`;
}

function hostAnalyticsDatasetPath(): string {
  const project = process.env.HOST_ANALYTICS_BIGQUERY_PROJECT_ID ||
    process.env.BIGQUERY_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.GCP_PROJECT ||
    "catch-dating-app-64e51";
  const dataset = process.env.HOST_ANALYTICS_BIGQUERY_DATASET ||
    "catch_analytics";
  return `${project}.${dataset}`;
}
