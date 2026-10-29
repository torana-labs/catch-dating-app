import type {Meta, StoryObj} from "@storybook/react-vite";
import {useState} from "react";
import {expect, userEvent, waitFor, within} from "storybook/test";
import {ReferenceComparison} from "../stories/referenceScreens";
import {StoryTile} from "../stories/websiteV2Story";
import {CatchBand} from "./CatchBand";
import {CatchButton} from "./CatchButton";
import {CatchGap} from "./CatchGap";
import {CatchSplit} from "./CatchSplit";
import {CatchStepper} from "./CatchStepper";
import {CatchStickyAside} from "./CatchStickyAside";
import {CatchText} from "./CatchText";

const meta = {
  title: "Web UI/CatchStickyAside",
  component: CatchStickyAside,
  args: {children: null, closeLabel: "Close", dock: null, label: "Booking", openLabel: "Book"},
} satisfies Meta<typeof CatchStickyAside>;

export default meta;
type Story = StoryObj<typeof meta>;

// catchComponent names the website registry's T4 entry (design/website/components.json).
const storyRoutes = ["event_detail_canonical"];
const noop = () => undefined;

function BookingCard() {
  const [places, setPlaces] = useState(1);
  return (
    <CatchGap size="related">
      <CatchText as="p" variant="displayS">₹299</CatchText>
      <CatchText as="p" variant="supportingStrong">Sun 23 Nov · 5:45 to 8:30 AM</CatchText>
      <CatchText as="p" color="ink2" variant="bodyS">13 of 40 spots left</CatchText>
      <CatchStepper decreaseSemanticLabel="One fewer place" increaseSemanticLabel="One more place" max={4} min={1}
        onChanged={setPlaces} value={places} />
      <CatchButton fullWidth label={`Book ${places} ${places === 1 ? "place" : "places"} · ₹${299 * places}`} onPressed={noop} />
      <CatchText as="p" color="ink2" variant="bodyS">Free cancellation up to 24 hours before.</CatchText>
    </CatchGap>
  );
}

function Summary() {
  return (
    <CatchGap size="related">
      <CatchText as="span" variant="sectionTitle">₹299</CatchText>
      <CatchText as="span" color="ink2" variant="bodyS">13 spots left</CatchText>
    </CatchGap>
  );
}

function EventPage() {
  return (
    <CatchBand aria-label="Event" pb="compact" pt="compact">
      <CatchSplit
        align="stretch"
        end={
          <CatchStickyAside closeLabel="Close" dock={<Summary />} label="Booking" openLabel="Book" sheetTitle="Book your place">
            <BookingCard />
          </CatchStickyAside>
        }
        ratio="narrowRail"
        railSide="end"
        start={
          <CatchGap size="section">
            {["The plan for the morning", "Where", "Good to know", "What people say", "More from Carter Road Runners"].map((title) => (
              <StoryTile body="Section content scrolls past while the booking card stays in view." key={title} minHeight={320} title={title} />
            ))}
          </CatchGap>
        }
      />
    </CatchBand>
  );
}

/**
 * The event page's booking card: sticky beside the content on a wide page,
 * and a docked bar that opens it in a bottom sheet on a phone. Open the story
 * at a phone width to see the bar and sheet.
 */
export const EventBooking: Story = {
  parameters: {catchComponent: {id: "shared_sticky_aside", routeIds: storyRoutes, states: ["sticky", "docked", "sheet-open", "phone-size"]}},
  // No StoryPage: its frame contains fixed elements, and the docked bar belongs to the viewport.
  render: () => <EventPage />,
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    const open = canvas.queryByRole("button", {name: "Book"});
    if (!open) {
      await expect(canvas.getByRole("complementary", {name: "Booking"})).toBeVisible();
      return;
    }
    await userEvent.click(open);
    const sheet = await within(canvasElement.ownerDocument.body).findByRole("dialog", {name: "Book your place"});
    await userEvent.click(within(sheet).getByRole("button", {name: "Close"}));
    await waitFor(() => expect(sheet).not.toBeVisible());
  },
};

/** The board's booking rail beside the event, and its docked bar on a phone. */
export const Reference: Story = {
  parameters: {catchComponent: {id: "shared_sticky_aside", routeIds: storyRoutes, states: ["board-reference"]}},
  render: () => (
    <ReferenceComparison
      desktop={{capture: "event/catch_full/1280", height: 420, width: 400, x: 790, y: 230}}
      label="Booking aside"
      phone={{capture: "event/catch_full/390", height: 80, width: 390, x: 0, y: 4480}}
      render={(pageWidth) => (
        // The docked bar is fixed to the frame's bottom edge, so the phone frame takes the crop's height.
        <div style={{height: pageWidth < 840 ? 80 : undefined}}>
          <CatchStickyAside closeLabel="Close" dock={<Summary />} label="Booking" openLabel="Book" sheetTitle="Book your place">
            <BookingCard />
          </CatchStickyAside>
        </div>
      )}
    />
  ),
};
