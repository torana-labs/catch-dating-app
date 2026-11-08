import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchPageBody, CatchRoot} from "@catch/web-ui";
import {MemoryRouter} from "react-router";
import {expect, within} from "storybook/test";
import {HostListingPage} from "../features/organizers/HostListingPage";
import {OwnerView} from "../features/organizers/owner/OwnerView";
import type {OwnerViewData} from "../features/organizers/owner/ownerViewTypes";
import {useOwnerViewController, type OwnerTab} from "../features/organizers/owner/useOwnerViewController";
import {organizerPageView} from "../features/organizers/organizerPageView";
import {WebsiteQueryProvider} from "../shared/query/queryClient";
import {claimedOrganizerPage, organizerPageReadAt, organizerStoryListing} from "./fixtures/organizerPages";
import {ownerViewFixture, ownerViewStoryBackends} from "./fixtures/ownerView";

/** The boards' frames: phone at 390 and desktop at 1280. */
const viewports = {
  ownerPhone: {name: "Owner · phone 390", styles: {width: "390px", height: "1200px"}, type: "mobile"},
  ownerDesktop: {name: "Owner · desktop 1280", styles: {width: "1280px", height: "1100px"}, type: "desktop"},
} as const;
const phone = {viewport: {value: "ownerPhone", isRotated: false}};
const desktop = {viewport: {value: "ownerDesktop", isRotated: false}};

const meta = {
  title: "Marketing Website/Organiser page/Owner view",
  parameters: {
    a11y: {test: "error"},
    catchComponentRegistry: {path: "design/website/components.json"},
    layout: "fullscreen",
    viewport: {options: viewports},
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const page = claimedOrganizerPage;
const pageView = organizerPageView(page, organizerPageReadAt);

/** The whole organiser page as its team (a uid) or a signed-out visitor (null) sees it. */
function PageStory({uid, view}: {uid: string | null; view: OwnerViewData}) {
  return (
    <WebsiteQueryProvider>
      <MemoryRouter initialEntries={[page.path]}>
        <HostListingPage listing={organizerStoryListing(page)} ownerBackends={ownerViewStoryBackends(view)} ownerUid={uid}
          page={page} readAt={organizerPageReadAt} />
      </MemoryRouter>
    </WebsiteQueryProvider>
  );
}

function OpenBar({tab, view}: {tab: OwnerTab; view: OwnerViewData}) {
  const controller = useOwnerViewController({backends: ownerViewStoryBackends(view), claimed: true, initialTab: tab,
    initialUid: "story-owner", organizerId: page.organizerId});
  return (
    <OwnerView controller={controller} displayUrl={pageView.shareUrl.replace(/^https:\/\//u, "").replace(/\/$/u, "")}
      events={pageView.events.rows} name={pageView.name} readAt={organizerPageReadAt} />
  );
}

/** The owner bar opened on one tab, in the page body the organiser page gives it. */
function PanelStory({tab, view}: {tab: OwnerTab; view: OwnerViewData}) {
  return (
    <WebsiteQueryProvider>
      <MemoryRouter initialEntries={[page.path]}>
        <CatchRoot theme="day">
          <CatchPageBody gutter pt="s4"><OpenBar tab={tab} view={view} /></CatchPageBody>
        </CatchRoot>
      </MemoryRouter>
    </WebsiteQueryProvider>
  );
}

const owner = ownerViewFixture("owner");
const editor = ownerViewFixture("editor");
const analyst = ownerViewFixture("analyst");

/** The organiser on their own page: the bar above the public page, closed. */
export const OwnerPagePhone: Story = {
  globals: phone,
  parameters: {catchComponent: {routeIds: ["organizer_listing_canonical", "organizer_listing_legacy"], id: "owner_view", states: ["owner-closed"]}},
  render: () => <PageStory uid="story-owner" view={owner} />,
  play: async ({canvasElement}) => {
    await expect(await within(canvasElement).findByRole("button", {name: "Manage"})).toBeVisible();
  },
};

export const OwnerPageDesktop: Story = {
  globals: desktop,
  parameters: {catchComponent: {routeIds: ["organizer_listing_canonical", "organizer_listing_legacy"], id: "owner_view", states: ["owner-closed"]}},
  render: () => <PageStory uid="story-owner" view={owner} />,
};

/** A signed-out visitor on a claimed page: one quiet line above the footer. */
export const SignedOutPhone: Story = {
  globals: phone,
  parameters: {catchComponent: {routeIds: ["organizer_listing_canonical", "organizer_listing_legacy"], id: "owner_sign_in_prompt", states: ["signed-out"]}},
  render: () => <PageStory uid={null} view={owner} />,
};

export const OwnerInsightsPhone: Story = {
  globals: phone,
  parameters: {catchComponent: {routeIds: ["organizer_listing_canonical", "organizer_listing_legacy"], id: "owner_insights_panel", states: ["owner", "thirty-days"]}},
  render: () => <PanelStory tab="insights" view={owner} />,
};

export const OwnerInsightsDesktop: Story = {
  globals: desktop,
  parameters: {catchComponent: {routeIds: ["organizer_listing_canonical", "organizer_listing_legacy"], id: "owner_insights_panel", states: ["owner", "thirty-days"]}},
  render: () => <PanelStory tab="insights" view={owner} />,
};

/** Before the first nightly roll-up: zeros and when numbers arrive. */
export const InsightsWaitingPhone: Story = {
  globals: phone,
  parameters: {catchComponent: {routeIds: ["organizer_listing_canonical", "organizer_listing_legacy"], id: "owner_insights_panel", states: ["waiting"]}},
  render: () => <PanelStory tab="insights" view={ownerViewFixture("owner", {waiting: true})} />,
};

export const OwnerLinksPhone: Story = {
  globals: phone,
  parameters: {catchComponent: {routeIds: ["organizer_listing_canonical", "organizer_listing_legacy"], id: "owner_links_panel", states: ["owner", "click-counts", "pinned-and-scheduled"]}},
  render: () => <PanelStory tab="links" view={owner} />,
};

export const OwnerLinksDesktop: Story = {
  globals: desktop,
  parameters: {catchComponent: {routeIds: ["organizer_listing_canonical", "organizer_listing_legacy"], id: "owner_links_panel", states: ["owner", "click-counts", "pinned-and-scheduled"]}},
  render: () => <PanelStory tab="links" view={owner} />,
};

export const OwnerPageToolsPhone: Story = {
  globals: phone,
  parameters: {catchComponent: {routeIds: ["organizer_listing_canonical", "organizer_listing_legacy"], id: "owner_page_panel", states: ["owner", "about-and-photos"]}},
  render: () => <PanelStory tab="page" view={owner} />,
};

export const OwnerPageToolsDesktop: Story = {
  globals: desktop,
  parameters: {catchComponent: {routeIds: ["organizer_listing_canonical", "organizer_listing_legacy"], id: "owner_page_panel", states: ["owner", "about-and-photos"]}},
  render: () => <PanelStory tab="page" view={owner} />,
};

export const OwnerAudiencePhone: Story = {
  globals: phone,
  parameters: {catchComponent: {routeIds: ["organizer_listing_canonical", "organizer_listing_legacy"], id: "owner_audience_panel", states: ["owner", "message-followers", "review-replies"]}},
  render: () => <PanelStory tab="audience" view={owner} />,
};

export const OwnerAudienceDesktop: Story = {
  globals: desktop,
  parameters: {catchComponent: {routeIds: ["organizer_listing_canonical", "organizer_listing_legacy"], id: "owner_audience_panel", states: ["owner", "message-followers", "review-replies"]}},
  render: () => <PanelStory tab="audience" view={owner} />,
};

/** Both of the month's follower messages sent: the composer says when it opens again. */
export const MessagesUsedUpPhone: Story = {
  globals: phone,
  parameters: {catchComponent: {routeIds: ["organizer_listing_canonical", "organizer_listing_legacy"], id: "owner_audience_panel", states: ["messages-used-up"]}},
  render: () => <PanelStory tab="audience" view={ownerViewFixture("owner", {messagesUsed: 2})} />,
};

export const OwnerSettingsPhone: Story = {
  globals: phone,
  parameters: {catchComponent: {routeIds: ["organizer_listing_canonical", "organizer_listing_legacy"], id: "owner_settings_panel", states: ["owner", "address-domain-tracking", "open-in-host"]}},
  render: () => <PanelStory tab="settings" view={owner} />,
};

export const OwnerSettingsDesktop: Story = {
  globals: desktop,
  parameters: {catchComponent: {routeIds: ["organizer_listing_canonical", "organizer_listing_legacy"], id: "owner_settings_panel", states: ["owner", "address-domain-tracking", "open-in-host"]}},
  render: () => <PanelStory tab="settings" view={owner} />,
};

/** An editor (a manager on the team): photos but not about, and no tracking settings. */
export const EditorPagePhone: Story = {
  globals: phone,
  parameters: {catchComponent: {routeIds: ["organizer_listing_canonical", "organizer_listing_legacy"], id: "owner_page_panel", states: ["editor-photos-only"]}},
  render: () => <PanelStory tab="page" view={editor} />,
};

export const EditorPageDesktop: Story = {
  globals: desktop,
  parameters: {catchComponent: {routeIds: ["organizer_listing_canonical", "organizer_listing_legacy"], id: "owner_page_panel", states: ["editor-photos-only"]}},
  render: () => <PanelStory tab="page" view={editor} />,
};

export const EditorSettingsPhone: Story = {
  globals: phone,
  parameters: {catchComponent: {routeIds: ["organizer_listing_canonical", "organizer_listing_legacy"], id: "owner_settings_panel", states: ["editor-host-only"]}},
  render: () => <PanelStory tab="settings" view={editor} />,
};

export const EditorSettingsDesktop: Story = {
  globals: desktop,
  parameters: {catchComponent: {routeIds: ["organizer_listing_canonical", "organizer_listing_legacy"], id: "owner_settings_panel", states: ["editor-host-only"]}},
  render: () => <PanelStory tab="settings" view={editor} />,
};

/** An analyst reads insights and opens events in Host; nothing else. */
export const AnalystInsightsPhone: Story = {
  globals: phone,
  parameters: {catchComponent: {routeIds: ["organizer_listing_canonical", "organizer_listing_legacy"], id: "owner_view", states: ["analyst-tabs"]}},
  render: () => <PanelStory tab="insights" view={analyst} />,
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("tab", {name: "Insights"})).toBeVisible();
    await expect(canvas.queryByRole("tab", {name: "Links"})).toBeNull();
  },
};

export const AnalystInsightsDesktop: Story = {
  globals: desktop,
  parameters: {catchComponent: {routeIds: ["organizer_listing_canonical", "organizer_listing_legacy"], id: "owner_view", states: ["analyst-tabs"]}},
  render: () => <PanelStory tab="insights" view={analyst} />,
};

export const AnalystSettingsPhone: Story = {
  globals: phone,
  parameters: {catchComponent: {routeIds: ["organizer_listing_canonical", "organizer_listing_legacy"], id: "owner_settings_panel", states: ["analyst-host-only"]}},
  render: () => <PanelStory tab="settings" view={analyst} />,
};
