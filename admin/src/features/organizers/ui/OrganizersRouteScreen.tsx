import {CatchWorkspaceHeader} from "@catch/web-ui";
import {brand} from "@catch/brand";
import type {ReactNode} from "react";
import {useAdminFeedback} from "../../../shared/feedback/AdminFeedbackContext";
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

function PageRoute({canChangeTerms, onNavigate, organizerId, renderBills, renderEvents, tab}: {
  canChangeTerms: boolean;
  onNavigate: (path: string) => void;
  organizerId: string;
  renderBills: ((organizerId: string) => ReactNode) | null;
  renderEvents: (organizerId: string) => ReactNode;
  tab: OrganizerPageTab;
}) {
  const {setError: onError, setNotice: onNotice} = useAdminFeedback();
  const controller = useOrganizerOverviewController(organizerId, {onError, onNotice});
  const base = `/organizers/${encodeURIComponent(organizerId)}`;
  return (
    <OrganizerPageScreen
      links={{
        eventsTab: tab === "events" ? renderEvents(organizerId) : null,
        moneyBills: tab === "money" && renderBills ? renderBills(organizerId) : null,
        onCheckForEvents: () => void controller.checkForEvents(),
        isCheckingForEvents: controller.isCheckingForEvents,
        onBack: () => onNavigate("/organizers"),
        onTabChanged: (next) => onNavigate(next === "overview" ? base : `${base}/${next}`),
        onOpenEvent: (source, eventId) => onNavigate(source === "catch" ?
          `/events/${encodeURIComponent(eventId)}` : `/events/external/${encodeURIComponent(eventId)}`),
        onOpenSales: () => onNavigate(`/sales/hosts/${encodeURIComponent(organizerId)}`),
        onOpenTerms: canChangeTerms ?
          () => onNavigate(`/payment-setup/commercial-terms/organizers/${encodeURIComponent(organizerId)}`) : null,
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
  canChangeTerms,
  claimRequestId,
  onNavigate,
  organizerId,
  renderBills,
  renderEvents,
  tab,
  workspace,
}: {
  canChangeTerms: boolean;
  claimRequestId: string | null;
  onNavigate: (path: string) => void;
  organizerId: string | null;
  /** The Money tab's bills, which the Money area owns; null for those who cannot open Money. */
  renderBills: ((organizerId: string) => ReactNode) | null;
  /** The Events tab: one organizer's events, which the Events area owns. */
  renderEvents: (organizerId: string) => ReactNode;
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
    return (
      <PageRoute canChangeTerms={canChangeTerms} key={organizerId} onNavigate={onNavigate} organizerId={organizerId}
        renderBills={renderBills} renderEvents={renderEvents} tab={tab} />
    );
  }
  return <DirectoryRoute onNavigate={onNavigate} />;
}
