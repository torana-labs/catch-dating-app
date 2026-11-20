import {useEffect, useState} from "react";
import {applyBrand} from "../../content/brand.ts";
import {productPlaybookPages} from "../../content/playbook/pages/product/index.ts";
import {livePlaybookPage, validatedPlaybookPage, type PlaybookPageDocument} from "../../content/playbook/playbookContract.ts";

/**
 * The Forms page's owner preview: on /product/forms/?tryit=forms its hidden
 * try band shows, with the form tool (form.import-from-link) treated as
 * website-ready on that page only (playbookLeadForms.ts:
 * playbookFormsPreviewToolSlot), so the owner can try the tool on the live
 * site before it ships. It is not a feature-flag system: one page, one
 * query value. The server and static HTML stay the hidden page; the band
 * appears only after hydration, when the browser's address carries the
 * value, by loading the page's own content file again and showing its `try`
 * band. Without the value nothing changes.
 */
export const playbookFormsPreview = {pageId: "product_forms", param: "tryit", value: "forms"} as const;

/** Whether this address asks for the Forms page's owner preview. */
export function playbookFormsPreviewRequested(search: string): boolean {
  return new URLSearchParams(search).get(playbookFormsPreview.param) === playbookFormsPreview.value;
}

/** The Forms page as written, with its `try` band shown and the rest as the live site draws it. */
export function playbookFormsPreviewPage(raw: unknown): PlaybookPageDocument {
  const page = validatedPlaybookPage(raw);
  const sections = page.sections.map((section) => section.id === "try" ? {...section, status: "built" as const} : section);
  return applyBrand(livePlaybookPage({...page, sections}));
}

/**
 * The page to draw in place of `page`: the Forms page's owner preview once
 * the browser's address asks for it, otherwise null. Read after mount, so
 * the first render matches the static HTML.
 */
export function usePlaybookTryItReveal(page: PlaybookPageDocument): PlaybookPageDocument | null {
  const [preview, setPreview] = useState<PlaybookPageDocument | null>(null);
  useEffect(() => {
    if (page.id !== playbookFormsPreview.pageId) return undefined;
    let requested = false;
    try {
      requested = playbookFormsPreviewRequested(window.location.search);
    } catch {
      requested = false;
    }
    if (!requested) return undefined;
    let current = true;
    productPlaybookPages[playbookFormsPreview.pageId].load()
      .then((module) => {
        if (current) setPreview(playbookFormsPreviewPage(module.default));
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [page.id]);
  return preview && preview.id === page.id ? preview : null;
}
