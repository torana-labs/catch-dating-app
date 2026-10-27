import type {Meta, StoryObj} from "@storybook/react-vite";
import {useState} from "react";
import {expect, userEvent, within} from "storybook/test";
import {ReferenceComparison} from "../stories/referenceScreens";
import {StoryPage} from "../stories/websiteV2Story";
import {CatchBand} from "./CatchBand";
import {CatchButton, type CatchButtonSize, type CatchButtonVariant} from "./CatchButton";
import {CatchGap} from "./CatchGap";
import {CatchGrid} from "./CatchGrid";
import {CatchText} from "./CatchText";

const meta = {
  title: "Web UI/CatchButton",
  component: CatchButton,
  args: {label: "Book", onPressed: () => undefined},
} satisfies Meta<typeof CatchButton>;

export default meta;
type Story = StoryObj<typeof meta>;

const noop = () => undefined;

function Share() {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
      <path d="M12 3v12M7 8l5-5 5 5M5 14v6h14v-6" />
    </svg>
  );
}

function Pin() {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
      <path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12zM12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5" />
    </svg>
  );
}

function Outward() {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
}

const variants: CatchButtonVariant[] = ["primary", "secondary", "quiet", "danger", "light"];
const sizes: CatchButtonSize[] = ["sm", "md", "lg"];

function Matrix() {
  return (
    <CatchGap size="section">
      {sizes.map((size) => (
        <CatchGap direction="horizontal" key={size} size="related" wrap>
          {variants.map((variant) => <CatchButton key={variant} label={`${variant} ${size}`} onPressed={noop} size={size} variant={variant} />)}
        </CatchGap>
      ))}
      <CatchGap direction="horizontal" size="related" wrap>
        <CatchButton label="Share" leading={<Share />} onPressed={noop} variant="secondary" />
        <CatchButton href="#luma" label="Tickets" onPressed={noop} trailing={<Outward />} variant="secondary" />
        <CatchButton accentColor="var(--catch-palette-coral-deep)" label="Book" onPressed={noop} />
        <CatchButton label="Book" onPressed={null} />
        <CatchButton label="Remind me" onPressed={null} variant="secondary" />
        <CatchButton label="Booking" onPressed={noop} status="loading" />
        <CatchButton isInteractive={false} label="Booked" onPressed={noop} variant="secondary" />
        <CatchButton label="Rounded" mode="rounded" onPressed={noop} variant="secondary" />
      </CatchGap>
      <CatchButton fullWidth label="Book 1 place · ₹299" onPressed={noop} size="lg" />
    </CatchGap>
  );
}

function Recipes() {
  return (
    <CatchGap size="section">
      <CatchGrid columns={2} compactColumns={1}>
        <CatchButton label="Cancel" onPressed={noop} recipe="sheet" role="dismiss" />
        <CatchButton label="Save changes" onPressed={noop} recipe="sheet" role="commit" />
      </CatchGrid>
      <CatchGap direction="horizontal" size="related" wrap>
        <CatchButton label="Sunday Social Run, 6:30 AM, Carter Road jetty" onPressed={noop} recipe="selection" tooltip="Sunday Social Run, 6:30 AM, Carter Road jetty" />
        <CatchButton label="Share" leading={<Share />} onPressed={noop} recipe="command" />
      </CatchGap>
      <CatchGap direction="horizontal" size="related" wrap>
        <CatchButton label="Map" onPressed={noop} recipe="floating" />
        <CatchButton icon={<Pin />} label="Map" onPressed={noop} recipe="floating" />
        <CatchButton label="Type" onPressed={noop} recipe="floating" value="Run clubs" />
        <CatchButton count={3} label="Filters" onPressed={noop} recipe="floating" />
        <CatchButton icon={<Pin />} label="Map" onPressed={noop} recipe="floating" semanticsLabel="Show Sunday runs on a map" />
      </CatchGap>
      <CatchGap direction="horizontal" size="related" wrap>
        <CatchButton label="Primary text" onPressed={noop} recipe="text" />
        <CatchButton label="Neutral text" onPressed={noop} recipe="text" tone="neutral" />
        <CatchButton label="Delete" onPressed={noop} recipe="text" tone="danger" />
        <CatchButton label="Disabled text" onPressed={null} recipe="text" />
        <CatchButton foregroundColor="var(--catch-theme-positive-text)" label="Custom colour" onPressed={noop} recipe="text" />
        <CatchButton label="Custom padding" onPressed={noop} padding="var(--catch-space-s2) var(--catch-space-s4)" recipe="text" />
      </CatchGap>
    </CatchGap>
  );
}

/**
 * catch.button on the web, drawn to D20: every variant at each size; leading
 * and trailing glyphs, a link, an accent, disabled, loading, static and
 * rounded; then the sheet, selection, command, floating (label, icon, value,
 * count, semantic label) and text (tones, disabled, custom colour and
 * padding) recipes. Light and dark. Pressed, hovered and focused are pointer
 * and keyboard states (Interaction); large text and reduced motion follow the
 * reader's settings.
 */
export const Contract: Story = {
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Light" pb="compact" pt="compact"><CatchGap size="majorSection"><Matrix /><Recipes /></CatchGap></CatchBand>
      <CatchBand aria-label="Dark" ground="ink" pb="compact" pt="compact"><CatchGap size="majorSection"><Matrix /><Recipes /></CatchGap></CatchBand>
    </StoryPage>
  ),
};

function Counter() {
  const [count, setCount] = useState(0);
  return (
    <CatchGap size="related">
      <CatchButton label="Follow" onPressed={() => setCount((value) => value + 1)} />
      <CatchButton label="Following" onPressed={() => setCount((value) => value + 1)} status="loading" />
      <CatchText as="p" variant="bodyM">{`Pressed ${count} times`}</CatchText>
    </CatchGap>
  );
}

/** Pointer and keyboard both press; a loading button keeps focus but ignores presses. */
export const Interaction: Story = {
  render: () => <StoryPage><CatchBand aria-label="Interaction" pb="compact" pt="compact"><Counter /></CatchBand></StoryPage>,
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    const follow = canvas.getByRole("button", {name: "Follow"});
    await userEvent.click(follow);
    follow.focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    await expect(canvas.getByText("Pressed 3 times")).toBeVisible();
    const busy = canvas.getByRole("button", {name: "Following"});
    await expect(busy).toHaveAttribute("aria-busy", "true");
    await userEvent.click(busy);
    await expect(canvas.getByText("Pressed 3 times")).toBeVisible();
  },
};

/** The organiser page's Follow and Share pair, and the event booking card's action. */
export const Reference: Story = {
  render: () => (
    <>
      <ReferenceComparison
        desktop={{capture: "organizer/guest/1280", height: 56, width: 420, x: 100, y: 485}}
        label="Follow and Share"
        phone={{capture: "organizer/guest/390", height: 56, width: 358, x: 16, y: 538}}
        render={() => (
          <CatchGrid columns={2} compactColumns={2} gap="inline">
            <CatchButton fullWidth label="Follow" onPressed={noop} />
            <CatchButton fullWidth label="Share" leading={<Share />} onPressed={noop} variant="secondary" />
          </CatchGrid>
        )}
      />
      <ReferenceComparison
        desktop={{capture: "event/catch_full/1280", height: 62, width: 334, x: 823, y: 450}}
        label="Book"
        render={() => <CatchButton fullWidth label="Book 1 place · ₹299" onPressed={noop} size="lg" />}
      />
    </>
  ),
};
