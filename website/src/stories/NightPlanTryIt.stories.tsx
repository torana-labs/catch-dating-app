import type {Meta, StoryObj} from "@storybook/react-vite";
import {expect, userEvent, within} from "storybook/test";
import {nightPlanTryItCopy as copy} from "@content/nightPlanTryIt";
import {tryItCopy} from "@content/tryIt";
import roomPage from "@content/playbook/pages/product/room.json";
import type {PlaybookLeadForm} from "@content/playbook/playbookContract";
import {nightPlanTryItNode} from "../features/tryIt/NightPlanTryIt";
import {provideNightPlanDeps, type NightPlanDeps} from "../features/tryIt/useNightPlanController";
import {PageShell} from "../shared/site";
import {fixtureCaller, fixtureEventId, scriptedTryItClient} from "./fixtures/tryItCommands";
import {fixtureRehearsalUrl, nightPlanFixtures} from "./fixtures/nightPlanCommands";

const meta = {
  title: "Marketing Website/Try-it tools/Plan your night",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

/** The Room page's try band form, as the page's JSON writes it. */
const form = roomPage.sections.flatMap((section) => "leadForm" in section && section.leadForm ? [section.leadForm as PlaybookLeadForm] : [])[0]!;
const draft = {uid: fixtureCaller.uid, eventId: fixtureEventId, name: "Salt Air Social Run", localDate: "2026-11-23", localStartTime: "06:30"};
const remembered = {read: () => draft, write: () => undefined};
const rehearse = async () => ({ok: true as const, guestUrl: fixtureRehearsalUrl});

function ToolAt({width, deps}: {width: 390 | 560; deps: NightPlanDeps}) {
  return (
    <div style={{margin: "0 auto", width}}>
      <PageShell pageClassName="home-page">
        {provideNightPlanDeps(deps, nightPlanTryItNode({form, pageId: "product_room", sectionId: "try"}))}
      </PageShell>
    </div>
  );
}

async function planNight(canvasElement: HTMLElement, format: string, guests: string) {
  const tool = within(canvasElement);
  await userEvent.selectOptions(tool.getByRole("combobox", {name: new RegExp(form.label, "u")}), format);
  await userEvent.type(tool.getByRole("textbox", {name: new RegExp(copy.guests, "u")}), guests);
  await userEvent.click(tool.getByRole("button", {name: form.submitLabel}));
}

type Step = {name: string; deps: () => NightPlanDeps; play?: (canvasElement: HTMLElement) => Promise<void>};

const steps: Record<string, Step> = {
  Start: {name: "Format and guests", deps: () => ({client: scriptedTryItClient({}), rehearse})},
  Account: {name: "Brand, city and phone", deps: () => ({client: scriptedTryItClient({}, null), rehearse}),
    play: async (canvasElement) => {
      await planNight(canvasElement, "dinner", "24");
      await expect(await within(canvasElement).findByRole("button", {name: tryItCopy.account.continueWithPhone})).toBeInTheDocument();
    }},
  Plan: {name: "The plan, with nothing to save to yet", deps: () => ({client: scriptedTryItClient({"night.plan": {preview: [nightPlanFixtures.refusedNoDraft]}}), rehearse}),
    play: async (canvasElement) => {
      await planNight(canvasElement, "run", "32");
      await expect(await within(canvasElement).findByText(copy.missions.title)).toBeInTheDocument();
    }},
  Limited: {name: "A plan at its 200-group limit", deps: () => ({client: scriptedTryItClient({"night.plan": {preview: [nightPlanFixtures.courtsLimited]}}), rehearse}),
    play: async (canvasElement) => {
      await planNight(canvasElement, "courts", "1000");
      await expect(await within(canvasElement).findByText(copy.groups.countLimitedCourts)).toBeInTheDocument();
    }},
  Rehearsal: {name: "Practice session with a friend", deps: () => ({client: scriptedTryItClient({"night.plan": {preview: [nightPlanFixtures.previewed]}}), rehearse}),
    play: async (canvasElement) => {
      await planNight(canvasElement, "run", "32");
      await userEvent.click(await within(canvasElement).findByRole("button", {name: copy.rehearsal.action}));
      await expect(await within(canvasElement).findByRole("heading", {name: copy.rehearsal.readyTitle})).toBeInTheDocument();
    }},
  Mismatch: {name: "Draft with a different activity", deps: () => ({client: scriptedTryItClient({"night.plan": {preview: [nightPlanFixtures.previewed],
    apply: [nightPlanFixtures.formatMismatch]}}), rehearse, remembered}),
    play: async (canvasElement) => {
      await planNight(canvasElement, "run", "32");
      await userEvent.click(await within(canvasElement).findByRole("button", {name: copy.save.action}));
      await expect(await within(canvasElement).findByText(copy.save.refusals.event_format_mismatch)).toBeInTheDocument();
    }},
  Saved: {name: "Saved to the draft", deps: () => ({client: scriptedTryItClient({"night.plan": {preview: [nightPlanFixtures.previewed],
    apply: [nightPlanFixtures.applied]}}), rehearse, remembered}),
    play: async (canvasElement) => {
      await planNight(canvasElement, "run", "32");
      await userEvent.click(await within(canvasElement).findByRole("button", {name: copy.save.action}));
      await expect(await within(canvasElement).findByRole("heading", {name: /Saved on your draft/u})).toBeInTheDocument();
    }},
};

const story = (step: Step, width: 390 | 560): Story => ({
  name: `${step.name} · ${width}`,
  render: () => <ToolAt deps={step.deps()} width={width} />,
  ...(step.play ? {play: ({canvasElement}: {canvasElement: HTMLElement}) => step.play!(canvasElement)} : {}),
});

export const Start560 = story(steps.Start, 560);
export const Start390 = story(steps.Start, 390);
export const Account390 = story(steps.Account, 390);
export const Plan560 = story(steps.Plan, 560);
export const Plan390 = story(steps.Plan, 390);
export const Limited390 = story(steps.Limited, 390);
export const Rehearsal560 = story(steps.Rehearsal, 560);
export const Rehearsal390 = story(steps.Rehearsal, 390);
export const Mismatch390 = story(steps.Mismatch, 390);
export const Saved390 = story(steps.Saved, 390);
