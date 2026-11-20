import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {cleanup, fireEvent, render as renderInto, within} from "@testing-library/react";
import {StrictMode, type ReactNode} from "react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {pastSalesTryItCopy as copy} from "@content/pastSalesTryIt";
import {tryItCopy} from "@content/tryIt";
import {fixtureExportFile, pastSalesFixtures, scriptedPastSalesClient} from "../../stories/fixtures/pastSalesTryItCommands";
import {loadPlaybookPage, resolvePlaybookPage} from "../playbook/playbookPages";
import {PlaybookPage} from "../playbook/PlaybookPage";
import {providePastSalesDeps, type PastSalesToolDeps} from "./usePastSalesToolController";

vi.mock("../../firebase", () => ({getWebsiteAppCheckToken: vi.fn(async () => "site-token")}));

afterEach(cleanup);

/** Both site shells mount the query client the sign-in sheet's controller uses; StrictMode mounts the tool twice, as in development. */
const render = (node: ReactNode) => renderInto(<StrictMode><QueryClientProvider client={new QueryClient()}>{node}</QueryClientProvider></StrictMode>);

const reports = (await loadPlaybookPage(resolvePlaybookPage("/product/reports-and-payouts/")!))!;
const bytes = new TextEncoder().encode("Name,Ticket,Amount\nAnanya Rao,General,400\n");

function renderPage(client: PastSalesToolDeps["client"]) {
  render(providePastSalesDeps({client, readFile: async () => bytes, today: () => "2026-11-20"}, <PlaybookPage captures={{}} page={reports} />));
  return within(document.getElementById("try")!);
}

function upload(band: ReturnType<typeof within>, file = fixtureExportFile()) {
  fireEvent.change(band.getByLabelText(copy.chooseFile), {target: {files: [file]}});
  fireEvent.click(band.getByRole("button", {name: "Build my report"}));
}

describe("Reports' export upload on the page", () => {
  it("draws the upload in the try band, keeps the numbers report right after it, and links the hero and closing band to it", () => {
    const band = renderPage(scriptedPastSalesClient({}));
    expect(band.getByRole("heading", {name: copy.title})).toBeTruthy();
    expect(band.getByRole("form", {name: copy.title})).toBeTruthy();
    expect(band.getByRole("group", {name: "Your sales or guest export"})).toBeTruthy();
    expect(document.getElementById("try")!.nextElementSibling?.id).toBe("numbers");
    expect(within(document.getElementById("top")!).getByRole("link", {name: "See your last event as a report"}).getAttribute("href")).toBe("#try");
    expect(within(document.getElementById("start")!).getByRole("link", {name: "Build my report"}).getAttribute("href")).toBe("#try");
    expect(document.getElementById("start-try")).toBeNull();
  });

  it("says why a file can't be sent, before anything leaves the page", () => {
    const client = scriptedPastSalesClient({});
    const band = renderPage(client);
    fireEvent.click(band.getByRole("button", {name: "Build my report"}));
    expect(band.getByRole("alert").textContent).toBe(copy.fileRequired);
    fireEvent.change(band.getByLabelText(copy.chooseFile), {target: {files: [new File(["x"], "night.pdf")]}});
    expect(band.getByRole("alert").textContent).toBe(copy.fileType);
    expect(client.calls).toEqual([]);
  });

  it("previews the report, saves it with the preview's hash, and ends with the claim step", async () => {
    const client = scriptedPastSalesClient({"sales.import-past": {preview: [pastSalesFixtures.previewed], apply: [pastSalesFixtures.applied]}});
    const band = renderPage(client);
    upload(band);
    expect(await band.findByRole("heading", {name: "Salt Air Social Run · Mon 16 Nov"})).toBeTruthy();
    expect(band.getByText("₹20,800")).toBeTruthy();
    expect(band.getByText("88%")).toBeTruthy();
    expect(band.getByText("46 of 52 with tickets")).toBeTruthy();
    expect(band.getByText("₹1,040")).toBeTruthy();
    expect(band.getByText("₹104")).toBeTruthy();
    expect(band.getByText(copy.report.differenceLess)).toBeTruthy();
    expect(band.getByText(pastSalesFixtures.previewed.result.report.fees.gatewayNote)).toBeTruthy();
    fireEvent.click(band.getByRole("button", {name: copy.review.save}));
    expect(await band.findByRole("heading", {name: "“Salt Air Social Run” is saved as a private past event."})).toBeTruthy();
    expect(band.getByText("51 guests saved to it.")).toBeTruthy();
    expect(band.getByRole("heading", {name: tryItCopy.claimInHost.title})).toBeTruthy();
    expect(client.calls.map((call) => [call.mode, call.idempotencyKey === client.calls[0].idempotencyKey, call.previewHash])).toEqual([
      ["preview", true, undefined], ["apply", true, pastSalesFixtures.previewed.previewHash]]);
  });

  it("shows each missing figure's reason, and no fee figure when the command can't work one out", async () => {
    const client = scriptedPastSalesClient({"sales.import-past": {preview: [pastSalesFixtures.thin]}});
    const band = renderPage(client);
    upload(band);
    expect(await band.findByRole("heading", {name: "Past event · Thu 19 Nov"})).toBeTruthy();
    expect(band.getByText(copy.report.attendanceMissing)).toBeTruthy();
    expect(band.getByText(copy.report.guestsMissing)).toBeTruthy();
    expect(band.getByText(copy.report.catchFeeReasons.no_sales_amounts)).toBeTruthy();
    expect(band.getByText(copy.report.salesNone)).toBeTruthy();
    expect(band.getByText(copy.report.currentFeeMissing)).toBeTruthy();
    expect(band.getByText(copy.report.differenceMissing)).toBeTruthy();
    // Nothing on the card is a money figure: the fee, the sales and the difference are dashes.
    expect(document.getElementById("try")!.textContent).not.toMatch(/₹/u);
  });

  it("asks for the columns when the file's can't be told apart, then shows the report", async () => {
    const client = scriptedPastSalesClient({"sales.import-past": {preview: [pastSalesFixtures.needsMapping, pastSalesFixtures.previewed]}});
    const band = renderPage(client);
    upload(band);
    const name = await band.findByRole("combobox", {name: new RegExp(copy.mapping.fields.displayName, "u")});
    expect(band.getByRole("heading", {name: copy.mapping.title})).toBeTruthy();
    fireEvent.change(name, {target: {value: ""}});
    fireEvent.click(band.getByRole("button", {name: copy.mapping.submit}));
    expect(await band.findByText(copy.mapping.nameRequired)).toBeTruthy();
    fireEvent.change(name, {target: {value: "0"}});
    fireEvent.click(band.getByRole("button", {name: copy.mapping.submit}));
    expect(await band.findByRole("heading", {name: "Salt Air Social Run · Mon 16 Nov"})).toBeTruthy();
    expect(client.calls[1].input).toMatchObject({mapping: {displayName: 0, phone: 1}});
  });

  it("lists rows that need a look and leaves them out before saving", async () => {
    const client = scriptedPastSalesClient({"sales.import-past": {preview: [pastSalesFixtures.rowsNeedReview, pastSalesFixtures.previewedAgain]}});
    const band = renderPage(client);
    upload(band);
    expect(await band.findByText("To look at before you save (1)")).toBeTruthy();
    expect(band.getByText("Row 7 · Amount not readable")).toBeTruthy();
    expect(band.queryByRole("button", {name: copy.review.save})).toBeNull();
    fireEvent.click(band.getByRole("button", {name: copy.review.leaveOut}));
    expect(await band.findByRole("button", {name: copy.review.save})).toBeTruthy();
    expect(client.calls[1].input).toMatchObject({excludedRowIds: ["7"]});
  });

  it("words the command's file error and offers another file", async () => {
    const client = scriptedPastSalesClient({"sales.import-past": {preview: [{problem: "invalid", reason: "roster_malformed_csv"}]}});
    const band = renderPage(client);
    upload(band);
    expect((await band.findByRole("alert")).textContent).toContain(copy.reasons.roster_malformed_csv);
    expect(band.queryByRole("button", {name: tryItCopy.problem.retry})).toBeNull();
    fireEvent.click(band.getByRole("button", {name: copy.review.back}));
    expect(band.getByRole("form", {name: copy.title})).toBeTruthy();
  });

  it("asks a visitor with no confirmed phone for the profile step first, sending nothing", async () => {
    const client = scriptedPastSalesClient({}, null);
    const band = renderPage(client);
    upload(band);
    expect(await band.findByRole("button", {name: tryItCopy.account.continueWithPhone})).toBeTruthy();
    expect(client.calls).toEqual([]);
  });
});
