import type {Meta, StoryObj} from "@storybook/react-vite";
import {ReferenceComparison} from "../stories/referenceScreens";
import {StoryGlyph, StoryPage} from "../stories/websiteV2Story";
import {CatchBand} from "./CatchBand";
import {CatchGap} from "./CatchGap";
import {CatchLinkTile, type CatchLinkTileProps} from "./CatchLinkTile";
import {paletteAccents} from "./palette";

const meta = {
  title: "Web UI/CatchLinkTile",
  component: CatchLinkTile,
  args: {href: "#", title: "Strava club"},
} satisfies Meta<typeof CatchLinkTile>;

export default meta;
type Story = StoryObj<typeof meta>;

// catchComponent names the website registry's T4 entry (design/website/components.json).
const storyRoutes = ["organizer_listing_canonical"];

const links: (CatchLinkTileProps & {key: string; ownerStats: string})[] = [
  {href: "#tickets", icon: <StoryGlyph name="ticket" />, key: "rave", newTab: true, newTabLabel: "opens in a new tab", ownerStats: "412 clicks · 12% of visits", pinned: true, subtitle: "Tickets on Luma · pinned until 15 Nov", title: "Run & Rave · Sat 15 Nov"},
  {href: "#whatsapp", icon: <StoryGlyph name="chat" />, key: "whatsapp", ownerStats: "268 · 8%", subtitle: "1,300 members · route updates and rain calls", title: "Join the WhatsApp community"},
  {href: "#strava", icon: <StoryGlyph name="route" />, key: "strava", ownerStats: "96 · 3%", subtitle: "Log your Sunday 5K", title: "Strava club"},
  {href: "#shop", icon: <StoryGlyph name="bag" />, key: "shop", ownerStats: "74 · 2%", subtitle: "Ships across India", title: "Club tees and caps"},
  {href: "#coffee", icon: <StoryGlyph name="coffee" />, key: "coffee", ownerStats: "51 · 1.5%", subtitle: "Show your booking at the counter", title: "15% off at Jetty Coffee"},
];

const list = (withStats: boolean) => (
  <CatchGap as="nav" aria-label="Links" size="inline">
    {links.map(({key, ownerStats, ...link}) => <CatchLinkTile key={key} {...link} stats={withStats ? ownerStats : undefined} />)}
  </CatchGap>
);

/** A guest's list: one pinned link, then plain links. */
export const Guest: Story = {
  parameters: {catchComponent: {id: "shared_link_tile", routeIds: storyRoutes, states: ["pinned", "plain", "new-tab", "subtitle"]}},
  render: () => <StoryPage><CatchBand aria-label="Guest links" pb="compact" pt="compact">{list(false)}</CatchBand></StoryPage>,
};

/** The owner's list adds each link's performance line. */
export const OwnerStats: Story = {
  parameters: {catchComponent: {id: "shared_link_tile", routeIds: storyRoutes, states: ["owner-stats", "pinned-stats"]}},
  render: () => <StoryPage><CatchBand aria-label="Owner links" pb="compact" pt="compact">{list(true)}</CatchBand></StoryPage>,
};

/** A pinned link can take any accent; a bare link needs only a title. */
export const Accents: Story = {
  parameters: {catchComponent: {id: "shared_link_tile", routeIds: storyRoutes, states: ["accents", "title-only"]}},
  render: () => (
    <StoryPage>
      <CatchBand aria-label="Accents" pb="compact" pt="compact">
        <CatchGap as="nav" aria-label="Pinned accents" size="inline">
          {paletteAccents.map((accent) => (
            <CatchLinkTile accent={accent} href={`#${accent}`} icon={<StoryGlyph name="calendar" />} key={accent} pinned subtitle="Pinned until 15 Nov" title={`Pinned on ${accent}`} />
          ))}
          <CatchLinkTile href="#instagram" icon={<StoryGlyph name="instagram" />} title="Instagram" />
        </CatchGap>
      </CatchBand>
    </StoryPage>
  ),
};

/** The organiser page's link list, for a guest and for the owner. */
export const Reference: Story = {
  parameters: {catchComponent: {id: "shared_link_tile", routeIds: storyRoutes, states: ["board-reference"]}},
  render: () => (
    <>
      <ReferenceComparison
        desktop={{capture: "organizer/guest/1280", height: 385, width: 420, x: 100, y: 765}}
        label="Link tiles, guest"
        phone={{capture: "organizer/guest/390", height: 385, width: 358, x: 16, y: 820}}
        render={() => list(false)}
      />
      <ReferenceComparison
        desktop={{capture: "organizer/owner/1280", height: 420, width: 420, x: 100, y: 845}}
        label="Link tiles, owner"
        render={() => list(true)}
      />
    </>
  ),
};
