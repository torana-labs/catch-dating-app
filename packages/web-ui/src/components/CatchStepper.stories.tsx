import type {Meta, StoryObj} from "@storybook/react-vite";
import {useId, useState} from "react";
import {expect, userEvent, within} from "storybook/test";
import {ReferenceComparison} from "../stories/referenceScreens";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchBand} from "./CatchBand";
import {CatchGap} from "./CatchGap";
import {CatchStepper} from "./CatchStepper";
import {CatchText} from "./CatchText";

const meta = {
  title: "Web UI/CatchStepper",
  component: CatchStepper,
  args: {decreaseSemanticLabel: "One fewer place", increaseSemanticLabel: "One more place", value: 1},
} satisfies Meta<typeof CatchStepper>;

export default meta;
type Story = StoryObj<typeof meta>;

function Places({initial = 1, max = 4, min = 1}: {initial?: number; max?: number; min?: number}) {
  const [places, setPlaces] = useState(initial);
  const labelId = useId();
  return (
    <CatchGap crossAxisAlignment="center" direction="horizontal" mainAxisAlignment="spaceBetween" size="related">
      <CatchText as="span" id={labelId} variant="sectionTitle">Places</CatchText>
      <CatchStepper
        decreaseSemanticLabel="One fewer place"
        increaseSemanticLabel="One more place"
        labelledBy={labelId}
        max={max}
        min={min}
        onChanged={setPlaces}
        value={places}
      />
    </CatchGap>
  );
}

function Distance() {
  const [km, setKm] = useState(5);
  return (
    <CatchStepper
      decreaseSemanticLabel="Half a kilometre less"
      increaseSemanticLabel="Half a kilometre more"
      max={42.2}
      min={0}
      onChanged={setKm}
      step={0.5}
      unit="km"
      value={km}
    />
  );
}

function CallerOwned() {
  const [guests, setGuests] = useState(2);
  return (
    <CatchStepper
      decreaseSemanticLabel="Remove a guest"
      increaseSemanticLabel="Add a guest"
      onDecrease={guests > 0 ? () => setGuests(guests - 1) : undefined}
      onIncrease={() => setGuests(guests + 1)}
      recipe="actions"
      value={guests}
      valueLabelBuilder={(value) => (value === 1 ? "1 guest" : `${value} guests`)}
    />
  );
}

/**
 * catch.number_stepper on the web: bounded at the minimum and maximum, a
 * decimal step with a unit, caller-owned actions with a formatted value, and
 * disabled, on light and dark.
 */
export const Contract: Story = {
  render: () => {
    const states = (
      <CatchGap size="section">
        <Places />
        <Places initial={4} />
        <Distance />
        <CallerOwned />
        <CatchStepper decreaseSemanticLabel="One fewer place" enabled={false} increaseSemanticLabel="One more place" onChanged={() => undefined} value={2} />
      </CatchGap>
    );
    return (
      <StoryPage>
        <CatchBand aria-label="Light" pb="compact" pt="compact">{states}</CatchBand>
        <CatchBand aria-label="Dark" ground="ink" pb="compact" pt="compact">{states}</CatchBand>
      </StoryPage>
    );
  },
};

/** Keyboard activation steps once; the bounds disable each direction. */
export const Keyboard: Story = {
  render: () => <StoryPage><CatchBand aria-label="Places" pb="compact" pt="compact"><Places /></CatchBand></StoryPage>,
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    const fewer = canvas.getByRole("button", {name: "One fewer place"});
    const more = canvas.getByRole("button", {name: "One more place"});
    await expect(fewer).toBeDisabled();
    more.focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    await userEvent.keyboard("{Enter}");
    await expect(canvas.getByRole("group", {name: "Places"})).toHaveTextContent("4");
    await expect(more).toBeDisabled();
    await expect(fewer).toBeEnabled();
  },
};

/** The event page's booking card: "Places" with its stepper. */
export const Reference: Story = {
  render: () => (
    <ReferenceComparison
      desktop={{capture: "event/catch_full/1280", height: 60, width: 334, x: 823, y: 390}}
      label="Places stepper"
      render={() => <Places />}
    />
  ),
};
