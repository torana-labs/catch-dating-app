import type {Meta, StoryObj} from "@storybook/react-vite";
import {expect, userEvent, within} from "storybook/test";
import {applyBrand} from "@content/brand";
import formsPage from "@content/playbook/pages/product/forms.json";
import {livePlaybookPage, validatedPlaybookPage, type PlaybookPageDocument} from "@content/playbook/playbookContract";
import {tryItCopy} from "@content/tryIt";
import {marketingCaptures} from "../app/marketingCaptures";
import {PlaybookPage} from "../features/playbook/PlaybookPage";
import {playbookFormsPreviewToolSlot, playbookLeadForms} from "../features/playbook/playbookLeadForms";
import {provideTryItDeps, type TryItToolDeps} from "../features/tryIt/useTryItToolController";
import {PageShell} from "../shared/site";
import {fixtureFormTyped, formFixtures, formUnknownFlagPreview} from "./fixtures/formImportTryIt";
import {scriptedTryItClient, workspaceFixtures} from "./fixtures/tryItCommands";

const meta = {
  title: "Marketing Website/Try-it tools/Forms",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The Forms page with its try band shown and the form tool drawn as if
 * form.import-from-link were website-ready (the owner preview's slot). On
 * the site both stay hidden until the command is switched on.
 */
function shown(raw: unknown): PlaybookPageDocument {
  const page = validatedPlaybookPage(raw);
  return applyBrand(livePlaybookPage({...page, sections: page.sections.map((section) =>
    section.id === "try" ? {...section, status: "built" as const} : section)}));
}

const page = shown(formsPage);
const slots = {...playbookLeadForms, tool: playbookFormsPreviewToolSlot};
const quick = {wait: async () => undefined};

function FormsAt({width, deps}: {width: 390 | 1280; deps: TryItToolDeps}) {
  return (
    <div style={{margin: "0 auto", width}}>
      <PageShell pageClassName="home-page">
        {provideTryItDeps(deps, <PlaybookPage captures={marketingCaptures} leadForms={slots} page={page} />)}
      </PageShell>
    </div>
  );
}

const band = (canvasElement: HTMLElement) => within(canvasElement.querySelector<HTMLElement>("#try")!);

async function pasteForm(canvasElement: HTMLElement) {
  const tool = band(canvasElement);
  await userEvent.type(tool.getByRole("textbox", {name: /Link to a Google Form/u}), fixtureFormTyped);
  await userEvent.click(tool.getByRole("button", {name: "Bring my form"}));
}

type Step = {name: string; deps: () => TryItToolDeps; play?: (canvasElement: HTMLElement) => Promise<void>};

const steps: Record<string, Step> = {
  Start: {name: "Forms · link", deps: () => ({client: scriptedTryItClient({}), ...quick}),
    play: async (canvasElement) => {
      await expect(band(canvasElement).getByRole("form", {name: tryItCopy.tools.form.title})).toBeInTheDocument();
    }},
  Account: {name: "Forms · brand, city and phone", deps: () => ({client: scriptedTryItClient({}, null), ...quick}),
    play: async (canvasElement) => {
      await pasteForm(canvasElement);
      await expect(await band(canvasElement).findByRole("button", {name: tryItCopy.account.continueWithPhone})).toBeInTheDocument();
    }},
  Workspace: {name: "Forms · private profile",
    deps: () => ({client: scriptedTryItClient({"form.import-from-link": {preview: [formFixtures.noWorkspace]},
      "workspace.ensure": {preview: [workspaceFixtures.previewNew]}}), ...quick}),
    play: async (canvasElement) => {
      await pasteForm(canvasElement);
      const tool = band(canvasElement);
      await userEvent.type(await tool.findByRole("textbox", {name: new RegExp(tryItCopy.account.brand, "u")}), "Driftwood Bay Runners");
      await userEvent.selectOptions(tool.getByRole("combobox", {name: new RegExp(tryItCopy.account.city, "u")}), "in-mh-mumbai");
      await userEvent.click(tool.getByRole("button", {name: tryItCopy.account.continue}));
      await expect(await tool.findByRole("button", {name: tryItCopy.workspace.confirm})).toBeInTheDocument();
    }},
  Review: {name: "Forms · the draft form, its jumps and what to rebuild",
    deps: () => ({client: scriptedTryItClient({"form.import-from-link": {preview: [formFixtures.previewed]}}), ...quick}),
    play: async (canvasElement) => {
      await pasteForm(canvasElement);
      await expect(await band(canvasElement).findByRole("button", {name: tryItCopy.tools.form.confirm})).toBeInTheDocument();
      await expect(band(canvasElement).getByText(tryItCopy.tools.form.flags.codes.grid_not_supported)).toBeInTheDocument();
    }},
  UnknownFlag: {name: "Forms · a flag the site doesn't know yet",
    deps: () => ({client: scriptedTryItClient({"form.import-from-link": {preview: [formUnknownFlagPreview]}}), ...quick}),
    play: async (canvasElement) => {
      await pasteForm(canvasElement);
      await expect(await band(canvasElement).findByText(tryItCopy.tools.form.flags.other)).toBeInTheDocument();
    }},
  Revised: {name: "Forms · the form changed, previewed again",
    deps: () => ({client: scriptedTryItClient({"form.import-from-link": {preview: [formFixtures.previewed, formFixtures.previewedAgain],
      apply: [{problem: "changed"}]}}), ...quick}),
    play: async (canvasElement) => {
      await pasteForm(canvasElement);
      await userEvent.click(await band(canvasElement).findByRole("button", {name: tryItCopy.tools.form.confirm}));
      await expect(await band(canvasElement).findByText(tryItCopy.tools.form.revised)).toBeInTheDocument();
    }},
  Done: {name: "Forms · draft form made, claim it",
    deps: () => ({client: scriptedTryItClient({"form.import-from-link": {preview: [formFixtures.previewed], apply: [formFixtures.applied]}}), ...quick}),
    play: async (canvasElement) => {
      await pasteForm(canvasElement);
      await userEvent.click(await band(canvasElement).findByRole("button", {name: tryItCopy.tools.form.confirm}));
      await expect(await band(canvasElement).findByRole("heading", {name: tryItCopy.claimInHost.title})).toBeInTheDocument();
    }},
  Problem: {name: "Forms · form refused",
    deps: () => ({client: scriptedTryItClient({"form.import-from-link": {preview: [formFixtures.refused]}}), ...quick}),
    play: async (canvasElement) => {
      await pasteForm(canvasElement);
      await expect(await band(canvasElement).findByRole("alert")).toBeInTheDocument();
    }},
};

const story = (step: Step, width: 390 | 1280): Story => ({
  name: `${step.name} · ${width}`,
  render: () => <FormsAt deps={step.deps()} width={width} />,
  ...(step.play ? {play: ({canvasElement}: {canvasElement: HTMLElement}) => step.play!(canvasElement)} : {}),
});

export const FormStart1280 = story(steps.Start, 1280);
export const FormStart390 = story(steps.Start, 390);
export const FormAccount1280 = story(steps.Account, 1280);
export const FormAccount390 = story(steps.Account, 390);
export const FormWorkspace1280 = story(steps.Workspace, 1280);
export const FormWorkspace390 = story(steps.Workspace, 390);
export const FormReview1280 = story(steps.Review, 1280);
export const FormReview390 = story(steps.Review, 390);
export const FormUnknownFlag1280 = story(steps.UnknownFlag, 1280);
export const FormUnknownFlag390 = story(steps.UnknownFlag, 390);
export const FormRevised1280 = story(steps.Revised, 1280);
export const FormRevised390 = story(steps.Revised, 390);
export const FormDone1280 = story(steps.Done, 1280);
export const FormDone390 = story(steps.Done, 390);
export const FormProblem1280 = story(steps.Problem, 1280);
export const FormProblem390 = story(steps.Problem, 390);
