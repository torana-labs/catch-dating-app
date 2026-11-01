import type {Meta, StoryObj} from "@storybook/react-vite";
import {sampleNominations} from "../features/sales/api/myNominationsRepository";
import type {SalesAccountDetail, SalesOpportunity, SalesTask} from "../features/sales/api/salesTypes";
import {dealColumn, dealColumns} from "../features/sales/controllers/salesLabels";
import {MyNominationsScreen} from "../features/sales/ui/MyNominationsScreen";
import {SalesDealsScreen} from "../features/sales/ui/SalesDealsScreen";
import {SalesHostsScreen} from "../features/sales/ui/SalesHostsScreen";
import {SalesTodayScreen} from "../features/sales/ui/SalesTodayScreen";

const meta = {
  title: "Admin Dashboard/Sales",
  parameters: {catchComponentRegistry: {path: "design/admin/components.json"}},
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const now = Date.parse("2026-11-01T06:30:00.000Z");
const pinClock = () => {
  const realNow = Date.now;
  Date.now = () => now;
  return () => { Date.now = realNow; };
};
const noop = () => undefined;
const done = async () => true;
const iso = (days: number) => new Date(now + days * 86_400_000).toISOString();

const hosts: Array<[string, string]> = [["harbor", "Harbor Social Club"], ["seaside", "Seaside Sessions"], ["northside", "Northside Walks"],
  ["sunday", "The Sunday Table"], ["afterfly", "Afterfly"]];
const names = new Map(hosts);
const tasks: SalesTask[] = [
  {taskId: "t1", organizerId: "harbor", kind: "reply", title: "Reply to their enquiry", dueAt: iso(-1), ownerUid: "riya", status: "open", revision: 1},
  {taskId: "t2", organizerId: "seaside", kind: "follow_up", title: "Follow up on the demo link", dueAt: iso(0), ownerUid: "riya", status: "open", revision: 1},
  {taskId: "t3", organizerId: "northside", kind: "research", title: "Review research: 2 sources", dueAt: iso(0), ownerUid: "riya", status: "open", revision: 1},
  {taskId: "t4", organizerId: "afterfly", kind: "follow_up", title: "Send the claim link", dueAt: iso(2), ownerUid: "riya", status: "open", revision: 1},
  {taskId: "t5", organizerId: "sunday", kind: "pilot", title: "Pilot check-in: week 2 of 4", dueAt: iso(3), ownerUid: "riya", status: "open", revision: 1},
];
const harbor: SalesAccountDetail = {
  account: {organizerId: "harbor", revision: 2, researchStatus: "qualified",
    summary: "Board games and quiz nights for 20–40 people. Sells tickets by UPI today; wants a booking page and a waitlist."},
  organizerSummary: {name: "Harbor Social Club", city: "Mumbai", appVisibility: "hidden", claimStatus: "unclaimed"},
  activities: [{activityId: "a1", type: "note", occurredAt: iso(-2), note: "Enquiry from the host website"},
    {activityId: "a2", type: "call", occurredAt: iso(-1), note: "Kavya wants a demo next week"}],
  opportunities: [{opportunityId: "o1", organizerId: "harbor", motion: "first_workflow_pilot", stage: "in_conversation", ownerUid: "riya",
    nextStep: "Demo call with Kavya", nextStepAt: iso(4), revision: 1}],
  tasks: [tasks[0]!],
};

export const SalesTodayStory: Story = {
  name: "Today · a sales associate",
  beforeEach: pinClock,
  parameters: {catchComponent: {id: "route_sales_today", states: ["due-first", "kind-chips", "inspector", "log-dock"]}},
  render: () => (
    <SalesTodayScreen selectedTaskId="t1" onSelect={noop} model={{scope: "week", setScope: noop, kind: null, setKind: noop, rows: tasks,
      counts: {due: 3, week: 5, later: 0, kinds: {reply: 1, follow_up: 2, review: 1, pilot: 1}}, selected: tasks[0]!, nextTask: tasks[1]!,
      position: {index: 1, of: 5}, logAndComplete: done, snooze: done, complete: done, isSaving: false, account: harbor, names}} />
  ),
};

const hostsModel = {query: "", setQuery: noop, hasNextPage: false, hasPreviousPage: false, nextPage: noop, previousPage: noop,
  tab: "overview" as const, setTab: noop,
  rows: hosts.map(([organizerId, name], index) => ({organizerId, name, city: "Mumbai",
    researchStatus: index < 2 ? "qualified" as const : "needs_research" as const, stage: index < 3 ? "in_conversation" : null,
    nextAction: index === 0 ? "Demo call on Tuesday" : null}))};

export const SalesHostsStory: Story = {
  name: "Hosts",
  beforeEach: pinClock,
  parameters: {catchComponent: {id: "route_sales_hosts", states: ["directory", "host-overview"]}},
  render: () => <SalesHostsScreen model={{...hostsModel, host: null}} onAddHost={noop} onOpenHostTools={noop} onOpenOrganizer={noop} onSelect={noop} selectedOrganizerId={null} />,
};

export const SalesHostStory: Story = {
  name: "Hosts · a host page",
  beforeEach: pinClock,
  render: () => <SalesHostsScreen model={{...hostsModel, host: harbor}} onAddHost={noop} onOpenHostTools={noop} onOpenOrganizer={noop} onSelect={noop} selectedOrganizerId="harbor" />,
};

const deals: SalesOpportunity[] = [
  ["harbor", "new_enquiry", "Reply overdue"], ["seaside", "in_conversation", "Follow-up today"], ["northside", "demo_arranged", "Demo Wed"],
  ["sunday", "pilot_running", "Week 2 of 4"], ["afterfly", "closed_won", "Paying since October"],
].map(([organizerId, stage, nextStep], index) => ({opportunityId: `d${index}`, organizerId: organizerId!, motion: "first_workflow_pilot",
  stage: stage!, ownerUid: "riya", nextStep: nextStep!, nextStepAt: null, revision: 1}));

export const SalesDealsStory: Story = {
  name: "Deals",
  beforeEach: pinClock,
  parameters: {catchComponent: {id: "route_sales_deals", states: ["stage-columns", "team-or-mine"]}},
  render: () => (
    <SalesDealsScreen onOpenHost={noop} model={{scope: "team", setScope: noop, search: "", setSearch: noop, truncated: false,
      counts: {team: 5, mine: 5},
      columns: dealColumns.map((column) => ({...column, cards: deals.filter((deal) => dealColumn(deal) === column.value)
        .map((deal) => ({deal, name: names.get(deal.organizerId) ?? deal.organizerId}))}))}} />
  ),
};

export const MyNominationsStory: Story = {
  name: "My nominations · a stuck one",
  beforeEach: pinClock,
  parameters: {catchComponent: {id: "route_sales_nominations", states: ["filter-chips", "stuck-detail"]}},
  render: () => (
    <MyNominationsScreen onNominate={noop} onSelect={noop} selectedItemId="supply-sunday-table" model={{filter: "all", setFilter: noop,
      rows: sampleNominations, totals: {all: 3, published: 1, waiting: 1, stuck: 1}, hasNextPage: false, hasPreviousPage: false,
      nextPage: noop, previousPage: noop, detailError: false,
      detail: {item: {itemId: "supply-sunday-table", type: "stuck", sourceKind: "supplyIntakeRequest", sourceId: "sunday",
        sourcePath: "supplyIntakeRequests/sunday", title: "Sunday Table", subtitle: null, cameFrom: "You on WhatsApp", nominatorUid: "riya",
        city: "mumbai", state: {code: "needs_person", label: "Stuck: Instagram asked to sign in", tone: "danger"}, status: "waiting",
        waitingSince: iso(-0.2), doneAt: null, assigneeUid: null, snoozedUntil: null, recommendation: null},
      journey: [{stepId: "submitted", occurredAt: iso(-0.2), title: "You sent a link on WhatsApp", detail: "instagram.com/sundaytable", actorUid: "riya", tone: "ink"},
        {stepId: "failed-1", occurredAt: iso(-0.19), title: "Could not read the page", detail: "Instagram showed a sign-in wall", actorUid: null, tone: "danger"}],
      canWork: false, canDecideClaim: false}}} />
  ),
};
