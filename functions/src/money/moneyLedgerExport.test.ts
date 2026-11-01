import assert from "node:assert/strict";
import test from "node:test";
import {csvField, istDate, ledgerCsv} from "./moneyLedgerExport";
import {fetchMetaAdSpend} from "./metaAdSpend";

test("ledger rows render as CSV in rupees, oldest first", () => {
  const csv = ledgerCsv([
    {date: "2026-11-03", type: "Payment received", reference: "2026-27/031",
      party: "Afterfly", description: "Paid by Razorpay payment link",
      amountMinor: 1_000_000, gstMinor: 0, status: "paid"},
    {date: "2026-11-01", type: "Invoice", reference: "2026-27/031",
      party: "Lantern Lane, Social", description: "Commission for 2026-10",
      amountMinor: 640_050, gstMinor: 0, status: "sent"},
  ]);
  assert.equal(csv, [
    "Date,Type,Reference,Party,Description,Amount (INR),GST (INR),Status",
    "2026-11-01,Invoice,2026-27/031,\"Lantern Lane, Social\"," +
      "Commission for 2026-10,6400.50,0.00,sent",
    "2026-11-03,Payment received,2026-27/031,Afterfly," +
      "Paid by Razorpay payment link,10000.00,0.00,paid",
  ].join("\n") + "\n");
});

test("CSV fields defuse spreadsheet formulas and quote separators", () => {
  assert.equal(csvField("=HYPERLINK(1)"), "'=HYPERLINK(1)");
  assert.equal(csvField("-12.50"), "-12.50");
  assert.equal(csvField("say \"hi\""), "\"say \"\"hi\"\"\"");
  assert.equal(istDate(Date.UTC(2026, 9, 31, 19)), "2026-11-01");
});

test("Meta spend reads campaign rows into minor units", async () => {
  let url = "";
  const rows = await fetchMetaAdSpend({accessToken: "t", adAccountId:
    "act_123", month: "2026-10", fetchImpl: (async (input: string) => {
      url = input;
      return new Response(JSON.stringify({data: [
        {campaign_name: "Host launch · Mumbai", spend: "31500.00"},
        {campaign_name: "Claim your page", spend: "11200.5"}]}));
    }) as unknown as typeof fetch});
  assert.deepEqual(rows, [
    {campaignName: "Host launch · Mumbai", spendMinor: 3_150_000},
    {campaignName: "Claim your page", spendMinor: 1_120_050}]);
  assert.match(decodeURIComponent(url),
    /act_123\/insights\?.*"since":"2026-10-01","until":"2026-10-31"/u);
  await assert.rejects(fetchMetaAdSpend({accessToken: "t",
    adAccountId: "123", month: "2026-10"}));
  await assert.rejects(fetchMetaAdSpend({accessToken: "t",
    adAccountId: "act_1", month: "2026-10", fetchImpl: (async () =>
      new Response("no", {status: 400})) as unknown as typeof fetch}));
});
