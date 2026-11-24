import {AdSpendError, spendDays, type AdSpendRow} from "./adSpend";

/**
 * Google Ads spend for Finance and Growth, read with the Google Ads API's
 * `googleAds:search` (GAQL) at campaign level, the REST shape
 * `tool/ads/apply_google_campaigns.mjs` uses. The caller passes an access
 * token for the ads service account with the `adwords` scope.
 */
const googleAdsApi = "https://googleads.googleapis.com/v24";
/** Pages of campaign-day rows read at most; each holds up to 10,000. */
const maxPages = 10;

/**
 * The month's spend per campaign, in minor units of the account's currency,
 * which must be INR. A running month is read up to today.
 * @param {object} input Token, customer, month, now and fetch.
 * @return {Promise<AdSpendRow[]>} Spend per campaign, campaigns without
 *     spend left out.
 */
export async function fetchGoogleAdSpend(input: {
  accessToken: string; customerId: string; month: string; nowMillis: number;
  fetchImpl?: typeof fetch;
}): Promise<AdSpendRow[]> {
  if (!/^[0-9]{10}$/u.test(input.customerId)) {
    throw new AdSpendError("google_customer_invalid");
  }
  if (!input.accessToken || /[\r\n]/u.test(input.accessToken)) {
    throw new AdSpendError("google_credential_unavailable");
  }
  const days = spendDays(input.month, input.nowMillis);
  if (!days) return [];
  // The dates are validated YYYY-MM-DD strings, never caller text.
  const query = "SELECT customer.currency_code, campaign.id, campaign.name, " +
    "segments.date, metrics.cost_micros FROM campaign WHERE segments.date " +
    `BETWEEN '${days.since}' AND '${days.until}' AND metrics.cost_micros > 0`;
  const micros = new Map<string, {name: string; micros: number}>();
  let pageToken: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    let response: Response;
    try {
      response = await (input.fetchImpl ?? fetch)(
        `${googleAdsApi}/customers/${input.customerId}/googleAds:search`, {
          method: "POST", redirect: "error",
          headers: {"Authorization": `Bearer ${input.accessToken}`,
            "Content-Type": "application/json"},
          body: JSON.stringify({query, ...(pageToken ? {pageToken} : {})}),
          signal: AbortSignal.timeout(20_000)});
    } catch {
      throw new AdSpendError("google_transport");
    }
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      throw new AdSpendError(`google_http_${response.status}`);
    }
    const body = await response.json().catch(() => null) as
      {results?: unknown; nextPageToken?: unknown} | null;
    if (!body || (body.results !== undefined &&
        !Array.isArray(body.results))) {
      throw new AdSpendError("google_malformed");
    }
    for (const raw of (body.results ?? []) as unknown[]) {
      const row = raw as {customer?: {currencyCode?: unknown};
        campaign?: {id?: unknown; name?: unknown};
        metrics?: {costMicros?: unknown}};
      if (row.customer?.currencyCode !== "INR") {
        throw new AdSpendError("google_currency_not_inr");
      }
      const id = String(row.campaign?.id ?? "");
      const cost = Number(row.metrics?.costMicros ?? 0);
      if (!/^[0-9]{1,20}$/u.test(id) || !Number.isFinite(cost) || cost < 0) {
        throw new AdSpendError("google_malformed");
      }
      const entry = micros.get(id) ??
        {name: String(row.campaign?.name ?? "Campaign").slice(0, 120),
          micros: 0};
      entry.micros += cost;
      micros.set(id, entry);
    }
    if (typeof body.nextPageToken !== "string" || !body.nextPageToken) {
      // One INR is a million micros and a hundred paise.
      return [...micros.values()].map((entry) => ({campaignName: entry.name,
        spendMinor: Math.round(entry.micros / 10_000)}));
    }
    pageToken = body.nextPageToken;
  }
  throw new AdSpendError("google_too_many_rows");
}
