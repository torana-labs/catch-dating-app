import {AdSpendError, spendDays, type AdSpendRow} from "./adSpend";

/**
 * Meta ad spend for Finance and Growth, read from the Marketing API's ad
 * account insights at campaign level. `importAdSpendDaily`
 * (`adSpendImport.ts`) calls it each morning with the CatchAds system-user
 * token the conversion queue pins.
 */
const graphVersion = "v26.0";

/**
 * The month's spend per campaign, in minor units of the ad account's
 * currency, which must be INR. A running month is read up to today.
 * @param {object} input Token, account, month, now and fetch.
 * @return {Promise<AdSpendRow[]>} Spend per campaign.
 */
export async function fetchMetaAdSpend(input: {
  accessToken: string; adAccountId: string; month: string; nowMillis: number;
  fetchImpl?: typeof fetch;
}): Promise<AdSpendRow[]> {
  if (!/^act_[0-9]{1,30}$/u.test(input.adAccountId)) {
    throw new AdSpendError("meta_account_invalid");
  }
  if (!input.accessToken || /[\r\n]/u.test(input.accessToken)) {
    throw new AdSpendError("meta_credential_unavailable");
  }
  const days = spendDays(input.month, input.nowMillis);
  if (!days) return [];
  const params = new URLSearchParams({level: "campaign",
    fields: "campaign_name,spend,account_currency", limit: "500",
    time_range: JSON.stringify(days)});
  let response: Response;
  try {
    response = await (input.fetchImpl ?? fetch)(
      `https://graph.facebook.com/${graphVersion}/${input.adAccountId}` +
      `/insights?${params}`, {headers: {
        Authorization: `Bearer ${input.accessToken}`}, redirect: "error",
      signal: AbortSignal.timeout(20_000)});
  } catch {
    throw new AdSpendError("meta_transport");
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    throw new AdSpendError(`meta_http_${response.status}`);
  }
  const body = await response.json().catch(() => null) as
    {data?: unknown; paging?: {next?: unknown}} | null;
  if (!Array.isArray(body?.data)) throw new AdSpendError("meta_malformed");
  // 500 campaigns with delivery in one month is far beyond Catch's account;
  // a second page means the total would be short, so refuse it.
  if (body.paging?.next) throw new AdSpendError("meta_too_many_campaigns");
  return body.data.map((raw) => {
    const row = raw as Record<string, unknown>;
    if (row.account_currency !== undefined && row.account_currency !== "INR") {
      throw new AdSpendError("meta_currency_not_inr");
    }
    const spend = Number(row.spend);
    if (!Number.isFinite(spend) || spend < 0) {
      throw new AdSpendError("meta_malformed");
    }
    return {campaignName: String(row.campaign_name ?? "Campaign")
      .slice(0, 120), spendMinor: Math.round(spend * 100)};
  });
}
