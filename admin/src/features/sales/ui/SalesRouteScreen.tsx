import {CatchEmptyState, CatchPageTabBar, CatchPaneLayout, CatchTopBar, CatchWorkspaceHeader} from "@catch/web-ui";
import {useSalesDealsController, useSalesHostNames} from "../controllers/useSalesDealsController";
import {useSalesHostCommercialController} from "../controllers/useSalesHostCommercialController";
import {useSalesHostsController} from "../controllers/useSalesHostsController";
import {useSalesTodayController} from "../controllers/useSalesTodayController";
import {useMyNominationsController} from "../controllers/useMyNominationsController";
import {MyNominationsScreen} from "./MyNominationsScreen";
import {SalesDealsScreen} from "./SalesDealsScreen";
import {SalesHostsScreen} from "./SalesHostsScreen";
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
  /** The older host page: fit and demos. */
  onOpenHostTools: (organizerId: string) => void;
  onOpenHostPrivacy: (organizerId: string) => void;
  /** Which of one host's own pages is open. */
  hostPage: "main" | "privacy";
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

function HostPrivacy({uid, isAdminOwner, selectedId, onOpenHost}: Props) {
  return <CatchPaneLayout pattern="reading" main={<>
    <CatchWorkspaceHeader title="Privacy" kicker="Sales · Hosts" back={{label: "Back to the host", onPressed: () => onOpenHost(selectedId as string)}} />
    {isAdminOwner ? renderSalesPrivacyWorkspace({actorUid: uid ?? "", isAdminOwner, organizerId: selectedId as string}) :
      <CatchEmptyState title="Only the owner can open this" />}
  </>} />;
}

function Hosts({uid, ownWorkOnly, isAdminOwner, selectedId, onSelect, onOpenOrganizer, onOpenHostTools, onOpenHostPrivacy, onAddHost, onError, onNotice}: Props) {
  const controller = useSalesHostsController({ownerUid: ownWorkOnly ? uid : null, selectedOrganizerId: selectedId, uid, onError, onNotice});
  const commercial = useSalesHostCommercialController({organizerId: selectedId, opportunities: controller.host?.opportunities ?? [],
    enabled: !ownWorkOnly, onError, onNotice});
  return <SalesHostsScreen onOpenPrivacy={onOpenHostPrivacy} model={{...controller, uid, isAdminOwner, commercial: ownWorkOnly ? null : commercial,
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
  const screen = area === "hosts" ? (props.hostPage === "privacy" && props.selectedId ? <HostPrivacy {...props} /> : <Hosts {...props} />) : area === "deals" ? <Deals {...props} /> :
    area === "nominations" ? <Nominations {...props} /> : <Today {...props} />;
  if (props.ownWorkOnly || area === "nominations") return screen;
  return <>
    <CatchTopBar title="Sales" actions={
      <CatchPageTabBar label="Sales" options={areaTabs} selected={area} size="sm" fill={false} />} />
    {screen}
  </>;
}
