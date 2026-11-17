import type {Meta, StoryObj} from "@storybook/react-vite";
import {applyBrand} from "@content/brand";
import pricing from "@content/playbook/pages/product/pricing.json";
import {validatedPlaybookPage, type PlaybookSectionOf} from "@content/playbook/playbookContract";
import {PricingCapBand, PricingIncludedBand} from "../features/marketing/PricingBands";
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
const capSection = customSection("cap");
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
