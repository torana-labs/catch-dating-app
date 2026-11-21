import {expect, it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {adMatchingNoticeCopy, publishedLegalContent} from "../../content/legal";
import {LegalPage} from "./LegalPage";
import {brand} from "@catch/brand";

it.each(["help", "privacy", "terms", "account_deletion", "refunds", "contact"] as const)("renders a changed %s contact in text and every mailto without rebuilding", page => {
  const source = publishedLegalContent.pages[page];
  const first = renderToStaticMarkup(<LegalPage page={source} effectiveDate={publishedLegalContent.effectiveDate}
    contact={{supportEmail: brand.support.email}} />);
  const changed = renderToStaticMarkup(<LegalPage page={source} effectiveDate={publishedLegalContent.effectiveDate}
    contact={{supportEmail: "support@example.org"}} />);
  expect(first).toContain(`mailto:${brand.support.email}`);
  expect(changed).toContain("mailto:support@example.org");
  expect(changed).toContain("support@example.org");
  expect(changed).not.toContain(brand.support.email);
  expect(changed).not.toContain(`suvrat@${brand.web.domain}`);
  expect((changed.match(/mailto:support@example.org/gu) ?? []).length).toBe(1);
});

it("renders section links as navigable anchors", () => {
  const markup = renderToStaticMarkup(<LegalPage page={publishedLegalContent.pages.help}
    effectiveDate={publishedLegalContent.effectiveDate} />);
  expect(markup).toContain('href="/delete-account/"');
});

it("gives the privacy policy advertising section the anchor the ad-matching notice links to", () => {
  const markup = renderToStaticMarkup(<LegalPage page={publishedLegalContent.pages.privacy}
    effectiveDate={publishedLegalContent.effectiveDate} />);
  const anchor = adMatchingNoticeCopy.href.split("#")[1];
  expect(adMatchingNoticeCopy.href.startsWith(publishedLegalContent.pages.privacy.path)).toBe(true);
  expect(markup).toContain(`id="${anchor}"`);
  const section = markup.slice(markup.indexOf(`id="${anchor}"`));
  expect(section).toContain("Advertising partners.");
  expect(section).toContain("stop sending your data to advertising partners");
});
