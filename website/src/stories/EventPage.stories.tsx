import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchBand, CatchGrid, CatchSplit} from "@catch/web-ui";
import {expect, userEvent, waitFor, within} from "storybook/test";
import {publicCheckoutCopy} from "../content/events";
import {EventBooking} from "../features/events/EventBooking";
import {buildEventPageView, type EventPageData} from "../features/events/eventPageModel";
import {GuestEventEntryView} from "../features/events/GuestEventEntry";
import {EventBookingFrame} from "../shared/site/EventBookingFrame";
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

// The booking steps' first state, without the phone sign-in behind it.
const noop = () => undefined;
const signedOut = {user: null, phone: "", setPhone: noop, code: "", setCode: noop, codeSent: false,
  submit: noop, message: "", pending: false, recaptchaId: "story", viewer: null, loading: false, error: false,
  refresh: noop, changePhone: noop, changeAccount: noop,
} as unknown as Parameters<typeof GuestEventEntryView>[0]["controller"];
const bookStandIn = <GuestEventEntryView controller={signedOut} eventId="story" startLabel="Book now" />;

function EventPageStory({page}: {page: EventPageData}) {
  const view = buildEventPageView(page, eventPageFixtureNow);
  return (
    <>
      <CatchBand as="header" pb="none" pt="compact"><EventPageHeader onShare={() => undefined} view={view} /></CatchBand>
      <CatchBand as="main" pt="compact">
        <CatchSplit
          align="stretch"
          end={<EventBooking catchEntry={bookStandIn} onExternalClick={noop} view={view} />}
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
  parameters: {catchComponent: {id: "event_page_header", routeIds: ["event_detail_canonical"], states: ["organiser-link", "share"]}},
  render: () => <EventPageStory page={fullEventPage} />,
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("link", {name: "Back to Salt Air Run Club"})).toHaveAttribute("href", "/organizers/mumbai/salt-air-run-club/");
    await expect(canvas.getByRole("button", {name: "Share"})).toBeVisible();
  },
};

/** Where to book: a Catch event, an imported event and an event that has ended. */
export const BookingCard: Story = {
  name: "Booking card",
  parameters: {catchComponent: {id: "event_booking_card", routeIds: ["event_detail_canonical"], states: ["catch-native", "external-source", "closed"]}},
  render: () => (
    <CatchBand as="main" pt="compact">
      <CatchGrid columns={3} compactColumns={1}>
        {[[fullEventPage, eventPageFixtureNow], [importedEventPage, eventPageFixtureNow],
          [fullEventPage, Date.parse("2026-11-23T00:00:00.000Z")]].map(([page, now], index) => (
          <EventBookingCard catchEntry={bookStandIn} key={index}
            onExternalClick={noop} view={buildEventPageView(page as EventPageData, now as number)} />
        ))}
      </CatchGrid>
    </CatchBand>
  ),
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("link", {name: /Get tickets on Luma/})).toHaveAttribute("target", "_blank");
    await expect(canvas.getByText("Booking is closed for this event.")).toBeVisible();
  },
};

/**
 * The booking beside the page from 840px, and on a phone a docked bar with
 * the price that opens the card in a sheet. Open it at a phone width to see
 * the bar and the sheet.
 */
export const PhoneSheet: Story = {
  name: "Booking on a phone",
  parameters: {catchComponent: {id: "event_booking", routeIds: ["event_detail_canonical"],
    states: ["sticky-aside", "docked-bar", "phone-sheet", "external-source"]}},
  render: () => <EventPageStory page={fullEventPage} />,
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    const open = canvas.queryByRole("button", {name: "Book"});
    if (!open) {
      await expect(canvas.getByRole("complementary", {name: "Booking"})).toBeVisible();
      return;
    }
    await expect(canvas.getByText("27 going · 13 spots left")).toBeVisible();
    await userEvent.click(open);
    const sheet = await within(canvasElement.ownerDocument.body).findByRole("dialog", {name: "Half-marathon training: 15K"});
    await expect(within(sheet).getByRole("button", {name: "Book now"})).toBeVisible();
    await userEvent.click(within(sheet).getByRole("button", {name: "Close"}));
    await waitFor(() => expect(sheet).not.toBeVisible());
  },
};

/**
 * A booking with no event page around it: a payment receipt, an offer, an
 * invitation on its way, or an event whose public page is gone. The same
 * booking card, beside a heading that says what it is for.
 */
export const PrivateBookingPage: Story = {
  name: "Private booking page",
  parameters: {catchComponent: {id: "event_booking_frame", routeIds: ["event_booking", "event_offer", "event_invite"],
    states: ["booking-steps"]}},
  render: () => (
    <EventBookingFrame body={publicCheckoutCopy.bookingBody} title={publicCheckoutCopy.bookingTitle}>
      <GuestEventEntryView controller={signedOut} eventId="story" />
    </EventBookingFrame>
  ),
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", {level: 1, name: publicCheckoutCopy.bookingTitle})).toBeVisible();
    await expect(canvas.getByLabelText("Mobile number")).toBeVisible();
  },
};
