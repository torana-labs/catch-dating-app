import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import test from "node:test";
import {foundingHostTrialDays} from "../foundingHosts/foundingHostOffer";
import {referralTrialDays} from "../money/organizerReferrals";
import {testCommercialTerms} from "./testFixture";

// The website states the host fee from its own figures
// (website/src/content/pricing.ts: rate, cap, billing cycle and free days)
// and the fee calculator works from them. The backend bills from the
// platform's commercial terms, whose reviewed values are kept in code as
// testCommercialTerms() (the owner's decision; production reads them from
// Firestore), and grants the founding and referral trials from its own
// constants. A change on one side without the other fails here (#2062 C7).

function websitePricing(): Record<string, number> {
  const source = readFileSync(path.join(__dirname,
    "../../../website/src/content/pricing.ts"), "utf8");
  const block = /export const hostPricing = \{([\s\S]*?)\} as const;/u
    .exec(source)?.[1];
  assert.ok(block, "website pricing.ts declares hostPricing");
  const figures: Record<string, number> = {};
  for (const match of block.matchAll(/^\s*([A-Za-z]+):\s*([\d_]+),/gmu)) {
    figures[match[1]] = Number(match[2].replace(/_/gu, ""));
  }
  return figures;
}

test("the website's host fee figures match the backend's reviewed terms",
  () => {
    const site = websitePricing();
    const terms = testCommercialTerms();
    assert.deepEqual(site, {
      rateBasisPoints: terms.commission.rateBasisPoints,
      // The site states the cap in whole rupees; terms hold minor units.
      cap: terms.commission.capMinor! / 100,
      cycleDays: terms.commission.cycleDays,
      trialDays: terms.trial.days,
      foundingTrialDays: foundingHostTrialDays,
      referralTrialDays,
    });
    assert.equal(terms.currency, "INR",
      "the site's cap is in rupees; a currency change needs both sides");
  });
