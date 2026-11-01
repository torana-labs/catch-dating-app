import {CatchWorkspaceHeader} from "@catch/web-ui";
import {brand} from "@catch/brand";
import {OrganizerEventsRouteWorkspace} from "../../events/ui/EventsRouteScreen";
import {useOrganizerDirectoryController} from "../controllers/useOrganizerDirectoryController";
import {useOrganizerOverviewController} from "../controllers/useOrganizerOverviewController";
import {OrganizerDirectoryScreen} from "./OrganizerDirectoryScreen";
import {OrganizerPageScreen, type OrganizerPageTab} from "./OrganizerPageScreen";
import {OrganizerPublishingScreen} from "./OrganizerPublishingScreen";

const publicSiteOrigin = String(
  import.meta.env.VITE_ADMIN_PUBLIC_SITE_ORIGIN ?? brand.web.origin
).replace(/\/+$/u, "");

function DirectoryRoute({onNavigate}: {onNavigate: (path: string) => void}) {
  const controller = useOrganizerDirectoryController();
  return (
    <OrganizerDirectoryScreen
      controller={controller}
      onAddOrganizer={() => onNavigate("/intake/organizers")}
      onOpenOrganizer={(id) => onNavigate(`/organizers/${encodeURIComponent(id)}`)}
    />
  );
}

function PageRoute({onNavigate, organizerId, tab}: {
  onNavigate: (path: string) => void;
  organizerId: string;
  tab: OrganizerPageTab;
}) {
  const controller = useOrganizerOverviewController(organizerId);
  const base = `/organizers/${encodeURIComponent(organizerId)}`;
  return (
    <OrganizerPageScreen
      links={{
        eventsTab: tab === "events" ?
          <OrganizerEventsRouteWorkspace onNavigate={onNavigate} organizerId={organizerId} /> : null,
        onBack: () => onNavigate("/organizers"),
        onTabChanged: (next) => onNavigate(next === "overview" ? base : `${base}/${next}`),
        onOpenEvent: (source, eventId) => onNavigate(source === "catch" ?
          `/events/${encodeURIComponent(eventId)}` : `/events/external/${encodeURIComponent(eventId)}`),
        onOpenSales: () => onNavigate(`/sales/hosts/${encodeURIComponent(organizerId)}`),
        onOpenTerms: () => onNavigate(`/finance/commercial-terms/organizers/${encodeURIComponent(organizerId)}`),
        onOpenClaim: (requestId) => onNavigate(`/organizers/claims/${encodeURIComponent(requestId)}`),
        publicPageUrl: (canonicalPath) => `${publicSiteOrigin}${canonicalPath}`,
      }}
      loadError={controller.loadError}
      overview={controller.overview}
      pageEditor={tab === "page" ?
        <OrganizerPublishingScreen onBackToList={() => onNavigate("/organizers")} selectedOrganizerId={organizerId} /> :
        null}
      tab={tab}
    />
  );
}

/**
 * The Organizers area: the directory, or one organizer's page and its tabs. Claims keep their
 * review screen here until the Inbox decides them.
 */
export function OrganizersRouteScreen({
  claimRequestId,
  onNavigate,
  organizerId,
  tab,
  workspace,
}: {
  claimRequestId: string | null;
  onNavigate: (path: string) => void;
  organizerId: string | null;
  tab: OrganizerPageTab;
  workspace: "directory" | "claims";
}) {
  if (workspace === "claims") {
    return (
      <>
        <CatchWorkspaceHeader title="Claims" />
        <OrganizerPublishingScreen
          activeWorkspace="claims"
          onBackToClaims={() => onNavigate("/organizers/claims")}
          onSelectClaimRequestId={(requestId) => onNavigate(`/organizers/claims/${encodeURIComponent(requestId)}`)}
          onWorkspaceChange={(next) => onNavigate(next === "claims" ? "/organizers/claims" : "/organizers")}
          selectedClaimRequestId={claimRequestId}
        />
      </>
    );
  }
  if (organizerId) {
    return <PageRoute key={organizerId} onNavigate={onNavigate} organizerId={organizerId} tab={tab} />;
  }
  return <DirectoryRoute onNavigate={onNavigate} />;
}
