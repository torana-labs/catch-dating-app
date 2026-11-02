import {CatchPageTabBar, CatchTopBar} from "@catch/web-ui";
import {useSalesDealsController, useSalesHostNames} from "../controllers/useSalesDealsController";
import {useSalesHostsController} from "../controllers/useSalesHostsController";
import {useSalesTodayController} from "../controllers/useSalesTodayController";
import {useMyNominationsController} from "../controllers/useMyNominationsController";
import {MyNominationsScreen} from "./MyNominationsScreen";
import {SalesDealsScreen} from "./SalesDealsScreen";
import {SalesHostsScreen} from "./SalesHostsScreen";
import {SalesTodayScreen} from "./SalesTodayScreen";

export type SalesScreenArea = "today" | "hosts" | "deals" | "nominations";

interface Props {
  uid: string | null;
  /** A sales associate sees their own work; the owner sees the team's. */
  ownWorkOnly: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onOpenHost: (organizerId: string) => void;
  /** The older host page: editing, stage moves, pilots, quotes, people and evidence. */
  onOpenHostTools: (organizerId: string) => void;
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

function Hosts({uid, ownWorkOnly, selectedId, onSelect, onOpenOrganizer, onOpenHostTools, onAddHost, onError, onNotice}: Props) {
  const controller = useSalesHostsController({ownerUid: ownWorkOnly ? uid : null, selectedOrganizerId: selectedId, uid, onError, onNotice});
  return <SalesHostsScreen model={{...controller, uid}} onAddHost={onAddHost} onOpenHostTools={onOpenHostTools} onOpenOrganizer={onOpenOrganizer} onSelect={onSelect} selectedOrganizerId={selectedId} />;
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
  const screen = area === "hosts" ? <Hosts {...props} /> : area === "deals" ? <Deals {...props} /> :
    area === "nominations" ? <Nominations {...props} /> : <Today {...props} />;
  if (props.ownWorkOnly || area === "nominations") return screen;
  return <>
    <CatchTopBar title="Sales" actions={
      <CatchPageTabBar label="Sales" options={areaTabs} selected={area} size="sm" fill={false} />} />
    {screen}
  </>;
}
