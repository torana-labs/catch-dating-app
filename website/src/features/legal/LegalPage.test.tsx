import {expect, it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {publishedLegalContent} from "../../content/legal";
import {LegalPage} from "./LegalPage";

it.each(["help", "privacy", "terms", "account_deletion"] as const)("renders a changed %s contact in text and every mailto without rebuilding", page => {
  const source = publishedLegalContent.pages[page];
  const first = renderToStaticMarkup(<LegalPage page={source} effectiveDate={publishedLegalContent.effectiveDate}
    contact={{supportEmail: "suvrat.garg@gmail.com"}} />);
  const changed = renderToStaticMarkup(<LegalPage page={source} effectiveDate={publishedLegalContent.effectiveDate}
    contact={{supportEmail: "support@example.org"}} />);
  expect(first).toContain("mailto:suvrat.garg@gmail.com");
  expect(changed).toContain("mailto:support@example.org");
  expect(changed).toContain("support@example.org");
  expect(changed).not.toContain("suvrat.garg@gmail.com");
  expect(changed).not.toContain("suvrat@catchdates.com");
  expect((changed.match(/mailto:support@example.org/gu) ?? []).length).toBe(1);
});

it("renders section links as navigable anchors", () => {
  const markup = renderToStaticMarkup(<LegalPage page={publishedLegalContent.pages.help}
    effectiveDate={publishedLegalContent.effectiveDate} />);
  expect(markup).toContain('href="/delete-account/"');
});
