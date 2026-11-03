import type {Meta, StoryObj} from "@storybook/react-vite";
import {sampleNominations} from "../features/sales/api/myNominationsRepository";
import type {SalesAccountDetail, SalesEvidence, SalesOpportunity, SalesTask} from "../features/sales/api/salesTypes";
import {dealColumn, dealColumns} from "../features/sales/controllers/salesLabels";
import {MyNominationsScreen} from "../features/sales/ui/MyNominationsScreen";
import {SalesDealsScreen} from "../features/sales/ui/SalesDealsScreen";
import {SalesHostCommercialWorkspace, type SalesHostCommercialModel} from "../features/sales/ui/SalesHostCommercialWorkspace";
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

const hostsModel = {query: "", setQuery: noop, validSearch: true, researchStatus: null, setResearchStatus: noop, mineOnly: false, setMineOnly: noop, hasNextPage: false, hasPreviousPage: false, nextPage: noop, previousPage: noop,
  tab: "overview" as const, setTab: noop,
  privateFields: [{fieldId: "sales.who_decides", label: "Who decides", type: "string" as const, recordType: "account" as const, helpText: "the person who says yes", revision: 1}],
  privateFieldsLoading: false, privateFieldsFailed: false, retryPrivateFields: noop, saveCustomValue: async () => true,
  contacts: [{contactId: "c1", displayName: "Kavya Rao", relationship: {revision: 1, role: "Founder", decisionInfluence: "decision_maker" as const,
    primary: true, contactabilityStatus: "unknown" as const, sendAuthority: false as const}}],
  logActivity: async () => true, addNextStep: async () => true, completeNextStep: async () => true, saveDeal: async () => true, saveHost: async () => true, addPerson: async () => true,
  evidence: [{evidenceId: "e1", organizerId: "harbor", contactId: null, claimKey: "identity" as const, signalId: null, sourceType: "public_web" as const,
    sourceRef: "instagram.com/harborsocial", observedAt: "2026-10-30T09:00:00.000Z", validThrough: null, confidence: "high" as const,
    normalizedValue: "Runs board games and quiz nights in Bandra", excerpt: null}],
  evidenceFailed: false, retryEvidence: noop, hasMoreEvidence: false, moreEvidence: noop, addEvidence: async () => true,
  suggestions: [{proposalId: "p1", organizerId: "harbor", revision: 1, status: "pending" as const, createdAt: "2026-10-30T09:00:00.000Z", clientId: "assistant", reviewReason: null,
    evidence: {organizerId: "harbor", claimKey: "recurrence" as const, sourceType: "public_web" as const, sourceRef: "harborsocial.in/events",
      observedAt: "2026-10-29T09:00:00.000Z", confidence: "medium" as const, normalizedValue: "About four events a month"}}],
  suggestionsFailed: false, retrySuggestions: noop, hasMoreSuggestions: false, moreSuggestions: noop, reviewSuggestion: async () => true, setHold: async () => true,
  contactsFailed: false, retryContacts: noop, hasMoreContacts: false, moreContacts: noop, reviewContact: async () => true,
  canEditResearch: true, uid: "sample-owner", isSaving: false, isAdminOwner: true, commercial: null, renderPartnerOffer: null,
  rows: hosts.map(([organizerId, name], index) => ({organizerId, name, city: "Mumbai",
    researchStatus: index < 2 ? "qualified" as const : "needs_research" as const, stage: index < 3 ? "in_conversation" : null,
    nextAction: index === 0 ? "Demo call on Tuesday" : null}))};

export const SalesHostsStory: Story = {
  name: "Hosts",
  beforeEach: pinClock,
  parameters: {catchComponent: {id: "route_sales_hosts", states: ["directory", "host-overview"]}},
  render: () => <SalesHostsScreen model={{...hostsModel, host: null}} onAddHost={noop} onOpenFit={noop} onOpenFitQueue={noop} onOpenPrivacy={noop} onOpenDemo={noop} onOpenOrganizer={noop} onSelect={noop} selectedOrganizerId={null} />,
};

export const SalesHostStory: Story = {
  name: "Hosts · a host page",
  beforeEach: pinClock,
  render: () => <SalesHostsScreen model={{...hostsModel, host: harbor}} onAddHost={noop} onOpenFit={noop} onOpenFitQueue={noop} onOpenPrivacy={noop} onOpenDemo={noop} onOpenOrganizer={noop} onSelect={noop} selectedOrganizerId="harbor" />,
};

const quoteTerms = {currency: "INR", amountMinor: 500_000, billingCadence: "monthly" as const, scope: "Booking pages and guest messages for one host",
  validUntil: iso(20), sourceFactRefs: ["e1"]};
const dealEvidence = [{evidenceId: "e1", organizerId: "harbor", contactId: null, claimKey: "operation" as const, sourceType: "first_party" as const,
  sourceRef: "Call with Kavya", observedAt: iso(-2), confidence: "high" as const}] as SalesEvidence[];
const commercialModel: SalesHostCommercialModel = {dealId: "o1", selectDeal: noop, recordFailed: false, retryRecord: noop, reportFailed: false, retryReport: noop,
  hasMoreReport: false, moreReport: noop, savePilot: done, reviseQuote: done, approveQuote: done, acceptQuote: done, attestCollection: done, closeWon: done, isSaving: false,
  reportRows: [{opportunityId: "o1", stage: "pilot_running", ownerUid: "sample-owner", pilotStatus: "active", pilotRevision: 2, quoteStatus: "accepted_reviewed", quoteRevision: 3,
    termVersion: 1, paymentStatus: "unknown", manuallyAttestedHostRevenue: null, bookedHostRevenueMinor: null}],
  record: {opportunity: {opportunityId: "o1", organizerId: "harbor", stage: "pilot_running", revision: 4, motion: "first_workflow_pilot", ownerUid: "sample-owner",
    nextStep: "Week two check-in", nextStepAt: iso(3)},
  pilotPlan: {organizerId: "harbor", opportunityId: "o1", revision: 2, status: "active", workflowId: "guest-applications", objective: "Fill two quiz nights through Catch",
    successMeasures: ["Forty guests apply", "Host runs check-in on Catch"], startsAt: iso(-7), endsAt: iso(21),
    reviewEvidence: {evidenceId: "e1", sourceRef: "Call with Kavya", contentHash: "sample", observedAt: iso(-2)}, outcomeEvidence: null},
  quote: {organizerId: "harbor", opportunityId: "o1", quoteId: "q1", revision: 3, termVersion: 1, status: "accepted_reviewed", approvedDecisionId: "d1", acceptedDecisionId: "d2"},
  quoteVersion: {termVersion: 1, terms: quoteTerms, termsHash: "sample"},
  approvedDecision: {decisionId: "d1", evidence: {evidenceId: "e1", sourceRef: "Call with Kavya", contentHash: "sample", observedAt: iso(-2)}},
  acceptedDecision: {decisionId: "d2", evidence: {evidenceId: "e2", sourceRef: "Signed terms from Kavya", contentHash: "sample", observedAt: iso(-1)}},
  settlementAttestation: null, history: [{fromStage: "demo_done", toStage: "pilot_running", reason: null, changedAt: iso(-7)}], historyTruncated: false,
  paymentStatus: "unknown", bookedHostRevenueMinor: null}};

export const SalesHostCommercialStory: Story = {
  name: "Hosts · a deal's pilot, quote and payment",
  beforeEach: pinClock,
  parameters: {catchComponent: {id: "workspace_sales_host_commercial", states: ["pilot", "quote", "payment-unknown", "stage-history", "every-deal"]}},
  render: () => <SalesHostCommercialWorkspace model={commercialModel} deals={harbor.opportunities} evidence={dealEvidence} hasMoreEvidence={false} moreEvidence={noop} isAdminOwner />,
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
        waitingSince: iso(-0.2), doneAt: null, assigneeUid: null, snoozedUntil: null, recommendation: null, listingEvent: null},
      journey: [{stepId: "submitted", occurredAt: iso(-0.2), title: "You sent a link on WhatsApp", detail: "instagram.com/sundaytable", actorUid: "riya", tone: "ink"},
        {stepId: "failed-1", occurredAt: iso(-0.19), title: "Could not read the page", detail: "Instagram showed a sign-in wall", actorUid: null, tone: "danger"}],
      canWork: false, canDecideClaim: false}}} />
  ),
};
