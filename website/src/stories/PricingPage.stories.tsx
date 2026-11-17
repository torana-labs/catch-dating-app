import type {Meta, StoryObj} from "@storybook/react-vite";
import {applyBrand} from "@content/brand";
import pricing from "@content/playbook/pages/product/pricing.json";
import {validatedPlaybookPage, type PlaybookSectionOf} from "@content/playbook/playbookContract";
import {PricingCapBand, PricingExamplesBand, PricingIncludedBand, PricingOrganisationsBand} from "../features/marketing/PricingBands";
import {CatchRoot} from "@catch/web-ui";

const meta = {
  title: "Marketing Website/Pricing bands",
  parameters: {
    catchComponentRegistry: {
      path: "design/website/components.json",
    },
    catchRouteContract: {
      path: "design/website/routes.json",
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// The page as the renderer gets it: validated, with its brand tokens resolved; the bands read their words from it.
const pricingPage = applyBrand(validatedPlaybookPage(pricing));

const customSection = (id: string): PlaybookSectionOf<"custom"> => {
  const section = pricingPage.sections.find((item) => item.id === id);
  if (section?.type !== "custom") throw new Error(`/pricing/ has no custom section ${id}.`);
  return section;
};
const examplesSection = customSection("examples");
const organisationsSection = customSection("organisations");
const capSection = customSection("cap");
const label = (section: PlaybookSectionOf<"custom">, key: string) => section.labels?.find((item) => item.key === key)?.text ?? "";
const includedSection = customSection("included");

/** The cap band alone: its words beside the cap chart the fee model works out. */
export const CapBand: Story = {
  name: "/pricing/ · the cap band",
  parameters: {layout: "fullscreen", catchComponent: {id: "pricing_cap_band", routeIds: ["pricing"], states: ["cap"]}},
  render: () => (
    <CatchRoot theme="day">
      <PricingCapBand id="cap" kicker={capSection.kicker} lead={capSection.lead} title={capSection.title ?? ""} />
    </CatchRoot>
  ),
};

/** What the one plan includes, as tags. */
export const IncludedBand: Story = {
  name: "/pricing/ · what is included",
  parameters: {layout: "fullscreen", catchComponent: {id: "pricing_included_band", routeIds: ["pricing"], states: ["included"]}},
  render: () => {
    const labels = includedSection.labels ?? [];
    return (
      <CatchRoot theme="day">
        <PricingIncludedBand id="included" items={labels.filter((label) => label.key !== "label").map((label) => label.text)} kicker={includedSection.kicker}
          label={labels.find((label) => label.key === "label")?.text ?? ""} lead={includedSection.lead} title={includedSection.title ?? ""} />
      </CatchRoot>
    );
  },
};

/** What hosts like you pay: the fee on six kinds of night as white ring cards. */
export const ExamplesBand: Story = {
  name: "/pricing/ · worked examples",
  parameters: {layout: "fullscreen", catchComponent: {id: "pricing_examples_band", routeIds: ["pricing"], states: ["examples"]}},
  render: () => (
    <CatchRoot theme="day">
      <PricingExamplesBand foot={label(examplesSection, "foot")} id="examples" kicker={examplesSection.kicker} title={examplesSection.title ?? ""} />
    </CatchRoot>
  ),
};

/** Venues, companies and programmes: the walkthrough and weddings buttons in the second column. */
export const OrganisationsBand: Story = {
  name: "/pricing/ · organisations",
  parameters: {layout: "fullscreen", catchComponent: {id: "pricing_organisations_band", routeIds: ["pricing"], states: ["organisations"]}},
  render: () => (
    <CatchRoot theme="day">
      <PricingOrganisationsBand
        actions={[{label: label(organisationsSection, "walkthrough"), href: "#walkthrough"}, {label: label(organisationsSection, "weddings"), href: "/weddings/", variant: "secondary"}]}
        id="organisations" kicker={organisationsSection.kicker} lead={organisationsSection.lead} title={organisationsSection.title ?? ""} />
    </CatchRoot>
  ),
};
