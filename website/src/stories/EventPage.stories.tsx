import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchBand, CatchButton, CatchSplit} from "@catch/web-ui";
import {expect, within} from "storybook/test";
import {buildEventPageView, type EventPageData} from "../features/events/eventPageModel";
import {EventBookingCard, EventPageHeader, EventPageMain} from "../features/events/sections/EventPageSections";
import {
  bareEventPage,
  eventPageFixtureNow,
  eventPageWithout,
  fullEventPage,
  importedEventPage,
  optionalEventFields,
  type OptionalEventField,
} from "./fixtures/eventPages";

type FieldArgs = Record<OptionalEventField, boolean>;

const meta: Meta<FieldArgs> = {
  title: "Marketing Website/Events/Event page",
  parameters: {
    catchComponentRegistry: {path: "design/website/components.json"},
    catchRouteContract: {path: "design/website/routes.json"},
    layout: "fullscreen",
  },
  args: Object.fromEntries(optionalEventFields.map((field) => [field, true])) as FieldArgs,
  argTypes: Object.fromEntries(optionalEventFields.map((field) => [field, {control: "boolean"}])),
};

export default meta;
type Story = StoryObj<FieldArgs>;

const sections = ["catch-native", "external-source", "optional-fields", "photo-or-poster", "event-reviews", "more-events"];

// Booking is the guest entry in the route stories; this stand-in keeps the
// card's place without the phone sign-in.
const bookStandIn = <CatchButton fullWidth label="Book" onPressed={() => undefined} />;

function EventPageStory({page}: {page: EventPageData}) {
  const view = buildEventPageView(page, eventPageFixtureNow);
  return (
    <>
      <CatchBand as="header" pb="none" pt="compact"><EventPageHeader onShare={() => undefined} view={view} /></CatchBand>
      <CatchBand as="main" pt="compact">
        <CatchSplit
          end={<EventBookingCard catchEntry={bookStandIn} externalAction={(button) => button} onExternalClick={() => undefined} view={view} />}
          gap="regular"
          railSide="end"
          ratio="narrowRail"
          start={<EventPageMain view={view} />}
        />
      </CatchBand>
    </>
  );
}

/** Switch each of the ten optional fields on and off, as the board's prototype does. */
export const OptionalFields: Story = {
  name: "Optional fields",
  parameters: {catchComponent: {id: "event_page_sections", routeIds: ["event_detail_canonical"], states: sections}},
  render: (args) => <EventPageStory page={eventPageWithout(optionalEventFields.filter((field) => !args[field]))} />,
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", {level: 1, name: "Half-marathon training: 15K"})).toBeVisible();
    for (const name of ["You won’t be standing around.", "The plan for the morning", "Where", "Good to know",
      "27 going · 13 spots left", "What people say", "More from Salt Air Run Club"]) {
      await expect(canvas.getByRole("heading", {name})).toBeVisible();
    }
  },
};

/** Every optional field off: the page still reads as complete. */
export const NoOptionalFields: Story = {
  name: "No optional fields",
  render: () => <EventPageStory page={bareEventPage} />,
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    for (const name of ["You won’t be standing around.", "Good to know", "What people say"]) {
      await expect(canvas.queryByRole("heading", {name})).toBeNull();
    }
    await expect(canvas.getByRole("link", {name: /Open in Google Maps/})).toHaveAttribute("target", "_blank");
  },
};

/** An imported Luma event: title, time, place, price and description only. */
export const LumaImport: Story = {
  name: "Imported from Luma",
  render: () => <EventPageStory page={importedEventPage} />,
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Social run · imported from Luma")).toBeVisible();
    await expect(canvas.getByRole("link", {name: /Get tickets on Luma/})).toHaveAttribute("href", "https://lu.ma/salt-air-sunset-run-social");
  },
};

/** The full event, kept still for the visual baseline. */
export const AllFields: Story = {
  name: "All optional fields",
  render: () => <EventPageStory page={fullEventPage} />,
};
