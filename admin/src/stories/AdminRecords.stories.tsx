import type {Meta, StoryObj} from "@storybook/react-vite";
import {brand} from "@catch/brand";
import type {EventDirectoryController} from "../features/events/controllers/useEventDirectoryController";
import {initialEventDirectoryFilters} from "../features/events/controllers/useEventDirectoryController";
import {EventDirectoryScreen, OrganizerEventsWorkspace} from "../features/events/ui/EventDirectoryScreen";
import {EventPageScreen} from "../features/events/ui/EventPageScreen";
import {OrganizerBillsWorkspace} from "../features/money/ui/OrganizerBillsWorkspace";
import {
  organizerMonthBreakdown,
  organizerMoneySummary,
  type OrganizerBillsController,
} from "../features/money/controllers/useOrganizerBillsController";
import {moneySampleNowMillis, sampleManageOrganizerBills} from "../features/money/api/moneySamples";
import type {OrganizerDirectoryController} from "../features/organizers/controllers/useOrganizerDirectoryController";
import {initialOrganizerDirectoryFilters} from "../features/organizers/controllers/useOrganizerDirectoryController";
import {OrganizerDirectoryScreen} from "../features/organizers/ui/OrganizerDirectoryScreen";
import {OrganizerPageScreen, type OrganizerPageLinks} from "../features/organizers/ui/OrganizerPageScreen";
import {sampleEventDetails, sampleExternalEventRows} from "../shared/api/sampleData";
import {
  sampleGetOrganizerOverview,
  sampleListEventDirectory,
  sampleListOrganizerDirectory,
} from "../shared/api/sampleRecords";

type Story = StoryObj;

const noop = () => undefined;

function organizerDirectory(): OrganizerDirectoryController {
  const page = sampleListOrganizerDirectory({view: "all", limit: 50});
  return {
    filters: initialOrganizerDirectoryFilters, rows: page.rows, total: page.total, views: page.views,
    facets: page.facets, complete: true, loadState: "ready", loadError: null, hasMore: false,
    isLoadingMore: false, setView: noop, setQuery: noop, toggleCity: noop, toggleKind: noop,
    toggleClaimState: noop, toggleMine: noop, loadMore: noop, refresh: noop,
  };
}

function eventDirectory(organizerId: string | null = null): EventDirectoryController {
  const page = sampleListEventDirectory({view: "upcoming", organizerId, limit: 50});
  return {
    filters: initialEventDirectoryFilters, rows: page.rows, total: page.total, views: page.views,
    facets: page.facets, complete: true, loadState: "ready", loadError: null, hasMore: false,
    isLoadingMore: false, setView: noop, setQuery: noop, toggleCity: noop, toggleSource: noop,
    toggleNeedsCheck: noop, toggleThisWeek: noop, loadMore: noop, refresh: noop,
  };
}

function organizerBills(): OrganizerBillsController {
  const {bills} = sampleManageOrganizerBills({action: "list", month: null,
    organizerId: "mumbai-padel-social", billId: null, expectedRevision: null, note: null});
  return {bills, summary: organizerMoneySummary(bills),
    latest: bills[0] ? organizerMonthBreakdown(bills[0]) : null, loadState: "ready", loadError: null};
}

const organizerLinks: OrganizerPageLinks = {
  eventsTab: <OrganizerEventsWorkspace controller={eventDirectory("afterfly")} onOpenEvent={noop} />,
  moneyBills: <OrganizerBillsWorkspace controller={organizerBills()} nowMillis={moneySampleNowMillis} onOpenBill={noop} />,
  onBack: noop,
  onTabChanged: noop,
  onOpenEvent: noop,
  onOpenSales: noop,
  onOpenTerms: noop,
  onOpenClaim: noop,
  publicPageUrl: (canonicalPath) => `${brand.web.origin}${canonicalPath}`,
};

const meta = {
  title: "Admin Dashboard/Records",
  parameters: {
    catchComponentRegistry: {
      path: "design/admin/components.json",
    },
  },
} satisfies Meta;

export default meta;

export const OrganizerDirectoryRouteStory: Story = {
  name: "Organizers",
  parameters: {catchComponent: {id: "route_organizer_directory", states: ["all", "views", "chips"]}},
  render: () => (
    <OrganizerDirectoryScreen controller={organizerDirectory()} onAddOrganizer={noop} onOpenOrganizer={noop} />
  ),
};

export const OrganizerPageRouteStory: Story = {
  name: "Organizer page",
  parameters: {catchComponent: {id: "route_organizer_page", states: ["overview", "journey", "upcoming"]}},
  render: () => (
    <OrganizerPageScreen
      links={organizerLinks}
      loadError={null}
      overview={sampleGetOrganizerOverview({organizerId: "afterfly"})}
      pageEditor={null}
      tab="overview"
    />
  ),
};

export const OrganizerMoneyRouteStory: Story = {
  name: "Organizer page, money",
  parameters: {catchComponent: {id: "route_organizer_page", states: ["money"]}},
  render: () => (
    <OrganizerPageScreen
      links={organizerLinks}
      loadError={null}
      overview={sampleGetOrganizerOverview({organizerId: "mumbai-padel-social"})}
      pageEditor={null}
      tab="money"
    />
  ),
};

export const OrganizerBillsWorkspaceStory: Story = {
  name: "Organizer bills",
  parameters: {catchComponent: {id: "workspace_organizer_bills", states: ["bills", "latest-month"]}},
  render: () => <OrganizerBillsWorkspace controller={organizerBills()} nowMillis={moneySampleNowMillis} onOpenBill={noop} />,
};

export const EventDirectoryRouteStory: Story = {
  name: "Events",
  parameters: {catchComponent: {id: "route_event_directory", states: ["upcoming", "catch-and-imported"]}},
  render: () => <EventDirectoryScreen controller={eventDirectory()} onOpenEvent={noop} />,
};

export const OrganizerEventsWorkspaceStory: Story = {
  name: "Organizer events",
  parameters: {catchComponent: {id: "workspace_organizer_events", states: ["upcoming"]}},
  render: () => <OrganizerEventsWorkspace controller={eventDirectory("afterfly")} onOpenEvent={noop} />,
};

export const EventPageRouteStory: Story = {
  name: "Event page",
  parameters: {catchComponent: {id: "route_event_page", states: ["catch-event"]}},
  render: () => (
    <EventPageScreen
      loadError={null}
      onBack={noop}
      onOpenOrganizer={noop}
      onTabChanged={noop}
      pageEditor={null}
      record={{source: "catch", event: sampleEventDetails["mumbai-padel-mixer-1"]!}}
      tab="overview"
    />
  ),
};

export const ImportedEventPageRouteStory: Story = {
  name: "Event page, imported",
  parameters: {catchComponent: {id: "route_event_page", states: ["imported-event"]}},
  render: () => (
    <EventPageScreen
      loadError={null}
      onBack={noop}
      onOpenOrganizer={noop}
      onTabChanged={noop}
      pageEditor={null}
      record={{source: "imported", event: sampleExternalEventRows[0]!}}
      tab="overview"
    />
  ),
};
