import {describe, expect, it} from "vitest";
import {publishedLegalContent} from "./legal";
import {marketingConsentPreferencesCopy} from "./marketingConsent";

/** Microsoft Clarity loads with site analytics, so the banner and the privacy policy name it (consent receipt v7). */
describe("Microsoft Clarity notice", () => {
  it("is named in the consent banner's details, with its cookie lifetime and form masking", () => {
    expect(marketingConsentPreferencesCopy.body).toMatch(/Google Analytics and Microsoft Clarity/u);
    expect(marketingConsentPreferencesCopy.body).toMatch(/Clarity's up to a year/u);
    expect(marketingConsentPreferencesCopy.body).toMatch(/typed into forms hidden/u);
  });

  it("is in the privacy policy's sharing and cookies section", () => {
    const section = publishedLegalContent.pages.privacy.sections.find((candidate) =>
      candidate.paragraphs.some((paragraph) => paragraph.includes("Microsoft Clarity")));
    expect(section?.heading).toMatch(/cookies/iu);
  });
});
