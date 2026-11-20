import type {Meta, StoryObj} from "@storybook/react-vite";
import {expect, fireEvent, userEvent, within} from "storybook/test";
import {applyBrand} from "@content/brand";
import {guestImportTryItCopy as copy} from "@content/guestImportTryIt";
import guestsPage from "@content/playbook/pages/product/guests.json";
import {livePlaybookPage, validatedPlaybookPage} from "@content/playbook/playbookContract";
import {tryItCopy} from "@content/tryIt";
import {marketingCaptures} from "../app/marketingCaptures";
import {provideGuestImportDeps, type GuestImportToolDeps} from "../features/guestImportTryIt/useGuestImportController";
import {PlaybookPage} from "../features/playbook/PlaybookPage";
import {PageShell} from "../shared/site";
import {guestImportFixtures as fixtures, guestSampleCsv, scriptedGuestClient} from "./fixtures/guestImportTryIt";

const meta = {
  title: "Marketing Website/Try-it tools/Guest list",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

/** Guest records as it renders: its try band holds the guest list upload. */
const page = applyBrand(livePlaybookPage(validatedPlaybookPage(guestsPage)));

function ToolAt({width, deps}: {width: 390 | 1280; deps: GuestImportToolDeps}) {
  return (
    <div style={{margin: "0 auto", width}}>
      <PageShell pageClassName="home-page">
        {provideGuestImportDeps(deps, <PlaybookPage captures={marketingCaptures} page={page} />)}
      </PageShell>
    </div>
  );
}

const band = (canvasElement: HTMLElement) => within(canvasElement.querySelector<HTMLElement>("#try")!);

/** Chooses the sample guest list (fictional guests) and reads it. */
async function readList(canvasElement: HTMLElement) {
  const input = canvasElement.querySelector<HTMLInputElement>("#try input[type=file]")!;
  await fireEvent.change(input, {target: {files: [new File([guestSampleCsv], "salt-air-guests.csv", {type: "text/csv"})]}});
  await userEvent.click(band(canvasElement).getByRole("button", {name: "Read my list"}));
}

type Step = {name: string; deps: () => GuestImportToolDeps; play?: (canvasElement: HTMLElement) => Promise<void>};

const steps: Record<string, Step> = {
  Start: {name: "File", deps: () => ({client: scriptedGuestClient({})}),
    play: async (canvasElement) => {
      await expect(band(canvasElement).getByRole("form", {name: copy.title})).toBeInTheDocument();
    }},
  Account: {name: "Brand, city and phone", deps: () => ({client: scriptedGuestClient({}, null)}),
    play: async (canvasElement) => {
      await readList(canvasElement);
      await expect(await band(canvasElement).findByRole("button", {name: tryItCopy.account.continueWithPhone})).toBeInTheDocument();
    }},
  Mapping: {name: "Which column is which", deps: () => ({client: scriptedGuestClient({"guests.import-list": {preview: [fixtures.needsMapping]}})}),
    play: async (canvasElement) => {
      await readList(canvasElement);
      await expect(await band(canvasElement).findByRole("form", {name: copy.mapping.title})).toBeInTheDocument();
    }},
  Review: {name: "Review", deps: () => ({client: scriptedGuestClient({"guests.import-list": {preview: [fixtures.previewed]}})}),
    play: async (canvasElement) => {
      await readList(canvasElement);
      await expect(await band(canvasElement).findByRole("button", {name: copy.review.confirm})).toBeInTheDocument();
    }},
  NeedsReview: {name: "Rows that need a look", deps: () => ({client: scriptedGuestClient({"guests.import-list": {preview: [fixtures.needsReview]}})}),
    play: async (canvasElement) => {
      await readList(canvasElement);
      await expect(await band(canvasElement).findByText(copy.review.look.title)).toBeInTheDocument();
    }},
  Done: {name: "Saved", deps: () => ({client: scriptedGuestClient({"guests.import-list": {preview: [fixtures.previewed], apply: [fixtures.applied]}})}),
    play: async (canvasElement) => {
      await readList(canvasElement);
      await userEvent.click(await band(canvasElement).findByRole("button", {name: copy.review.confirm}));
      await expect(await band(canvasElement).findByRole("heading", {name: tryItCopy.claimInHost.title})).toBeInTheDocument();
    }},
  Refused: {name: "File refused",
    deps: () => ({client: scriptedGuestClient({"guests.import-list": {preview: [{problem: "invalid", reason: "roster_file_too_large"}]}})}),
    play: async (canvasElement) => {
      await readList(canvasElement);
      await expect(await band(canvasElement).findByRole("alert")).toHaveTextContent(copy.refusals.roster_file_too_large);
    }},
};

const story = (step: Step, width: 390 | 1280): Story => ({
  name: `${step.name} · ${width}`,
  render: () => <ToolAt deps={step.deps()} width={width} />,
  ...(step.play ? {play: ({canvasElement}: {canvasElement: HTMLElement}) => step.play!(canvasElement)} : {}),
});

export const Start1280 = story(steps.Start, 1280);
export const Start390 = story(steps.Start, 390);
export const Account1280 = story(steps.Account, 1280);
export const Account390 = story(steps.Account, 390);
export const Mapping1280 = story(steps.Mapping, 1280);
export const Mapping390 = story(steps.Mapping, 390);
export const Review1280 = story(steps.Review, 1280);
export const Review390 = story(steps.Review, 390);
export const NeedsReview1280 = story(steps.NeedsReview, 1280);
export const NeedsReview390 = story(steps.NeedsReview, 390);
export const Done1280 = story(steps.Done, 1280);
export const Done390 = story(steps.Done, 390);
export const Refused1280 = story(steps.Refused, 1280);
export const Refused390 = story(steps.Refused, 390);
