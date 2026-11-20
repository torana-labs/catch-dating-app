import {renderHook, waitFor} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {loadPlaybookPage, resolvePlaybookPage} from "./playbookPages";
import {playbookFormsPreviewRequested, usePlaybookTryItReveal} from "./usePlaybookTryItReveal";

const forms = (await loadPlaybookPage(resolvePlaybookPage("/product/forms/")!))!;
const bookings = (await loadPlaybookPage(resolvePlaybookPage("/product/bookings-and-memberships/")!))!;

afterEach(() => window.history.replaceState(null, "", "/"));

describe("the Forms page's owner preview", () => {
  it("is asked for by tryit=forms and nothing else", () => {
    expect(playbookFormsPreviewRequested("?tryit=forms")).toBe(true);
    expect(playbookFormsPreviewRequested("?utm_source=x&tryit=forms")).toBe(true);
    for (const search of ["", "?tryit=", "?tryit=Forms", "?tryit=bookings", "?try=forms"]) expect(playbookFormsPreviewRequested(search), search).toBe(false);
  });

  it("gives the Forms page with its try band after mount when the address asks for it", async () => {
    window.history.replaceState(null, "", "/product/forms/?tryit=forms");
    expect(forms.sections.some((section) => section.id === "try")).toBe(false);
    const {result} = renderHook(() => usePlaybookTryItReveal(forms));
    await waitFor(() => expect(result.current).not.toBeNull());
    const ids = result.current!.sections.map((section) => section.id);
    expect(ids).toContain("try");
    expect(ids).not.toContain("start-try");
    expect(JSON.stringify(result.current)).not.toContain("{{brand.");
  });

  it("gives nothing without the parameter, or on another page", async () => {
    window.history.replaceState(null, "", "/product/forms/");
    const plain = renderHook(() => usePlaybookTryItReveal(forms));
    window.history.replaceState(null, "", "/product/bookings-and-memberships/?tryit=forms");
    const other = renderHook(() => usePlaybookTryItReveal(bookings));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(plain.result.current).toBeNull();
    expect(other.result.current).toBeNull();
  });
});
