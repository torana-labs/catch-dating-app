import {describe, expect, it} from "vitest";
import {publishedLegalContent} from "./legal";
import {marketingConsentPreferencesCopy} from "./marketingConsent";

/** The owner's exact privacy-notice line for organiser-owned tags (#2063, 19 Nov 2026). */
const line = "Organiser pages may run the organiser's own Meta and Google tags if you accept marketing cookies.";

describe("organiser-owned tags notice", () => {
  it("is named in the consent banner's details", () => {
    expect(marketingConsentPreferencesCopy.body).toContain(line);
  });

  it("is in the privacy policy's sharing and cookies section", () => {
    const section = publishedLegalContent.pages.privacy.sections.find((candidate) => candidate.paragraphs.includes(line));
    expect(section?.heading).toMatch(/cookies/iu);
  });
});
