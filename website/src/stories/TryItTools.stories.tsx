import type {Meta, StoryObj} from "@storybook/react-vite";
import {expect, userEvent, within} from "storybook/test";
import {applyBrand} from "@content/brand";
import bookingsPage from "@content/playbook/pages/product/bookings.json";
import messagesPage from "@content/playbook/pages/product/messages.json";
import yourPage from "@content/playbook/pages/product/your-page.json";
import {livePlaybookPage, validatedPlaybookPage, type PlaybookPageDocument} from "@content/playbook/playbookContract";
import {tryItCopy} from "@content/tryIt";
import {marketingCaptures} from "../app/marketingCaptures";
import {PlaybookPage} from "../features/playbook/PlaybookPage";
import {provideTryItDeps, type TryItToolDeps} from "../features/tryIt/useTryItToolController";
import {PageShell} from "../shared/site";
import {
  eventFixtures,
  fixtureCaller,
  fixtureEventId,
  kitFixtures,
  organizerFixtures,
  scriptedTryItClient,
  workspaceFixtures,
} from "./fixtures/tryItCommands";

const meta = {
  title: "Marketing Website/Try-it tools",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * A product page as it renders, with its try-it bands shown: Bookings and
 * Messages keep theirs hidden on the site until their commands reach
 * production, so the stories show them as they will look once flipped.
 */
function shown(raw: unknown): PlaybookPageDocument {
  const page = validatedPlaybookPage(raw);
  const withTools = {...page, sections: page.sections
    .filter((section) => !(section.id === "start" && page.sections.some((other) => other.id === "start-try")))
    .map((section) => section.status === "tryIt" && (section.id === "try" || section.id === "start-try") ? {...section, status: "built" as const} : section)};
  return applyBrand(livePlaybookPage(withTools));
}

const pages = {organizer: shown(yourPage), event: shown(bookingsPage), kit: shown(messagesPage)};
const never = () => new Promise<void>(() => undefined);

function ToolAt({width, tool, deps}: {width: 390 | 1280; tool: keyof typeof pages; deps: TryItToolDeps}) {
  return (
    <div style={{margin: "0 auto", width}}>
      <PageShell pageClassName="home-page">
        {provideTryItDeps(deps, <PlaybookPage captures={marketingCaptures} page={pages[tool]} />)}
      </PageShell>
    </div>
  );
}

const band = (canvasElement: HTMLElement) => within(canvasElement.querySelector<HTMLElement>("#try")!);

async function pasteLink(canvasElement: HTMLElement, label: RegExp, value: string, button: string) {
  const tool = band(canvasElement);
  await userEvent.type(tool.getByRole("textbox", {name: label}), value);
  await userEvent.click(tool.getByRole("button", {name: button}));
}

const pageLink = /Your Instagram, Luma or website/u;
const eventLink = /Link to an event/u;
const kitLink = /Your event link/u;
const quick = {wait: async () => undefined};

type Step = {name: string; tool: keyof typeof pages; deps: () => TryItToolDeps; play?: (canvasElement: HTMLElement) => Promise<void>};

const steps: Record<string, Step> = {
  PageStart: {name: "Your page · link", tool: "organizer", deps: () => ({client: scriptedTryItClient({}), ...quick}),
    play: async (canvasElement) => {
      await expect(band(canvasElement).getByRole("form", {name: tryItCopy.tools.organizer.title})).toBeInTheDocument();
    }},
  PageAccount: {name: "Your page · brand, city and phone", tool: "organizer", deps: () => ({client: scriptedTryItClient({}, null), ...quick}),
    play: async (canvasElement) => {
      await pasteLink(canvasElement, pageLink, "driftwoodbayrunners.example", "Build my page");
      await expect(await band(canvasElement).findByRole("button", {name: tryItCopy.account.continueWithPhone})).toBeInTheDocument();
    }},
  PageWorkspace: {name: "Your page · private profile", tool: "organizer",
    deps: () => ({client: scriptedTryItClient({"organizer.import-from-link": {preview: [organizerFixtures.noWorkspace]},
      "workspace.ensure": {preview: [workspaceFixtures.previewNew]}}), ...quick}),
    play: async (canvasElement) => {
      await pasteLink(canvasElement, pageLink, "driftwoodbayrunners.example", "Build my page");
      const tool = band(canvasElement);
      await userEvent.type(await tool.findByRole("textbox", {name: new RegExp(tryItCopy.account.brand, "u")}), "Driftwood Bay Runners");
      await userEvent.selectOptions(tool.getByRole("combobox", {name: new RegExp(tryItCopy.account.city, "u")}), "in-mh-mumbai");
      await userEvent.click(tool.getByRole("button", {name: tryItCopy.account.continue}));
      await expect(await tool.findByRole("button", {name: tryItCopy.workspace.confirm})).toBeInTheDocument();
    }},
  PageWorking: {name: "Your page · reading the link", tool: "organizer",
    deps: () => ({client: scriptedTryItClient({"organizer.import-from-link": {preview: [organizerFixtures.running]}}), wait: never}),
    play: async (canvasElement) => {
      await pasteLink(canvasElement, pageLink, "@driftwoodbayrunners", "Build my page");
      await expect(await band(canvasElement).findByText(organizerFixtures.running.summary.headline)).toBeInTheDocument();
    }},
  PageReview: {name: "Your page · what we found", tool: "organizer",
    deps: () => ({client: scriptedTryItClient({"organizer.import-from-link": {preview: [organizerFixtures.previewed]}}), ...quick}),
    play: async (canvasElement) => {
      await pasteLink(canvasElement, pageLink, "@driftwoodbayrunners", "Build my page");
      await expect(await band(canvasElement).findByRole("button", {name: tryItCopy.tools.organizer.confirm})).toBeInTheDocument();
    }},
  PageDone: {name: "Your page · added, claim it", tool: "organizer",
    deps: () => ({client: scriptedTryItClient({"organizer.import-from-link": {preview: [organizerFixtures.previewed], apply: [organizerFixtures.applied]}}), ...quick}),
    play: async (canvasElement) => {
      await pasteLink(canvasElement, pageLink, "@driftwoodbayrunners", "Build my page");
      await userEvent.click(await band(canvasElement).findByRole("button", {name: tryItCopy.tools.organizer.confirm}));
      await expect(await band(canvasElement).findByRole("heading", {name: tryItCopy.claimInHost.title})).toBeInTheDocument();
    }},
  PageListed: {name: "Your page · already listed", tool: "organizer",
    deps: () => ({client: scriptedTryItClient({"organizer.import-from-link": {preview: [organizerFixtures.listed]}}), ...quick}),
    play: async (canvasElement) => {
      await pasteLink(canvasElement, pageLink, "lanternlane.example", "Build my page");
      await expect(await band(canvasElement).findByRole("link", {name: tryItCopy.listed.claim})).toBeInTheDocument();
    }},
  PageProblem: {name: "Your page · link refused", tool: "organizer",
    deps: () => ({client: scriptedTryItClient({"organizer.import-from-link": {preview: [organizerFixtures.refused]}}), ...quick}),
    play: async (canvasElement) => {
      await pasteLink(canvasElement, pageLink, "short.example/x", "Build my page");
      await expect(await band(canvasElement).findByRole("alert")).toBeInTheDocument();
    }},
  EventChoose: {name: "Bookings · choose the event", tool: "event",
    deps: () => ({client: scriptedTryItClient({"event.import-from-link": {preview: [eventFixtures.chooseEvent]}}), ...quick}),
    play: async (canvasElement) => {
      await pasteLink(canvasElement, eventLink, "events.example/driftwood", "Build my event page");
      await expect(await band(canvasElement).findByRole("heading", {name: tryItCopy.choose.title})).toBeInTheDocument();
    }},
  EventReview: {name: "Bookings · the draft to make", tool: "event",
    deps: () => ({client: scriptedTryItClient({"event.import-from-link": {preview: [eventFixtures.chooseEvent, eventFixtures.previewed]}}), ...quick}),
    play: async (canvasElement) => {
      await pasteLink(canvasElement, eventLink, "events.example/driftwood", "Build my event page");
      await userEvent.click(await band(canvasElement).findByRole("button", {name: /Salt Air Social Run/u}));
      await expect(await band(canvasElement).findByRole("button", {name: tryItCopy.tools.event.confirm})).toBeInTheDocument();
    }},
  EventDone: {name: "Bookings · draft event made", tool: "event",
    deps: () => ({client: scriptedTryItClient({"event.import-from-link": {preview: [eventFixtures.previewed], apply: [eventFixtures.applied]}}), ...quick}),
    play: async (canvasElement) => {
      await pasteLink(canvasElement, eventLink, "events.example/salt-air", "Build my event page");
      await userEvent.click(await band(canvasElement).findByRole("button", {name: tryItCopy.tools.event.confirm}));
      await expect(await band(canvasElement).findByText(tryItCopy.tools.event.draft.status)).toBeInTheDocument();
    }},
  KitStart: {name: "Messages · event link and places", tool: "kit", deps: () => ({client: scriptedTryItClient({}), ...quick})},
  KitChannels: {name: "Messages · places and people", tool: "kit",
    deps: () => ({client: scriptedTryItClient({"event.import-from-link": {preview: [eventFixtures.previewed], apply: [eventFixtures.applied]}}), ...quick}),
    play: async (canvasElement) => {
      const tool = band(canvasElement);
      await userEvent.type(tool.getByRole("textbox", {name: new RegExp(tryItCopy.tools.kit.channels, "u")}), "Instagram, run club WhatsApp, Kabir");
      await pasteLink(canvasElement, kitLink, "events.example/salt-air", "Make my links");
      await userEvent.click(await tool.findByRole("button", {name: tryItCopy.tools.event.confirm}));
      await expect(await tool.findByRole("form", {name: /Links for/u})).toBeInTheDocument();
    }},
  KitDone: {name: "Messages · tracked links", tool: "kit",
    deps: () => ({client: scriptedTryItClient({"promotion.create-kit": {preview: [kitFixtures.previewed], apply: [kitFixtures.applied]}}), ...quick,
      remembered: {read: () => ({uid: fixtureCaller.uid, eventId: fixtureEventId, name: "Salt Air Social Run", localDate: "2026-11-23", localStartTime: "06:30"}), write: () => undefined}}),
    play: async (canvasElement) => {
      const tool = band(canvasElement);
      await userEvent.click(tool.getByRole("button", {name: /Use my draft/u}));
      await userEvent.type(await tool.findByRole("textbox", {name: new RegExp(tryItCopy.tools.kit.channels, "u")}), "Instagram, run club WhatsApp, Kabir");
      await userEvent.click(tool.getByRole("button", {name: tryItCopy.tools.kit.makeLinks}));
      await userEvent.click(await tool.findByRole("button", {name: tryItCopy.tools.kit.confirm}));
      await expect(await tool.findByRole("heading", {name: tryItCopy.claimInHost.title})).toBeInTheDocument();
    }},
};

const story = (step: Step, width: 390 | 1280): Story => ({
  name: `${step.name} · ${width}`,
  render: () => <ToolAt deps={step.deps()} tool={step.tool} width={width} />,
  ...(step.play ? {play: ({canvasElement}: {canvasElement: HTMLElement}) => step.play!(canvasElement)} : {}),
});

export const PageStart1280 = story(steps.PageStart, 1280);
export const PageStart390 = story(steps.PageStart, 390);
export const PageAccount1280 = story(steps.PageAccount, 1280);
export const PageAccount390 = story(steps.PageAccount, 390);
export const PageWorkspace1280 = story(steps.PageWorkspace, 1280);
export const PageWorkspace390 = story(steps.PageWorkspace, 390);
export const PageWorking1280 = story(steps.PageWorking, 1280);
export const PageWorking390 = story(steps.PageWorking, 390);
export const PageReview1280 = story(steps.PageReview, 1280);
export const PageReview390 = story(steps.PageReview, 390);
export const PageDone1280 = story(steps.PageDone, 1280);
export const PageDone390 = story(steps.PageDone, 390);
export const PageListed1280 = story(steps.PageListed, 1280);
export const PageListed390 = story(steps.PageListed, 390);
export const PageProblem1280 = story(steps.PageProblem, 1280);
export const PageProblem390 = story(steps.PageProblem, 390);
export const EventChoose1280 = story(steps.EventChoose, 1280);
export const EventChoose390 = story(steps.EventChoose, 390);
export const EventReview1280 = story(steps.EventReview, 1280);
export const EventReview390 = story(steps.EventReview, 390);
export const EventDone1280 = story(steps.EventDone, 1280);
export const EventDone390 = story(steps.EventDone, 390);
export const KitStart1280 = story(steps.KitStart, 1280);
export const KitStart390 = story(steps.KitStart, 390);
export const KitChannels1280 = story(steps.KitChannels, 1280);
export const KitChannels390 = story(steps.KitChannels, 390);
export const KitDone1280 = story(steps.KitDone, 1280);
export const KitDone390 = story(steps.KitDone, 390);
