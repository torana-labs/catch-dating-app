import type {Meta, StoryObj} from "@storybook/react-vite";
import {ReferenceComparison} from "../stories/referenceScreens";
import {StoryBadge, StoryMonogram, StoryPage} from "../stories/websiteV2Story";
import {CatchBand} from "./CatchBand";
import {CatchGap} from "./CatchGap";
import {CatchGrid} from "./CatchGrid";
import {CatchReviewItem, type CatchReviewItemProps} from "./CatchReviewItem";
import {CatchText} from "./CatchText";
import type {Ground} from "./palette";

const meta = {
  title: "Web UI/CatchReviewItem",
  component: CatchReviewItem,
  args: {body: "", name: "", rating: 5, ratingLabel: "5 out of 5"},
} satisfies Meta<typeof CatchReviewItem>;

export default meta;
type Story = StoryObj<typeof meta>;

// catchComponent names the website registry's T4 entry (design/website/components.json).
const storyRoutes = ["organizer_listing_canonical", "event_detail_canonical"];

const verified = <StoryBadge label="Booked on Catch" tone="verified" />;
const unverified = <StoryBadge label="Unverified" tone="neutral" />;
const avatar = (initials: string, ground: Ground) => <StoryMonogram ground={ground} initials={initials} />;
// The board's Reply action; CatchButton replaces this stand-in once it has a React twin.
const replyAction = (
  <button
    style={{
      background: "var(--catch-palette-white)",
      border: "var(--catch-stroke-hairline) solid var(--catch-theme-line2)",
      borderRadius: "var(--catch-radius-xs)",
      color: "var(--catch-palette-ink)",
      font: "600 var(--catch-typography-web-context-size) var(--catch-font-function), system-ui, sans-serif",
      height: "var(--catch-space-s8)",
      padding: "0 var(--catch-space-s3)",
    }}
    type="button"
  >
    Reply
  </button>
);

const riya: CatchReviewItemProps = {
  avatar: avatar("RS", "pink"),
  badge: verified,
  body: "Came on my own, left with a pace group and a coffee plan. Kabir does a round of names before the start, which made it easy.",
  meta: "Sunday Social Run · 2 weeks ago",
  name: "Riya S.",
  rating: 5,
  ratingLabel: "5 out of 5",
  reply: {author: "Kabir", text: "See you Sunday, Riya!", verb: "replied:"},
};

const arjun: CatchReviewItemProps = {
  avatar: avatar("AM", "indigo"),
  badge: unverified,
  body: "Best organised run-and-party I've been to. Bag drop, water at the halfway point, and the playlist kept everyone going.",
  meta: "Run & Rave · 1 month ago",
  name: "Arjun M.",
  rating: 5,
  ratingLabel: "5 out of 5",
};

const neha: CatchReviewItemProps = {
  avatar: avatar("NK", "mint"),
  badge: verified,
  body: "Lovely crowd. The 6:00 per km group was a bit fast for a first-timer, but the leader waited for me at the turn.",
  meta: "Sunday Social Run · 1 month ago",
  name: "Neha K.",
  rating: 4,
  ratingLabel: "4 out of 5",
  reply: {author: "Meera", text: "Thanks Neha. From this Sunday there's a 7:30 per km group too.", verb: "replied:"},
};

const unclaimedNote = (
  <CatchText as="p" color="ink2" variant="bodyS">Carter Road Runners hasn't claimed this page, so they can't reply yet.</CatchText>
);

/** The organiser page's list: verified with a reply, unverified, and the owner's Reply action. */
export const Rows: Story = {
  parameters: {catchComponent: {id: "shared_review_item", routeIds: storyRoutes, states: ["row", "verified", "unverified", "owner-reply", "reply-action", "unclaimed-note"]}},
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Reviews" pb="compact" pt="compact">
        <CatchGap as="section" aria-label="Reviews list" size="headerTitleToSubtitle">
          <CatchReviewItem {...riya} />
          <CatchReviewItem {...arjun} footer={replyAction} />
          <CatchReviewItem {...neha} />
          <CatchReviewItem {...arjun} footer={unclaimedNote} name="Sana P." />
        </CatchGap>
      </CatchBand>
    </StoryPage>
  ),
};

/** The event page's compact cards: name and badge, stars, text, then where and when. */
export const Cards: Story = {
  parameters: {catchComponent: {id: "shared_review_item", routeIds: storyRoutes, states: ["card", "card-verified", "card-unverified"]}},
  render: () => (
    <StoryPage>
      <CatchBand aria-label="What people say" pb="compact" pt="compact">
        <CatchGrid as="ul" aria-label="Reviews" columns={2}>
          <CatchReviewItem {...riya} avatar={undefined} reply={undefined} variant="card" />
          <CatchReviewItem {...neha} avatar={undefined} reply={undefined} variant="card" />
          <CatchReviewItem {...arjun} avatar={undefined} variant="card" />
        </CatchGrid>
      </CatchBand>
    </StoryPage>
  ),
};

/** The organiser page's review list. */
export const RowsReference: Story = {
  parameters: {catchComponent: {id: "shared_review_item", routeIds: storyRoutes, states: ["board-reference-rows"]}},
  render: () => (
    <ReferenceComparison
      desktop={{capture: "organizer/guest/1280", height: 640, width: 340, x: 840, y: 1180}}
      label="Review rows"
      phone={{capture: "organizer/guest/390", height: 670, width: 358, x: 16, y: 2842}}
      render={() => (
        <div>
          <CatchReviewItem {...riya} />
          <CatchReviewItem {...arjun} />
          <CatchReviewItem {...neha} />
        </div>
      )}
    />
  ),
};

/** The event page's "What people say" cards. */
export const CardsReference: Story = {
  parameters: {catchComponent: {id: "shared_review_item", routeIds: storyRoutes, states: ["board-reference-cards"]}},
  render: () => (
    <ReferenceComparison
      desktop={{capture: "event/catch_full/1280", height: 225, width: 652, x: 100, y: 2910}}
      label="Review cards"
      phone={{capture: "event/catch_full/390", height: 400, width: 358, x: 16, y: 3600}}
      render={() => (
        <CatchGrid columns={2}>
          <CatchReviewItem {...riya} avatar={undefined} reply={undefined} variant="card" />
          <CatchReviewItem {...neha} avatar={undefined} reply={undefined} variant="card" />
        </CatchGrid>
      )}
    />
  ),
};
