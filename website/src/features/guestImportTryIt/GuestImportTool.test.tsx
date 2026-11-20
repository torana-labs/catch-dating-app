import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {cleanup, fireEvent, render as renderInto, screen, waitFor, within} from "@testing-library/react";
import {StrictMode} from "react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {guestImportTryItCopy as copy} from "@content/guestImportTryIt";
import {tryItCopy} from "@content/tryIt";
import type {PlaybookLeadForm} from "../../content/playbook/playbookContract";
import {guestImportFixtures as fixtures, guestSampleCsv, scriptedGuestClient} from "../../stories/fixtures/guestImportTryIt";
import {guestImportToolNode} from "./GuestImportTool";
import {provideGuestImportDeps} from "./useGuestImportController";

vi.mock("../../firebase", () => ({getWebsiteAppCheckToken: vi.fn(async () => "site-token")}));

afterEach(cleanup);

const form: PlaybookLeadForm = {id: "try_guests", requestKind: "tool", input: "file", label: "Guest list (CSV or Excel)", submitLabel: "Read my list"};

function render(client: ReturnType<typeof scriptedGuestClient>): void {
  let key = 0;
  renderInto(
    <StrictMode>
      <QueryClientProvider client={new QueryClient()}>
        {provideGuestImportDeps({client, newKey: () => `web_key${String(++key).padStart(12, "0")}`},
          guestImportToolNode({form, pageId: "product_guests", sectionId: "try"}))}
      </QueryClientProvider>
    </StrictMode>,
  );
}

function chooseFile(name = "salt-air-guests.csv", text = guestSampleCsv) {
  const input = document.querySelector<HTMLInputElement>("input[type=file]")!;
  fireEvent.change(input, {target: {files: [new File([text], name, {type: "text/csv"})]}});
}

describe("guest list try-it tool", () => {
  it("shows the file step: what it takes and where the file goes", () => {
    render(scriptedGuestClient({}));
    expect(screen.getByRole("heading", {name: copy.title})).toBeTruthy();
    expect(screen.getByRole("form", {name: copy.title})).toBeTruthy();
    expect(screen.getByText(copy.accepts)).toBeTruthy();
    expect(screen.getByText(copy.where)).toBeTruthy();
    expect(document.querySelector("input[type=file]")?.getAttribute("accept")).toContain(".xlsx");
  });

  it("refuses a file over 5 MB in the browser, before any call", () => {
    const client = scriptedGuestClient({});
    render(client);
    const input = document.querySelector<HTMLInputElement>("input[type=file]")!;
    const big = new File(["x"], "guests.csv");
    Object.defineProperty(big, "size", {value: 6 * 1024 * 1024});
    fireEvent.change(input, {target: {files: [big]}});
    expect(screen.getByRole("alert").textContent).toBe(copy.fileTooLarge);
    expect(client.calls).toEqual([]);
  });

  it("asks for the phone step before sending the file", async () => {
    const client = scriptedGuestClient({"guests.import-list": {preview: [fixtures.previewed]}}, null);
    render(client);
    chooseFile();
    fireEvent.click(screen.getByRole("button", {name: form.submitLabel}));
    expect(await screen.findByRole("heading", {name: tryItCopy.account.title})).toBeTruthy();
    expect(screen.getByRole("button", {name: tryItCopy.account.continueWithPhone})).toBeTruthy();
    expect(client.calls).toEqual([]);
  });

  it("maps the columns, reviews the list and saves it into the draft event", async () => {
    const client = scriptedGuestClient({"guests.import-list": {preview: [fixtures.needsMapping, fixtures.previewed], apply: [fixtures.applied]}});
    render(client);
    chooseFile();
    expect(screen.getByText(/salt-air-guests\.csv/u)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {name: form.submitLabel}));
    const mapping = await screen.findByRole("form", {name: copy.mapping.title});
    fireEvent.click(within(mapping).getByRole("button", {name: copy.mapping.submit}));
    expect((await within(mapping).findByRole("alert")).textContent).toBe(copy.mapping.nameRequired);
    fireEvent.change(within(mapping).getByRole("combobox", {name: /Column for Name/u}), {target: {value: "0"}});
    fireEvent.click(within(mapping).getByRole("button", {name: copy.mapping.submit}));
    expect(await screen.findByText(fixtures.previewed.summary.headline)).toBeTruthy();
    expect(screen.getByText(copy.review.counts)).toBeTruthy();
    expect(screen.getByText(copy.review.merges.title)).toBeTruthy();
    expect(screen.getByText(fixtures.previewed.result.suggestions[0].label)).toBeTruthy();
    expect(screen.getByText(copy.review.tags.title)).toBeTruthy();
    expect(screen.getByText("Early bird")).toBeTruthy();
    expect(screen.getByText(copy.review.note)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {name: copy.review.confirm}));
    expect(await screen.findByText(fixtures.applied.summary.headline)).toBeTruthy();
    expect(screen.getByRole("heading", {name: tryItCopy.claimInHost.title})).toBeTruthy();
    await waitFor(() => expect(client.calls.filter((call) => call.mode === "apply")).toHaveLength(1));
    const [apply] = client.calls.filter((call) => call.mode === "apply");
    expect(apply.previewHash).toBe(fixtures.previewed.previewHash);
    expect((apply.input as {mapping: unknown}).mapping).toEqual({displayName: 0, phone: 1, email: 2, ticketType: null});
  });

  it("lists rows that need a look and lets the visitor leave them out before saving", async () => {
    const client = scriptedGuestClient({"guests.import-list": {preview: [fixtures.needsReview, fixtures.withLeftOut], apply: [fixtures.applied]}});
    render(client);
    chooseFile();
    fireEvent.click(screen.getByRole("button", {name: form.submitLabel}));
    expect(await screen.findByText(copy.review.look.title)).toBeTruthy();
    expect(screen.getByText(/The phone number doesn’t look right\./u)).toBeTruthy();
    expect(screen.getByRole("button", {name: copy.review.confirm}).hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("switch", {name: new RegExp(`${copy.review.look.leaveOut}: Ira Desai`, "u")}));
    fireEvent.click(screen.getByRole("switch", {name: new RegExp(`${copy.review.look.leaveOut}: Rohan Pillai`, "u")}));
    fireEvent.click(screen.getByRole("button", {name: copy.review.look.again}));
    await waitFor(() => expect(screen.getByRole("button", {name: copy.review.confirm}).hasAttribute("disabled")).toBe(false));
    fireEvent.click(screen.getByRole("button", {name: copy.review.confirm}));
    expect(await screen.findByText(fixtures.applied.summary.headline)).toBeTruthy();
  });

  it("words a refused file and offers another file", async () => {
    const client = scriptedGuestClient({"guests.import-list": {preview: [{problem: "invalid", reason: "roster_malformed_csv"}]}});
    render(client);
    chooseFile();
    fireEvent.click(screen.getByRole("button", {name: form.submitLabel}));
    expect((await screen.findByRole("alert")).textContent).toBe(copy.refusals.roster_malformed_csv);
    expect(screen.queryByRole("button", {name: tryItCopy.problem.retry})).toBeNull();
    fireEvent.click(screen.getByRole("button", {name: copy.review.back}));
    expect(screen.getByRole("form", {name: copy.title})).toBeTruthy();
  });
});
