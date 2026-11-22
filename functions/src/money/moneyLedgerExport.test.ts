import assert from "node:assert/strict";
import test from "node:test";
import {csvField, istDate, ledgerCsv} from "./moneyLedgerExport";

test("ledger rows render as CSV in rupees, oldest first", () => {
  const csv = ledgerCsv([
    {date: "2026-11-03", type: "Payment received", reference: "2026-27/031",
      party: "Moonmoth", description: "Paid by Razorpay payment link",
      amountMinor: 1_000_000, gstMinor: 0, status: "paid"},
    {date: "2026-11-01", type: "Invoice", reference: "2026-27/031",
      party: "Lantern Lane, Social", description: "Commission for 2026-10",
      amountMinor: 640_050, gstMinor: 0, status: "sent"},
  ]);
  assert.equal(csv, [
    "Date,Type,Reference,Party,Description,Amount (INR),GST (INR),Status",
    "2026-11-01,Invoice,2026-27/031,\"Lantern Lane, Social\"," +
      "Commission for 2026-10,6400.50,0.00,sent",
    "2026-11-03,Payment received,2026-27/031,Moonmoth," +
      "Paid by Razorpay payment link,10000.00,0.00,paid",
  ].join("\n") + "\n");
});

test("CSV fields defuse spreadsheet formulas and quote separators", () => {
  assert.equal(csvField("=HYPERLINK(1)"), "'=HYPERLINK(1)");
  assert.equal(csvField("-12.50"), "-12.50");
  assert.equal(csvField("say \"hi\""), "\"say \"\"hi\"\"\"");
  assert.equal(istDate(Date.UTC(2026, 9, 31, 19)), "2026-11-01");
});
