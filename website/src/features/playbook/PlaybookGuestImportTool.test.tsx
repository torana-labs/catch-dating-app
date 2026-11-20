import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {cleanup, fireEvent, render as renderInto, within} from "@testing-library/react";
import {StrictMode, type ReactNode} from "react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {guestImportTryItCopy} from "@content/guestImportTryIt";
import {guestImportFixtures, guestSampleCsv, scriptedGuestClient} from "../../stories/fixtures/guestImportTryIt";
import {provideGuestImportDeps} from "../guestImportTryIt/useGuestImportController";
import {loadPlaybookPage, resolvePlaybookPage} from "./playbookPages";
import {PlaybookPage} from "./PlaybookPage";

vi.mock("../../firebase", () => ({getWebsiteAppCheckToken: vi.fn(async () => "site-token")}));

afterEach(cleanup);

const render = (node: ReactNode) => renderInto(<StrictMode><QueryClientProvider client={new QueryClient()}>{node}</QueryClientProvider></StrictMode>);

const guests = (await loadPlaybookPage(resolvePlaybookPage("/product/guest-records/")!))!;

describe("guest list try-it tool on Guest records", () => {
  it("draws the upload in the try band, and links the hero and the closing band to it", () => {
    render(<PlaybookPage captures={{}} page={guests} />);
    const band = within(document.getElementById("try")!);
    expect(band.getByRole("heading", {name: guestImportTryItCopy.title})).toBeTruthy();
    expect(band.getByRole("form", {name: guestImportTryItCopy.title})).toBeTruthy();
    expect(band.getByText(guestImportTryItCopy.where)).toBeTruthy();
    expect(within(document.getElementById("top")!).getByRole("link", {name: "Try it with an old guest list"}).getAttribute("href")).toBe("#try");
    expect(within(document.getElementById("start")!).getByRole("link", {name: "Upload a guest list"}).getAttribute("href")).toBe("#try");
    expect(document.getElementById("start-try")).toBeNull();
  });

  it("previews the chosen list from the try band", async () => {
    const client = scriptedGuestClient({"guests.import-list": {preview: [guestImportFixtures.previewed]}});
    render(provideGuestImportDeps({client}, <PlaybookPage captures={{}} page={guests} />));
    const band = document.getElementById("try")!;
    fireEvent.change(band.querySelector("input[type=file]")!, {target: {files: [new File([guestSampleCsv], "salt-air-guests.csv")]}});
    fireEvent.click(within(band).getByRole("button", {name: "Read my list"}));
    expect(await within(band).findByText(guestImportFixtures.previewed.summary.headline)).toBeTruthy();
  });
});
