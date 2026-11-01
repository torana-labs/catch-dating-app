import type {Meta, StoryObj} from "@storybook/react-vite";
import {sampleInboxItems, sampleInboxJourneys, sampleNow} from "../features/inbox/api/inboxSampleData";
import {InboxScreen, type InboxScreenModel} from "../features/inbox/ui/InboxScreen";

const meta = {
  title: "Admin Dashboard/Inbox",
  parameters: {
    catchComponentRegistry: {
      path: "design/admin/components.json",
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// Waiting times read Date.now(); pin it to the sample inbox's clock.
const pinClock = () => {
  const realNow = Date.now;
  Date.now = () => sampleNow;
  return () => {
    Date.now = realNow;
  };
};

const noop = () => undefined;
const done = async () => true;

function model(selectedItemId: string | null, canDecideClaim = false): InboxScreenModel {
  const items = sampleInboxItems;
  const index = items.findIndex((item) => item.itemId === selectedItemId);
  const item = index >= 0 ? items[index] : null;
  return {
    scope: "waiting", type: null, setScope: noop, setType: noop,
    items,
    totals: {scopes: {waiting: items.length, mine: 1, snoozed: 0, working: 2},
      types: {all: items.length, listing: 3, event: 1, claim: 1, enquiry: 1, access: 0, stuck: 1}},
    oldestWaitingSince: items[0]?.waitingSince ?? null,
    hasNextPage: false, hasPreviousPage: false, nextPage: noop, previousPage: noop,
    position: index >= 0 ? {index: index + 1, of: items.length} : null,
    nextItem: index >= 0 ? items[index + 1] ?? null : null,
    previousItem: index > 0 ? items[index - 1] ?? null : null,
    selectNext: noop, selectPrevious: noop,
    openListingReview: noop, listingReview: null, listingReviewFailed: false, approveListing: done, isApproving: false,
    updateItem: done, recommendClaim: done, decideClaim: done, decideAccess: done, linkEnquiry: done,
    hostQuery: selectedItemId === "enquiry-harbor" ? "Harbor" : "", setHostQuery: noop,
    hostMatches: selectedItemId === "enquiry-harbor" ? [{organizerId: "harbor-social", name: "Harbor Social Club", city: "Mumbai"}] : [],
    isWorking: false,
    detail: item ? {item, journey: sampleInboxJourneys[item.itemId] ?? [], canWork: true, canDecideClaim} : null,
    detailError: false,
  };
}

const screen = (selectedItemId: string | null, canDecideClaim = false) => (
  <InboxScreen
    model={model(selectedItemId, canDecideClaim)}
    onOpenReview={noop}
    onSelect={noop}
    selectedItemId={selectedItemId}
    uid="sample-dev"
  />
);

export const InboxRouteStory: Story = {
  name: "Inbox · a listing",
  beforeEach: pinClock,
  parameters: {catchComponent: {id: "route_inbox", states: ["oldest-first", "type-chips", "inspector", "journey"]}},
  render: () => screen("supply-afterfly"),
};

export const InboxClaimStory: Story = {
  name: "Inbox · a claim, as ops sees it",
  beforeEach: pinClock,
  render: () => screen("claim-bhag"),
};

export const InboxClaimOwnerStory: Story = {
  name: "Inbox · a claim, as the owner decides it",
  beforeEach: pinClock,
  render: () => screen("claim-bhag", true),
};

export const InboxStuckStory: Story = {
  name: "Inbox · a stuck nomination",
  beforeEach: pinClock,
  render: () => screen("supply-sunday-table"),
};

export const InboxEnquiryStory: Story = {
  name: "Inbox · an enquiry, linking it to a host",
  beforeEach: pinClock,
  render: () => screen("enquiry-harbor"),
};
