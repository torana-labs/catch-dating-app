import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {act, cleanup, fireEvent, render as renderInto, within} from "@testing-library/react";
import {StrictMode, type ReactNode} from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {applyBrand} from "@content/brand";
import formsRaw from "@content/playbook/pages/product/forms.json";
import {livePlaybookPage, validatedPlaybookPage, type PlaybookPageDocument} from "@content/playbook/playbookContract";
import {tryItCopy} from "@content/tryIt";
import {fixtureFormLink, fixtureFormTyped, formFixtures, formUnknownFlagPreview} from "../../stories/fixtures/formImportTryIt";
import {scriptedTryItClient} from "../../stories/fixtures/tryItCommands";
import {loadPlaybookPage, resolvePlaybookPage} from "./playbookPages";
import {PlaybookPage} from "./PlaybookPage";
import {provideTryItDeps} from "../tryIt/useTryItToolController";

// Readiness as the site has it, plus whatever a test adds: switching the
// form tool on is adding form.import-from-link to websiteReadyTryItCommands.
const readiness = vi.hoisted(() => ({extra: [] as string[]}));
vi.mock("../tryIt/tryItModel", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../tryIt/tryItModel")>();
  return {...actual, playbookTryItTool: (pageId: string, ready: readonly string[] = actual.websiteReadyTryItCommands) =>
    actual.playbookTryItTool(pageId, [...ready, ...readiness.extra])};
});
vi.mock("../../firebase", () => ({getWebsiteAppCheckToken: vi.fn(async () => "site-token")}));

const render = (node: ReactNode) => renderInto(<StrictMode><QueryClientProvider client={new QueryClient()}>{node}</QueryClientProvider></StrictMode>);
const formsPath = "/product/forms/";
const forms = (await loadPlaybookPage(resolvePlaybookPage(formsPath)!))!;
const yourPage = (await loadPlaybookPage(resolvePlaybookPage("/product/your-page/")!))!;

/** The Forms page once switched on: its try sections built, and its closing tool band in place of the old one (renamed start). */
function switchedOn(): PlaybookPageDocument {
  const page = validatedPlaybookPage(formsRaw);
  const sections = page.sections.filter((section) => section.id !== "start").map((section) => {
    const built = section.status === "tryIt" ? {...section, status: "built" as const} : section;
    return built.id === "start-try" ? {...built, id: "start"} : built;
  });
  return applyBrand(livePlaybookPage({...page, sections, header: page.header}));
}

const band = () => within(document.getElementById("try")!);
/** Lets the page's effects and the reveal's content load settle. */
const settle = () => act(async () => {
  for (let i = 0; i < 5; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
});

beforeEach(() => {
  readiness.extra = [];
  window.history.replaceState(null, "", formsPath);
});
afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

async function bringForm(client: ReturnType<typeof scriptedTryItClient>, page: PlaybookPageDocument) {
  render(provideTryItDeps({client, wait: async () => undefined}, <PlaybookPage captures={{}} page={page} />));
  await settle();
  fireEvent.change(band().getByRole("textbox", {name: /Link to a Google Form/u}), {target: {value: fixtureFormTyped}});
  fireEvent.click(band().getByRole("button", {name: "Bring my form"}));
}

describe("the Forms page's form tool (form.import-from-link)", () => {
  it("stays hidden while form.import-from-link is not website-ready", async () => {
    render(<PlaybookPage captures={{}} page={forms} />);
    await settle();
    expect(document.getElementById("try")).toBeNull();
    expect(document.getElementById("start-try")).toBeNull();
    expect(document.body.textContent).not.toContain(tryItCopy.tools.form.title);
    // Even a switched-on page draws no tool form while the command is not ready.
    cleanup();
    render(<PlaybookPage captures={{}} page={switchedOn()} />);
    await settle();
    expect(within(document.getElementById("try")!).queryByRole("form")).toBeNull();
  });

  it("draws the tool in the try band and the closing band once the command is ready, and runs preview, apply and the claim step", async () => {
    readiness.extra = ["form.import-from-link"];
    const client = scriptedTryItClient({"form.import-from-link": {preview: [formFixtures.previewed], apply: [formFixtures.applied]}});
    await bringForm(client, switchedOn());
    expect(within(document.getElementById("start")!).getByRole("form", {name: "Bring my form"})).toBeTruthy();
    expect(await band().findByText(formFixtures.previewed.summary.headline)).toBeTruthy();
    // The sections and questions, the jumps that came across, and what to rebuild.
    for (const section of formFixtures.previewed.result.form.sections) expect(band().getByText(section.title)).toBeTruthy();
    expect(band().getByText("Which distance?")).toBeTruthy();
    expect(band().getAllByText("One choice · 2 choices · Required")).toHaveLength(2);
    expect(band().getByText(tryItCopy.tools.form.found.jumps.replace("{count}", "2"))).toBeTruthy();
    expect(band().getByRole("heading", {name: tryItCopy.tools.form.flags.title})).toBeTruthy();
    expect(band().getByText(tryItCopy.tools.form.flags.codes.grid_not_supported)).toBeTruthy();
    expect(band().getByText(tryItCopy.tools.form.flags.codes.file_upload_skipped)).toBeTruthy();
    expect(band().getByText("Rate each part of the route")).toBeTruthy();
    fireEvent.click(band().getByRole("button", {name: tryItCopy.tools.form.confirm}));
    expect(await band().findByText(formFixtures.applied.summary.headline)).toBeTruthy();
    expect(band().getByText(tryItCopy.tools.form.draft.status)).toBeTruthy();
    expect(band().getByRole("heading", {name: tryItCopy.claimInHost.title})).toBeTruthy();
    expect(client.calls.map((call) => [call.mode, call.idempotencyKey === client.calls[0].idempotencyKey, call.input])).toEqual([
      ["preview", true, {link: fixtureFormLink}], ["apply", true, {link: fixtureFormLink}]]);
  });

  it("words a flag code it does not know as the generic line", async () => {
    readiness.extra = ["form.import-from-link"];
    await bringForm(scriptedTryItClient({"form.import-from-link": {preview: [formUnknownFlagPreview]}}), switchedOn());
    expect(await band().findByText(tryItCopy.tools.form.flags.other)).toBeTruthy();
    expect(band().getByText("Route quiz")).toBeTruthy();
  });

  it("previews again when the form changed since the preview, and says so", async () => {
    readiness.extra = ["form.import-from-link"];
    const client = scriptedTryItClient({"form.import-from-link": {preview: [formFixtures.previewed, formFixtures.previewedAgain],
      apply: [{problem: "changed"}]}});
    await bringForm(client, switchedOn());
    fireEvent.click(await band().findByRole("button", {name: tryItCopy.tools.form.confirm}));
    expect(await band().findByText(tryItCopy.tools.form.revised)).toBeTruthy();
    expect(band().getByText("Emergency contact")).toBeTruthy();
  });

  it("asks a visitor with no verified phone for their brand and city first", async () => {
    readiness.extra = ["form.import-from-link"];
    const client = scriptedTryItClient({}, null);
    await bringForm(client, switchedOn());
    expect(await band().findByRole("heading", {name: tryItCopy.account.title})).toBeTruthy();
    expect(band().getByRole("button", {name: tryItCopy.account.continueWithPhone})).toBeTruthy();
    expect(client.calls).toEqual([]);
  });

  describe("owner preview (?tryit=forms)", () => {
    it("shows the try band and the tool on the Forms page when the address carries tryit=forms", async () => {
      window.history.replaceState(null, "", `${formsPath}?tryit=forms`);
      const client = scriptedTryItClient({"form.import-from-link": {preview: [formFixtures.previewed]}});
      render(provideTryItDeps({client, wait: async () => undefined}, <PlaybookPage captures={{}} page={forms} />));
      await settle();
      expect(band().getByRole("form", {name: tryItCopy.tools.form.title})).toBeTruthy();
      fireEvent.change(band().getByRole("textbox", {name: /Link to a Google Form/u}), {target: {value: fixtureFormTyped}});
      fireEvent.click(band().getByRole("button", {name: "Bring my form"}));
      expect(await band().findByText(formFixtures.previewed.summary.headline)).toBeTruthy();
      // Only the try band: the closing tool band stays hidden.
      expect(document.getElementById("start-try")).toBeNull();
    });

    it("keeps everything hidden without the parameter, or with another value", async () => {
      for (const search of ["", "?tryit=bookings", "?tryit=FORMS&x=1"]) {
        window.history.replaceState(null, "", `${formsPath}${search}`);
        render(<PlaybookPage captures={{}} page={forms} />);
        await settle();
        expect(document.getElementById("try"), search).toBeNull();
        cleanup();
      }
    });

    it("changes no other page", async () => {
      window.history.replaceState(null, "", "/product/your-page/?tryit=forms");
      render(<PlaybookPage captures={{}} page={yourPage} />);
      await settle();
      expect(within(document.getElementById("try")!).getByRole("form", {name: tryItCopy.tools.organizer.title})).toBeTruthy();
      expect(document.body.textContent).not.toContain(tryItCopy.tools.form.title);
    });
  });
});
