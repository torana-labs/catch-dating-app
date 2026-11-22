import type {Meta, StoryObj} from "@storybook/react-vite";
import {expect, userEvent, within} from "storybook/test";
import {walkthroughBookingCopy as copy} from "@content/walkthroughBooking";
import walkthroughPage from "@content/playbook/pages/host/walkthrough.json";
import type {PlaybookLeadForm} from "@content/playbook/playbookContract";
import {walkthroughBookingNode} from "../features/walkthroughs/WalkthroughBooking";
import {provideWalkthroughDeps, type WalkthroughDeps} from "../features/walkthroughs/walkthroughClientContext";
import {walkthroughManagePageNode} from "../features/walkthroughs/WalkthroughManagePage";
import {PageShell} from "../shared/site";
import {
  scriptedWalkthroughClient,
  walkthroughBookingClosed,
  walkthroughFixtureBookingId,
  walkthroughFixtureToken,
  walkthroughManagedFor,
  walkthroughNoSlots,
  walkthroughOpenSlots,
  walkthroughRefusal,
  walkthroughSlotsAfterTaken,
} from "./fixtures/walkthroughBooking";

const meta = {
  title: "Marketing Website/Walkthrough booking",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

/** The walkthrough page's request form, as its JSON writes it; the picker takes its field labels and id. */
const form = walkthroughPage.sections.flatMap((section) => "leadForm" in section && section.leadForm ? [section.leadForm as PlaybookLeadForm] : [])[0]!;
const fallback = <p>The page’s request form stands here.</p>;

function BookingAt({width, deps}: {width: 360 | 560; deps: () => WalkthroughDeps}) {
  return (
    <div style={{margin: "0 auto", width}}>
      <PageShell pageClassName="home-page">
        {provideWalkthroughDeps(deps(), walkthroughBookingNode({form, pageId: "host_walkthrough", sectionId: "book", fallback}))}
      </PageShell>
    </div>
  );
}

async function pick(canvasElement: HTMLElement, day: string, time: string) {
  const canvas = within(canvasElement);
  await userEvent.click(within(await canvas.findByRole("radiogroup", {name: copy.day})).getByRole("radio", {name: day}));
  await userEvent.click(within(canvas.getByRole("radiogroup", {name: copy.time})).getByRole("radio", {name: time}));
}

async function details(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  await userEvent.click(canvas.getByRole("button", {name: copy.continue}));
  await userEvent.type(await canvas.findByRole("textbox", {name: /Your name/u}), "Asha Rivera");
  await userEvent.type(canvas.getByRole("textbox", {name: /Organisation/u}), "Harbour Lane Studio");
  await userEvent.type(canvas.getByRole("textbox", {name: /What you run/u}), "Pottery evenings");
}

type Step = {name: string; deps: () => WalkthroughDeps; play?: (canvasElement: HTMLElement) => Promise<void>};

const steps: Record<string, Step> = {
  Pick: {name: "Open times by day", deps: () => ({client: scriptedWalkthroughClient().client, timeZone: "Asia/Kolkata"}),
    play: async (canvasElement) => {await pick(canvasElement, "Mon 23 Nov", "4:00 PM");}},
  Abroad: {name: "Open times for a visitor abroad", deps: () => ({client: scriptedWalkthroughClient().client, timeZone: "Europe/London"}),
    play: async (canvasElement) => {
      await pick(canvasElement, "Mon 23 Nov", "4:00 PM");
      await expect(within(canvasElement).getByText("That’s 10:30 AM your time (Europe/London).")).toBeInTheDocument();
    }},
  Details: {name: "Details and number", deps: () => ({client: scriptedWalkthroughClient({caller: null}).client, timeZone: "Asia/Kolkata"}),
    play: async (canvasElement) => {
      await pick(canvasElement, "Tue 24 Nov", "11:00 AM");
      await details(canvasElement);
    }},
  Booked: {name: "Booked", deps: () => ({client: scriptedWalkthroughClient().client, timeZone: "Asia/Kolkata"}),
    play: async (canvasElement) => {
      await pick(canvasElement, "Mon 23 Nov", "4:00 PM");
      await details(canvasElement);
      await userEvent.click(within(canvasElement).getByRole("button", {name: copy.phone.book}));
      await expect(await within(canvasElement).findByText(copy.done.next)).toBeInTheDocument();
    }},
  Taken: {name: "Time taken meanwhile", deps: () => {
    let taken = false;
    return {client: scriptedWalkthroughClient({
      slots: [() => taken ? walkthroughSlotsAfterTaken : walkthroughOpenSlots],
      book: [() => {taken = true; return walkthroughRefusal("already-exists", "slot_taken");}],
    }).client, timeZone: "Asia/Kolkata"};
  }, play: async (canvasElement) => {
    await pick(canvasElement, "Mon 23 Nov", "10:00 AM");
    await details(canvasElement);
    await userEvent.click(within(canvasElement).getByRole("button", {name: copy.phone.book}));
    await expect(await within(canvasElement).findByText(copy.problems.slotTaken)).toBeInTheDocument();
  }},
  Empty: {name: "No open time", deps: () => ({client: scriptedWalkthroughClient({slots: [walkthroughNoSlots]}).client})},
  Closed: {name: "Booking closed", deps: () => ({client: scriptedWalkthroughClient({slots: [walkthroughBookingClosed]}).client})},
};

const story = (step: Step, width: 360 | 560): Story => ({
  name: `${step.name} · ${width}`,
  render: () => <BookingAt deps={step.deps} width={width} />,
  ...(step.play ? {play: ({canvasElement}: {canvasElement: HTMLElement}) => step.play!(canvasElement)} : {}),
});

export const Pick560 = story(steps.Pick, 560);
export const Pick360 = story(steps.Pick, 360);
export const Abroad360 = story(steps.Abroad, 360);
export const Details360 = story(steps.Details, 360);
export const Booked560 = story(steps.Booked, 560);
export const Booked360 = story(steps.Booked, 360);
export const Taken360 = story(steps.Taken, 360);
export const Empty360 = story(steps.Empty, 360);
export const Closed360 = story(steps.Closed, 360);

/** The manage page as the confirmation's link opens it. */
export const Manage360: Story = {
  name: "Manage a booking · 360",
  render: () => (
    <div style={{margin: "0 auto", width: 360}}>
      {provideWalkthroughDeps({client: scriptedWalkthroughClient({manage: [walkthroughManagedFor({confirmed: true})]}).client, timeZone: "Asia/Kolkata"},
        walkthroughManagePageNode({search: `?booking=${walkthroughFixtureBookingId}`, hash: `#t=${walkthroughFixtureToken}`}))}
    </div>
  ),
};
