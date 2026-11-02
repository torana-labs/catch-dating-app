import {CatchEmptyState, CatchPageTabBar, CatchPaneLayout, CatchTopBar, CatchWorkspaceHeader} from "@catch/web-ui";
import {useSalesDealsController, useSalesHostName, useSalesHostNames} from "../controllers/useSalesDealsController";
import {useSalesHostCommercialController} from "../controllers/useSalesHostCommercialController";
import {useSalesHostsController} from "../controllers/useSalesHostsController";
import {useSalesTodayController} from "../controllers/useSalesTodayController";
import {useMyNominationsController} from "../controllers/useMyNominationsController";
import {MyNominationsScreen} from "./MyNominationsScreen";
import {SalesDealsScreen} from "./SalesDealsScreen";
import {SalesDemoWorkspace} from "./SalesDemoPanel";
import {SalesHostsScreen} from "./SalesHostsScreen";
import {SalesIntelligenceWorkspace} from "./SalesIntelligenceWorkspace";
import {SalesPartnerOfferWorkspace} from "./SalesPartnerOfferWorkspace";
import {renderSalesPrivacyWorkspace} from "./SalesPrivacyWorkspace";
import {SalesTodayScreen} from "./SalesTodayScreen";

export type SalesScreenArea = "today" | "hosts" | "deals" | "nominations";

interface Props {
  uid: string | null;
  /** A sales associate sees their own work; the owner sees the team's. */
  ownWorkOnly: boolean;
  isAdminOwner: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onOpenHost: (organizerId: string) => void;
  /** The older host page: custom fields and imported history. */
  onOpenHostTools: (organizerId: string) => void;
  onOpenHostPage: (organizerId: string, page: "fit" | "privacy" | "demo") => void;
  /** Which of one host's own pages is open. */
  hostPage: "main" | "fit" | "privacy" | "demo";
  onOpenOrganizer: (organizerId: string) => void;
  onAddHost: () => void;
  onError: (message: string | null) => void;
  onNotice: (message: string) => void;
}

function Today({uid, ownWorkOnly, selectedId, onSelect, onError, onNotice}: Props) {
  const names = useSalesHostNames();
  const controller = useSalesTodayController({ownerUid: ownWorkOnly ? uid : null, onError, onNotice,
    selectedTaskId: selectedId, onSelect});
  return <SalesTodayScreen model={{...controller, account: controller.account.data ?? null, names}}
    onSelect={onSelect} selectedTaskId={selectedId} />;
}

/** A host's own page. Privacy asks the owner to type the host's name, so nothing draws until that name is known. */
function HostOwnPage({uid, ownWorkOnly, isAdminOwner, selectedId, hostPage, onOpenHost}: Props) {
  const organizerId = selectedId as string;
  const {name, isLoading} = useSalesHostName(organizerId);
  let body = null;
  if (hostPage === "fit") {
    if (ownWorkOnly) body = <CatchEmptyState title="Only the owner and admins can open this" />;
    else if (!isLoading) body = <SalesIntelligenceWorkspace organizerId={organizerId} organizerName={name ?? ""} currentUserUid={uid ?? ""} isAdminOwner={isAdminOwner} />;
  } else if (!isAdminOwner) body = <CatchEmptyState title="Only the owner can open this" />;
  else if (!isLoading && hostPage === "demo") {
    body = <SalesDemoWorkspace key={`${uid}:${organizerId}`} organizerId={organizerId} organizerName={name ?? ""} isAdminOwner currentUserUid={uid ?? ""} />;
  } else if (!isLoading) {
    body = renderSalesPrivacyWorkspace({actorUid: uid ?? "", isAdminOwner, organizerId, ...(name ? {organizerName: name} : {})});
  }
  return <CatchPaneLayout pattern="reading" main={<>
    <CatchWorkspaceHeader title={hostPage === "fit" ? "Fit and outreach" : hostPage === "demo" ? "Private demo" : "Privacy"} kicker={name ? `Sales · ${name}` : "Sales · Hosts"}
      back={{label: "Back to the host", onPressed: () => onOpenHost(organizerId)}} />
    {body}
  </>} />;
}

function Hosts({uid, ownWorkOnly, isAdminOwner, selectedId, onSelect, onOpenOrganizer, onOpenHostTools, onOpenHostPage, onAddHost, onError, onNotice}: Props) {
  const controller = useSalesHostsController({ownerUid: ownWorkOnly ? uid : null, selectedOrganizerId: selectedId, uid, onError, onNotice});
  const commercial = useSalesHostCommercialController({organizerId: selectedId, opportunities: controller.host?.opportunities ?? [],
    enabled: !ownWorkOnly, onError, onNotice});
  return <SalesHostsScreen onOpenPrivacy={(id) => onOpenHostPage(id, "privacy")} onOpenDemo={(id) => onOpenHostPage(id, "demo")} onOpenFit={(id) => onOpenHostPage(id, "fit")} model={{...controller, uid, isAdminOwner, commercial: ownWorkOnly ? null : commercial,
    renderPartnerOffer: ownWorkOnly ? null : (organizerId, organizerName) =>
      <SalesPartnerOfferWorkspace key={`${uid}:${organizerId}`} actorUid={uid ?? ""} organizerId={organizerId} organizerName={organizerName} />}} onAddHost={onAddHost} onOpenHostTools={onOpenHostTools} onOpenOrganizer={onOpenOrganizer} onSelect={onSelect} selectedOrganizerId={selectedId} />;
}

function Deals({uid, onOpenHost}: Props) {
  const controller = useSalesDealsController({uid});
  return <SalesDealsScreen model={controller} onOpenHost={onOpenHost} />;
}

function Nominations({selectedId, onSelect, onAddHost}: Props) {
  const controller = useMyNominationsController({selectedItemId: selectedId});
  return <MyNominationsScreen model={controller} onNominate={onAddHost} onSelect={onSelect} selectedItemId={selectedId} />;
}

const areaTabs = [
  {value: "today", label: "Today", href: "/sales/today"},
  {value: "hosts", label: "Hosts", href: "/sales/hosts"},
  {value: "deals", label: "Deals", href: "/sales/deals"},
];

/**
 * The live Sales routes: each area's controller and queries, drawn by its screen. A sales
 * associate has each area in the navigation; the owner has one Sales entry and these tabs.
 */
export function SalesRouteScreen({area, ...props}: Props & {area: SalesScreenArea}) {
  const screen = area === "hosts" ? (props.hostPage !== "main" && props.selectedId ? <HostOwnPage {...props} /> : <Hosts {...props} />) : area === "deals" ? <Deals {...props} /> :
    area === "nominations" ? <Nominations {...props} /> : <Today {...props} />;
  if (props.ownWorkOnly || area === "nominations") return screen;
  return <>
    <CatchTopBar title="Sales" actions={
      <CatchPageTabBar label="Sales" options={areaTabs} selected={area} size="sm" fill={false} />} />
    {screen}
  </>;
}
