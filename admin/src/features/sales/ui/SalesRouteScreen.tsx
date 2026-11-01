import {CatchPageTabBar} from "@catch/web-ui";
import type {ReactNode} from "react";
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
  onOpenOrganizer: (organizerId: string) => void;
  onNominate: () => void;
  onError: (message: string | null) => void;
  onNotice: (message: string) => void;
  /** The owner's Today, Hosts and Deals tabs, drawn in each screen's header. */
  tabs?: ReactNode;
}

function Today({uid, ownWorkOnly, selectedId, onSelect, onError, onNotice, tabs}: Props) {
  const names = useSalesHostNames();
  const controller = useSalesTodayController({ownerUid: ownWorkOnly ? uid : null, onError, onNotice,
    selectedTaskId: selectedId, onSelect});
  return <SalesTodayScreen model={{...controller, account: controller.account.data ?? null, names}}
    onSelect={onSelect} selectedTaskId={selectedId} tabs={tabs} />;
}

function Hosts({uid, ownWorkOnly, selectedId, onSelect, onOpenOrganizer, tabs}: Props) {
  const controller = useSalesHostsController({ownerUid: ownWorkOnly ? uid : null, selectedOrganizerId: selectedId});
  return <SalesHostsScreen model={controller} onOpenOrganizer={onOpenOrganizer} onSelect={onSelect} selectedOrganizerId={selectedId} tabs={tabs} />;
}

function Deals({uid, onOpenHost, tabs}: Props) {
  const controller = useSalesDealsController({uid});
  return <SalesDealsScreen model={controller} onOpenHost={onOpenHost} tabs={tabs} />;
}

function Nominations({selectedId, onSelect, onNominate}: Props) {
  const controller = useMyNominationsController({selectedItemId: selectedId});
  return <MyNominationsScreen model={controller} onNominate={onNominate} onSelect={onSelect} selectedItemId={selectedId} />;
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
export function SalesRouteScreen({area, ...props}: Omit<Props, "tabs"> & {area: SalesScreenArea}) {
  const tabs = props.ownWorkOnly || area === "nominations" ? undefined :
    <CatchPageTabBar label="Sales" options={areaTabs} selected={area} size="sm" fill={false} />;
  if (area === "hosts") return <Hosts {...props} tabs={tabs} />;
  if (area === "deals") return <Deals {...props} tabs={tabs} />;
  if (area === "nominations") return <Nominations {...props} />;
  return <Today {...props} tabs={tabs} />;
}
