import {brand} from "../../content/brand.ts";
import type {PlaybookPageDocument} from "../../content/playbook/playbookContract.ts";
import {playbookHref} from "./playbookHrefs.ts";

/**
 * A page's JSON-LD: a FAQPage for its questions bands and a BreadcrumbList
 * for its breadcrumb row, or null when it has neither. `page` has its brand
 * tokens resolved.
 */
export function playbookStructuredData(page: PlaybookPageDocument, canonicalPath: string, origin: string = brand.web.origin): object | null {
  const graph: object[] = [];
  const questions = page.sections.flatMap((section) => section.type === "faq" ? section.items : []);
  if (questions.length > 0) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: questions.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {"@type": "Answer", text: item.answer},
      })),
    });
  }
  const crumbs = page.header.breadcrumbs;
  if (crumbs) {
    const items = [
      {name: brand.name, path: "/"},
      ...crumbs.links.map((link) => ({name: link.label, path: playbookHref(link.to)})),
      {name: crumbs.current, path: canonicalPath},
    ];
    graph.push({
      "@type": "BreadcrumbList",
      itemListElement: items.map((item, index) => ({"@type": "ListItem", position: index + 1, name: item.name, item: `${origin}${item.path}`})),
    });
  }
  return graph.length > 0 ? {"@context": "https://schema.org", "@graph": graph} : null;
}
