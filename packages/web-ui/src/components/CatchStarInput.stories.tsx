import type {Meta, StoryObj} from "@storybook/react-vite";
import {useId, useState} from "react";
import {expect, userEvent, within} from "storybook/test";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchBand} from "./CatchBand";
import {CatchGap} from "./CatchGap";
import {CatchStarInput} from "./CatchStarInput";
import {CatchText} from "./CatchText";

const meta = {
  title: "Web UI/CatchStarInput",
  component: CatchStarInput,
  args: {label: "How was it?", onChanged: () => undefined, optionLabel: (stars: number) => `${stars} stars`, value: 0},
} satisfies Meta<typeof CatchStarInput>;

export default meta;
type Story = StoryObj<typeof meta>;

// catchComponent names the website registry's T4 entry (design/website/components.json).
const storyRoutes = ["organizer_listing_canonical"];

const optionLabel = (stars: number) => (stars === 1 ? "1 star" : `${stars} stars`);

function Choice({disabled = false, initial = 0}: {disabled?: boolean; initial?: number}) {
  const [value, setValue] = useState(initial);
  const headingId = useId();
  return (
    <CatchGap size="related">
      <CatchText as="span" id={headingId} variant="sectionTitle">How was it?</CatchText>
      <CatchStarInput disabled={disabled} labelledBy={headingId} onChanged={setValue} optionLabel={optionLabel} value={value} />
      <CatchText as="p" color="ink2" variant="bodyS">{value === 0 ? "No rating yet" : `Chosen: ${optionLabel(value)}`}</CatchText>
    </CatchGap>
  );
}

/** Unrated, rated and disabled, on the paper review form the board uses. */
export const States: Story = {
  parameters: {catchComponent: {id: "shared_star_input", routeIds: storyRoutes, states: ["unrated", "rated", "disabled", "on-paper"]}},
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Write a review" ground="paper" pb="compact" pt="compact">
        <CatchGap size="section">
          <Choice />
          <Choice initial={4} />
          <Choice disabled initial={3} />
        </CatchGap>
      </CatchBand>
    </StoryPage>
  ),
};

/** Clicks and arrow keys choose, through the native radios. */
export const Keyboard: Story = {
  parameters: {catchComponent: {id: "shared_star_input", routeIds: storyRoutes, states: ["keyboard", "pointer"]}},
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Rate" ground="paper" pb="compact" pt="compact"><Choice /></CatchBand>
    </StoryPage>
  ),
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("radio", {name: "3 stars"}));
    await expect(canvas.getByText("Chosen: 3 stars")).toBeVisible();
    await userEvent.keyboard("{ArrowRight}");
    await expect(canvas.getByRole("radio", {name: "4 stars"})).toBeChecked();
    await expect(canvas.getByText("Chosen: 4 stars")).toBeVisible();
  },
};
