import type {Meta, StoryObj} from "@storybook/react-vite";
import {expect, fireEvent, userEvent, within} from "storybook/test";
import {applyBrand} from "@content/brand";
import {pastSalesTryItCopy as copy} from "@content/pastSalesTryIt";
import reportsPage from "@content/playbook/pages/product/reports.json";
import {livePlaybookPage, validatedPlaybookPage} from "@content/playbook/playbookContract";
import {tryItCopy} from "@content/tryIt";
import {marketingCaptures} from "../app/marketingCaptures";
import {providePastSalesDeps, type PastSalesToolDeps} from "../features/pastSalesTryIt/usePastSalesToolController";
import {PlaybookPage} from "../features/playbook/PlaybookPage";
import {PageShell} from "../shared/site";
import {fixtureExportFile, pastSalesFixtures, scriptedPastSalesClient} from "./fixtures/pastSalesTryItCommands";

const meta = {
  title: "Marketing Website/Try-it tools/Reports export upload",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

/** /product/reports-and-payouts/ as it renders, with the export upload in its try band. */
const page = applyBrand(livePlaybookPage(validatedPlaybookPage(reportsPage)));
const bytes = new TextEncoder().encode("Name,Ticket,Amount\nAnanya Rao,General,400\n");

function ToolAt({width, deps}: {width: 390 | 1280; deps: PastSalesToolDeps}) {
  return (
    <div style={{margin: "0 auto", width}}>
      <PageShell pageClassName="home-page">
        {providePastSalesDeps({readFile: async () => bytes, today: () => "2026-11-20", ...deps}, <PlaybookPage captures={marketingCaptures} page={page} />)}
      </PageShell>
    </div>
  );
}

const band = (canvasElement: HTMLElement) => within(canvasElement.querySelector<HTMLElement>("#try")!);

async function upload(canvasElement: HTMLElement) {
  const tool = band(canvasElement);
  fireEvent.change(tool.getByLabelText(copy.chooseFile), {target: {files: [fixtureExportFile()]}});
  await userEvent.click(tool.getByRole("button", {name: "Build my report"}));
}

type Step = {name: string; deps: () => PastSalesToolDeps; play?: (canvasElement: HTMLElement) => Promise<void>};

const steps: Record<string, Step> = {
  Start: {name: "Reports · choose an export", deps: () => ({client: scriptedPastSalesClient({})}),
    play: async (canvasElement) => {
      await expect(band(canvasElement).getByRole("form", {name: copy.title})).toBeInTheDocument();
    }},
  Account: {name: "Reports · brand, city and phone", deps: () => ({client: scriptedPastSalesClient({}, null)}),
    play: async (canvasElement) => {
      await upload(canvasElement);
      await expect(await band(canvasElement).findByRole("button", {name: tryItCopy.account.continueWithPhone})).toBeInTheDocument();
    }},
  Mapping: {name: "Reports · which column is which", deps: () => ({client: scriptedPastSalesClient({"sales.import-past": {preview: [pastSalesFixtures.needsMapping]}})}),
    play: async (canvasElement) => {
      await upload(canvasElement);
      await expect(await band(canvasElement).findByRole("heading", {name: copy.mapping.title})).toBeInTheDocument();
    }},
  Review: {name: "Reports · the night's report", deps: () => ({client: scriptedPastSalesClient({"sales.import-past": {preview: [pastSalesFixtures.previewed]}})}),
    play: async (canvasElement) => {
      await upload(canvasElement);
      await expect(await band(canvasElement).findByRole("button", {name: copy.review.save})).toBeInTheDocument();
    }},
  Gaps: {name: "Reports · what the export can't tell", deps: () => ({client: scriptedPastSalesClient({"sales.import-past": {preview: [pastSalesFixtures.thin]}})}),
    play: async (canvasElement) => {
      await upload(canvasElement);
      await expect(await band(canvasElement).findByText(copy.report.catchFeeReasons.no_sales_amounts)).toBeInTheDocument();
    }},
  Rows: {name: "Reports · rows to look at", deps: () => ({client: scriptedPastSalesClient({"sales.import-past": {preview: [pastSalesFixtures.rowsNeedReview]}})}),
    play: async (canvasElement) => {
      await upload(canvasElement);
      await expect(await band(canvasElement).findByRole("button", {name: copy.review.leaveOut})).toBeInTheDocument();
    }},
  Done: {name: "Reports · saved, claim it",
    deps: () => ({client: scriptedPastSalesClient({"sales.import-past": {preview: [pastSalesFixtures.previewedAgain], apply: [pastSalesFixtures.applied]}})}),
    play: async (canvasElement) => {
      await upload(canvasElement);
      await userEvent.click(await band(canvasElement).findByRole("button", {name: copy.review.save}));
      await expect(await band(canvasElement).findByRole("heading", {name: tryItCopy.claimInHost.title})).toBeInTheDocument();
    }},
  Problem: {name: "Reports · file refused",
    deps: () => ({client: scriptedPastSalesClient({"sales.import-past": {preview: [{problem: "invalid", reason: "roster_malformed_csv"}]}})}),
    play: async (canvasElement) => {
      await upload(canvasElement);
      await expect(await band(canvasElement).findByRole("alert")).toHaveTextContent(copy.reasons.roster_malformed_csv);
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
export const Gaps1280 = story(steps.Gaps, 1280);
export const Gaps390 = story(steps.Gaps, 390);
export const Rows1280 = story(steps.Rows, 1280);
export const Rows390 = story(steps.Rows, 390);
export const Done1280 = story(steps.Done, 1280);
export const Done390 = story(steps.Done, 390);
export const Problem1280 = story(steps.Problem, 1280);
export const Problem390 = story(steps.Problem, 390);
