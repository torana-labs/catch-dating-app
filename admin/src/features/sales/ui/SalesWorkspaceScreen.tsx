import {CatchText, CatchField} from "@catch/web-ui";
import {renderSalesPartnerOffer} from "./salesPartnerOffer";
import {useEffect, useMemo, useState} from "react";
import {ArrowLeft, CalendarDays, ClipboardList, Search} from "lucide-react";
import {
  AdminButton, AdminDetailScreenStack, AdminDirectoryScreenStack,
  AdminForm, AdminTableRow, AdminTag, AdminToolbar, DataTable, EmptyState,
  PageHeader, Panel, SearchField, SegmentedControl, selectOptions, StateRow,
  TableActionButton,
} from "../../../shared/ui/AdminPrimitives";
import {useAdminOperationPending} from "../../../shared/pendingOperation";
import {renderSalesPrivacyWorkspace} from "./SalesPrivacyWorkspace";
import {useAdminFeedback} from "../../../shared/feedback/AdminFeedbackContext";
import {dataMode} from "../../../shared/api/dataMode";
import {
  accountFormValues, researchStatusOptions, toLocalDateTimeInput,
  type SalesWorkspaceController,
  useSalesWorkspaceController,
} from "../controllers/useSalesWorkspaceController";
import type {
  SalesAccountDetail, SalesCustomFieldDefinition,
  SalesInboundIntent, SalesOpportunity,
  SalesResearchStatus, SalesTask,
} from "../api/salesTypes";
import {SalesRecordsWorkspace} from "./SalesRecordsPanels";
import {renderSalesSettingsWorkspace} from "./SalesSettingsPanel";
import {SalesDemoWorkspace} from "./SalesDemoPanel";
import {SalesIntelligenceWorkspace} from "./SalesIntelligenceWorkspace";
import {renderSalesCommercialWorkspace} from "./SalesCommercialWorkspace";
import {renderSalesFitQueueWorkspace} from "./SalesFitQueueWorkspace";

import {renderSalesImportedHistory} from "./SalesImportedHistoryPanel";
import {renderSalesFunnelWorkspace} from "./SalesFunnelWorkspace";

type SalesArea = "today" | "hosts" | "pipeline" | "research" | "pilots" | "settings";
type DetailTab = "overview" | "people" | "workflow" | "activity" |
  "opportunities" | "research" | "demo" | "commercial" | "intelligence";

const areaOptions: Array<{id: SalesArea; label: string}> = [
  {id: "today", label: "Today"},
  {id: "hosts", label: "Hosts"},
  {id: "pipeline", label: "Pipeline"},
  {id: "research", label: "Research"},
  {id: "pilots", label: "Pilots"},
  {id: "settings", label: "Settings"},
];
const staffAreaOptions = areaOptions.filter((option) =>
  option.id === "today" || option.id === "hosts" || option.id === "pipeline");
const detailTabs: Array<{id: DetailTab; label: string}> = [
  {id: "overview", label: "Overview"},
  {id: "people", label: "People"},
  {id: "workflow", label: "Workflow"},
  {id: "demo", label: "Private demo"},
  {id: "activity", label: "Activity"},
  {id: "opportunities", label: "Opportunities"},
  {id: "intelligence", label: "Fit & outreach"},
  {id: "commercial", label: "Pilot & terms"},
  {id: "research", label: "Research"},
];
const stageOptions = [
  {value: "", label: "All stages"},
  {value: "new_enquiry", label: "New enquiry"},
  {value: "ready_to_contact", label: "Ready to contact"},
  {value: "contacted", label: "Contacted"},
  {value: "in_conversation", label: "In conversation"},
  {value: "demo_arranged", label: "Demo arranged"},
  {value: "demo_completed", label: "Demo completed"},
  {value: "pilot_agreed", label: "Pilot agreed"},
  {value: "pilot_running", label: "Pilot running"},
  {value: "commercial_discussion", label: "Commercial discussion"},
  {value: "closed_won", label: "Closed won"},
  {value: "closed_lost", label: "Closed lost"},
];

function labelFor(value: string | null | undefined): string {
  if (!value) return "Not recorded";
  return value.replaceAll("_", " ").replace(/\b\w/gu, (letter) =>
    letter.toUpperCase());
}

function dateLabel(value: string | null | undefined): string {
  if (!value) return "No date";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value :
    date.toLocaleDateString(undefined, {day: "numeric", month: "short", year: "numeric"});
}

function ownerLabel(uid: string | null | undefined, currentUserUid: string): string {
  if (!uid) return "Unassigned";
  return uid === currentUserUid ? "You" : "Another teammate";
}

export function SalesWorkspaceScreen({
  area,
  currentUserUid,
  isAdminOwner = false,
  assignedStaffOnly = false,
  selectedOrganizerId,
  onAreaChange,
  onOpenHost,
  onBackToHosts,
  onOpenIntake,
  onOpenOrganizer,
}: {
  area: SalesArea;
  currentUserUid: string;
  isAdminOwner?: boolean;
  assignedStaffOnly?: boolean;
  selectedOrganizerId: string | null;
  onAreaChange: (area: SalesArea) => void;
  onOpenHost: (organizerId: string) => void;
  onBackToHosts: () => void;
  onOpenIntake: () => void;
  onOpenOrganizer: (organizerId: string) => void;
}) {
  const {setError, setNotice} = useAdminFeedback();
  const operationPending = useAdminOperationPending();
  const [showPrivacy, setShowPrivacy] = useState(false);
  useEffect(() => setShowPrivacy(false), [selectedOrganizerId, currentUserUid]);
  const controller = useSalesWorkspaceController({
    area, selectedOrganizerId, assignedStaffOnly,
    onError: setError, onNotice: setNotice,
  });
  const staffAreaAllowed = area === "today" || area === "hosts" ||
    area === "pipeline";
  const pageTitle = selectedOrganizerId ?
    controller.detail.data?.organizerSummary.name ?? "Host" :
    assignedStaffOnly && !staffAreaAllowed ? "Assigned Sales" :
      areaOptions.find((option) => option.id === area)?.label ?? "Sales";

  return (
    <AdminDirectoryScreenStack>
      <PageHeader eyebrow="Sales" title={pageTitle} actions={selectedOrganizerId ? (
        <AdminButton icon={<ArrowLeft size={16} />} onClick={onBackToHosts}>
          Back to hosts
        </AdminButton>
      ) : undefined}>
        {selectedOrganizerId ? "Private host workspace" : assignedStaffOnly ?
          "Work only on Sales records currently assigned to you." :
          "Keep research, conversations, tasks and opportunities together."}
        {dataMode() === "sample" ? " Sample data is shown." : ""}
      </PageHeader>
      {!selectedOrganizerId && (!assignedStaffOnly || staffAreaAllowed) ? (
        <SegmentedControl ariaLabel="Sales area" mobileLayout="content"
          mobileSelectLabel="Sales area"
          options={assignedStaffOnly ? staffAreaOptions : areaOptions}
          value={area} onChange={onAreaChange} />
      ) : null}
      {selectedOrganizerId ? (
        <>
          {isAdminOwner ? <AdminToolbar>
            <AdminButton disabled={operationPending}
              onClick={() => setShowPrivacy((value) => !value)}>
              {showPrivacy ? "Back to host details" : "Privacy controls"}
            </AdminButton>
          </AdminToolbar> : null}
          {showPrivacy && isAdminOwner ? renderSalesPrivacyWorkspace({
            actorUid: currentUserUid, isAdminOwner,
            organizerId: selectedOrganizerId,
            organizerName: controller.detail.data?.organizerSummary.name,
          }) : <HostDetail key={`${currentUserUid}:${selectedOrganizerId}:${assignedStaffOnly}`}
            controller={controller} currentUserUid={currentUserUid}
            isAdminOwner={isAdminOwner} assignedStaffOnly={assignedStaffOnly}
            onOpenOrganizer={onOpenOrganizer} />}
        </>
      ) : assignedStaffOnly && !staffAreaAllowed ? (
        <Panel title="Assigned Sales access" icon={<ClipboardList size={18} />}>
          <CatchText as="p" variant="supporting">Your role can use Today, Hosts and Pipeline for records currently
            assigned to you.</CatchText>
          <AdminButton onClick={() => onAreaChange("today")}>Go to Today</AdminButton>
        </Panel>
      ) : area === "today" ? (
        <TodayView controller={controller} currentUserUid={currentUserUid}
          onOpenHost={onOpenHost} />
      ) : area === "hosts" ? (
        <HostsView controller={controller} currentUserUid={currentUserUid}
          assignedStaffOnly={assignedStaffOnly} onOpenHost={onOpenHost}
          onOpenIntake={onOpenIntake} />
      ) : area === "pipeline" ? (
        <>{assignedStaffOnly ? null : renderSalesFunnelWorkspace(currentUserUid)}
          <PipelineView controller={controller} currentUserUid={currentUserUid}
            onOpenHost={onOpenHost} /></>
      ) : area === "research" ? (
        <ResearchView controller={controller} onOpenHost={onOpenHost}
          onOpenIntake={onOpenIntake} />
      ) : area === "pilots" ? (
        <PilotsView controller={controller} onOpenHost={onOpenHost} />
      ) : (
        <>{renderSalesSettingsWorkspace(controller, isAdminOwner)}
          {renderSalesPrivacyWorkspace({actorUid: currentUserUid, isAdminOwner})}
        </>
      )}
    </AdminDirectoryScreenStack>
  );
}

function QueryState({
  loading, error, empty, onRetry,
}: {loading: boolean; error: unknown; empty: boolean; onRetry: () => void}) {
  if (loading) return <EmptyState>Loading sales records…</EmptyState>;
  if (error) return <EmptyState>
    Sales records could not be loaded. <AdminButton onClick={onRetry}>Try again</AdminButton>
  </EmptyState>;
  if (empty) return <EmptyState>No records match this view.</EmptyState>;
  return null;
}

function TodayView({
  controller, currentUserUid, onOpenHost,
}: {controller: SalesWorkspaceController; currentUserUid: string;
  onOpenHost: (id: string) => void}) {
  const rows = controller.tasks.data?.rows ?? [];
  const now = Date.now();
  const groups = [
    {title: "Needs a reply", icon: <ClipboardList size={18} />,
      matches: (task: SalesTask) => /reply|inbound/iu.test(task.kind)},
    {title: "Follow-ups due", icon: <CalendarDays size={18} />,
      matches: (task: SalesTask) => !/reply|inbound|draft|pilot|research/iu.test(task.kind) &&
        Boolean(task.dueAt) && new Date(task.dueAt!).getTime() <= now},
    {title: "Ready to review", icon: <ClipboardList size={18} />,
      matches: (task: SalesTask) => /draft|review/iu.test(task.kind)},
    {title: "Pilots need attention", icon: <CalendarDays size={18} />,
      matches: (task: SalesTask) => /pilot/iu.test(task.kind)},
    {title: "Research blockers", icon: <Search size={18} />,
      matches: (task: SalesTask) => /research|duplicate/iu.test(task.kind)},
    {title: "Coming up", icon: <ClipboardList size={18} />,
      matches: (task: SalesTask) => !/reply|inbound|draft|review|pilot|research|duplicate/iu
        .test(task.kind) && Boolean(task.dueAt) &&
        new Date(task.dueAt!).getTime() > now},
    {title: "Needs a date", icon: <CalendarDays size={18} />,
      matches: (task: SalesTask) => !task.dueAt &&
        !/reply|inbound|draft|review|pilot|research|duplicate/iu.test(task.kind)},
  ];
  return <>
    <Panel title="Today's work" icon={<CalendarDays size={18} />}>
      <CatchText as="p" variant="supporting">Tasks are shown in priority groups from this server page. Open a host to
        record the outcome and set the next step.</CatchText>
      <QueryState loading={controller.tasks.isPending} error={controller.tasks.error}
        empty={!rows.length} onRetry={() => void controller.tasks.refetch()} />
    </Panel>
    {groups.map((group) => {
      const members = rows.filter(group.matches);
      return <Panel key={group.title} title={group.title} icon={group.icon}>
        {members.length ? members.map((task) => <TaskRow key={task.taskId}
          task={task} currentUserUid={currentUserUid}
          onOpenHost={onOpenHost} />) :
          <EmptyState>Nothing in this group on this page.</EmptyState>}
      </Panel>;
    })}
    <Pagination hasPrevious={controller.hasPreviousTaskPage}
      hasNext={Boolean(controller.tasks.data?.nextCursor)}
      onPrevious={controller.previousTaskPage} onNext={controller.nextTaskPage} />
  </>;
}

function TaskRow({task, currentUserUid, onOpenHost}: {
  task: SalesTask; currentUserUid: string; onOpenHost: (id: string) => void;
}) {
  return <StateRow label={task.title} value={<>
    {labelFor(task.kind)} · {dateLabel(task.dueAt)} · Owner {ownerLabel(
      task.ownerUid, currentUserUid)}
    {task.reason ? <> · {task.reason}</> : null}{" "}
    <AdminButton onClick={() => onOpenHost(task.organizerId)}>Open host</AdminButton>
  </>} />;
}

function HostsView({controller, currentUserUid, assignedStaffOnly, onOpenHost,
  onOpenIntake}: {
  controller: SalesWorkspaceController;
  currentUserUid: string;
  assignedStaffOnly: boolean;
  onOpenHost: (id: string) => void;
  onOpenIntake: () => void;
}) {
  const [showAddHost, setShowAddHost] = useState(false);
  const [selectedCanonicalId, setSelectedCanonicalId] = useState("");
  const rows = controller.accounts.data?.rows ?? [];
  return <>
  {assignedStaffOnly ? null : renderSalesFitQueueWorkspace(currentUserUid, onOpenHost)}
  {!assignedStaffOnly && showAddHost ? <Panel title="Add a host" icon={<Search size={18} />}>
    <CatchText as="p" variant="supporting">First find the existing organizer identity. Adding it to Sales creates a
      private record and does not publish a listing or approve a claim.</CatchText>
    <SearchField ariaLabel="Search existing organizers" icon={<Search size={16} />}
      value={controller.canonicalSearch} placeholder="Organizer name"
      onChange={(value) => {
        controller.setCanonicalSearch(value); setSelectedCanonicalId("");
      }} />
    {controller.canonicalMatches.isPending ? <CatchText as="p" variant="supporting">Searching organizers…</CatchText> : null}
    {controller.canonicalMatches.error ? <CatchText as="p" variant="supporting" role="alert">
      Organizer search failed. Try again.</CatchText> : null}
    {controller.canonicalMatches.data?.length ? <CatchField recipe="select"
      title="Reviewed organizer" value={selectedCanonicalId}
      onChanged={(value) => setSelectedCanonicalId(value ?? "")} {...selectOptions([
        {value: "", label: "Choose a matching organizer"},
        ...controller.canonicalMatches.data.map((item) => ({
          value: item.clubId,
          label: `${item.name} · ${item.cityName || "Location unknown"} · ${labelFor(item.publishStatus)}`,
        })),
      ])} /> : null}
    <AdminToolbar>
      <AdminButton variant="primary" disabled={!selectedCanonicalId || controller.isSaving}
        onClick={() => void controller.addAccount({
          organizerId: selectedCanonicalId,
        }).then((saved) => {
          if (saved) onOpenHost(selectedCanonicalId);
        })}>Add selected host to Sales</AdminButton>
      <AdminButton onClick={onOpenIntake}>Review a new organizer in Intake</AdminButton>
      <AdminButton onClick={() => setShowAddHost(false)}>Cancel</AdminButton>
    </AdminToolbar>
  </Panel> : null}
  <Panel title={assignedStaffOnly ? "Assigned hosts" : "Hosts"}
    icon={<ClipboardList size={18} />} action={assignedStaffOnly ? undefined :
    <AdminButton onClick={() => setShowAddHost(true)}>Add host</AdminButton>
  }>
    <AdminToolbar>
      <SearchField ariaLabel="Search a name, city, or market word"
        icon={<Search size={16} />}
        placeholder="One word, at least two letters" value={controller.query}
        onChange={(query) => controller.setAccountFilters({query})} />
      {!controller.validAccountQuery ? <CatchText as="p" variant="supporting" role="status">
        Search one word of 2–80 letters or numbers.</CatchText> : null}
      <CatchField recipe="select" title="Research status" value={controller.researchStatus}
        onChanged={(value) => controller.setAccountFilters({
          researchStatus: (value ?? "") as "all" | SalesResearchStatus,
        })} {...selectOptions([{value: "all", label: "All research statuses"},
          ...researchStatusOptions])} />
      {assignedStaffOnly ? null : <CatchField recipe="select" title="Owner"
        value={controller.ownerUid ? "mine" : "all"}
        onChanged={(value) => controller.setAccountFilters({
          ownerUid: (value ?? "") === "mine" ? currentUserUid : "",
        })} {...selectOptions([{value: "all", label: "All owners"},
          {value: "mine", label: "Assigned to me"}])} />}
    </AdminToolbar>
    <QueryState loading={controller.accounts.isPending} error={controller.accounts.error}
      empty={!rows.length} onRetry={() => void controller.accounts.refetch()} />
    {rows.length ? <DataTable ariaLabel="Sales hosts">
      <thead><tr>
        <th>Host</th><th>Market</th><th>Events</th><th>Fit</th>
        <th>Research</th><th>Stage</th><th>Owner</th><th>Next step</th><th />
      </tr></thead><tbody>
        {rows.map((row) => <AdminTableRow key={row.organizerId}>
          <td><strong>{row.name}</strong></td>
          <td>{[row.city, row.marketLabel].filter(Boolean).join(", ") || "Not recorded"}</td>
          <td>{row.eventTypes?.join(", ") || "Not recorded"}</td>
          <td>{row.fitLabel || "Needs review"}</td>
          <td>{labelFor(row.researchStatus)}</td>
          <td>{labelFor(row.stage)}</td>
          <td>{ownerLabel(row.assignedOwnerUid, currentUserUid)}</td>
          <td>{row.nextAction || "Not set"}</td>
          <td><TableActionButton onClick={() => onOpenHost(row.organizerId)}>
            Open
          </TableActionButton></td>
        </AdminTableRow>)}
      </tbody>
    </DataTable> : null}
    <Pagination hasPrevious={controller.hasPreviousPage}
      hasNext={Boolean(controller.accounts.data?.nextCursor)}
      onPrevious={controller.previousPage} onNext={controller.nextPage} />
  </Panel>
  </>;
}

function Pagination({hasPrevious, hasNext, onPrevious, onNext}: {
  hasPrevious: boolean; hasNext: boolean;
  onPrevious: () => void; onNext: () => void;
}) {
  return <AdminToolbar>
    <AdminButton disabled={!hasPrevious} onClick={onPrevious}>Previous page</AdminButton>
    <AdminButton disabled={!hasNext} onClick={onNext}>Next page</AdminButton>
  </AdminToolbar>;
}

function PipelineView({controller, currentUserUid, onOpenHost}: {
  controller: SalesWorkspaceController; currentUserUid: string;
  onOpenHost: (id: string) => void;
}) {
  const rows = controller.opportunities.data?.rows ?? [];
  return <Panel title="Opportunities" icon={<ClipboardList size={18} />}>
    <CatchText as="p" variant="supporting">Stages describe commercial work. Organizer ownership and product activation are managed separately.</CatchText>
    <CatchField recipe="select" title="Stage" value={controller.opportunityStage}
      onChanged={(value) => controller.setStageFilter(value ?? "")} {...selectOptions(stageOptions)}
    />
    <QueryState loading={controller.opportunities.isPending}
      error={controller.opportunities.error} empty={!rows.length}
      onRetry={() => void controller.opportunities.refetch()} />
    {rows.length ? <DataTable ariaLabel="Sales opportunities">
      <thead><tr><th>Motion</th><th>Stage</th><th>Owner</th>
        <th>Next step</th><th>Due</th><th /></tr></thead>
      <tbody>{rows.map((row) => <AdminTableRow key={row.opportunityId}>
        <td>{labelFor(row.motion)}</td><td>{labelFor(row.stage)}</td>
        <td>{ownerLabel(row.ownerUid, currentUserUid)}</td>
        <td>{row.nextStep || "Not set"}</td>
        <td>{dateLabel(row.nextStepAt)}</td>
        <td><TableActionButton onClick={() => onOpenHost(row.organizerId)}>
          Open host
        </TableActionButton></td>
      </AdminTableRow>)}</tbody>
    </DataTable> : null}
    <Pagination hasPrevious={controller.hasPreviousOpportunityPage}
      hasNext={Boolean(controller.opportunities.data?.nextCursor)}
      onPrevious={controller.previousOpportunityPage}
      onNext={controller.nextOpportunityPage} />
  </Panel>;
}

function ResearchView({controller, onOpenHost, onOpenIntake}: {
  controller: SalesWorkspaceController; onOpenHost: (id: string) => void;
  onOpenIntake: () => void;
}) {
  return <>
    <InboundReview controller={controller} onOpenIntake={onOpenIntake} />
    <Panel title="Research review" icon={<Search size={18} />}>
      <CatchText as="p" variant="supporting">Use the host record to capture a sourced summary, owner and next action.
        Qualification and fit remain separate decisions.</CatchText>
      <CatchField recipe="select" title="Research status" value={controller.researchStatus}
        onChanged={(value) => controller.setAccountFilters({
          researchStatus: (value ?? "") as "all" | SalesResearchStatus,
        })} {...selectOptions([{value: "all", label: "All"}, ...researchStatusOptions])} />
      <QueryState loading={controller.accounts.isPending} error={controller.accounts.error}
        empty={!controller.accounts.data?.rows.length}
        onRetry={() => void controller.accounts.refetch()} />
      {controller.accounts.data?.rows.map((row) => <StateRow
        key={row.organizerId} label={row.name} value={<>
          {labelFor(row.researchStatus)} · {row.fitLabel || "Fit not assessed"}{" "}
          <AdminButton onClick={() => onOpenHost(row.organizerId)}>Review</AdminButton>
        </>} />)}
      <Pagination hasPrevious={controller.hasPreviousPage}
        hasNext={Boolean(controller.accounts.data?.nextCursor)}
        onPrevious={controller.previousPage} onNext={controller.nextPage} />
    </Panel>
  </>;
}

function InboundReview({controller, onOpenIntake}: {
  controller: SalesWorkspaceController; onOpenIntake: () => void;
}) {
  const [selectedId, setSelectedId] = useState("");
  const [matchId, setMatchId] = useState("");
  const selected = controller.inboundIntents.data?.rows.find((row) =>
    row.intentId === selectedId);
  const matches = controller.identityMatches.data?.rows ?? [];
  const select = (intent: SalesInboundIntent) => {
    setSelectedId(intent.intentId);
    setMatchId("");
    const searchName = typeof intent.hostApplication?.organizationName === "string" ?
      intent.hostApplication.organizationName : intent.fullName;
    const firstWord = searchName.trim().match(/[A-Za-z0-9]{2,80}/u)?.[0] ?? "";
    controller.setIdentitySearch(firstWord);
  };
  const link = async () => {
    if (!selected || !matchId) return;
    const linked = await controller.linkInboundIntent({
      intentId: selected.intentId, organizerId: matchId,
      expectedRevision: selected.revision,
    });
    if (linked) {setSelectedId(""); setMatchId("");
      controller.setIdentitySearch("");}
  };
  return <Panel title="New enquiries and nominations" icon={<Search size={18} />}>
    <CatchText as="p" variant="supporting">These details were entered by the sender. Review the identity before attaching
      an enquiry to a host; linking does not approve an organizer claim.</CatchText>
    <QueryState loading={controller.inboundIntents.isPending}
      error={controller.inboundIntents.error}
      empty={!controller.inboundIntents.data?.rows.length}
      onRetry={() => void controller.inboundIntents.refetch()} />
    {controller.inboundIntents.data?.rows.map((intent) =>
      <StateRow key={intent.intentId} label={typeof intent.hostApplication?.organizationName === "string" ?
        intent.hostApplication.organizationName : intent.fullName} value={<>
        {intent.city || "City not supplied"} · {dateLabel(intent.createdAt)} ·
        {intent.source === "partner" ? "Partner nomination" : "Website enquiry"} · Self reported{" "}
        <AdminButton onClick={() => select(intent)}>Review match</AdminButton>
      </>} />)}
    <Pagination hasPrevious={controller.hasPreviousInboundPage}
      hasNext={Boolean(controller.inboundIntents.data?.nextCursor)}
      onPrevious={controller.previousInboundPage}
      onNext={controller.nextInboundPage} />
    {selected ? <AdminForm onSubmit={(event) => {event.preventDefault(); void link();}}>
      <CatchText as="h3" variant="sectionTitle">Match enquiry from {selected.fullName}</CatchText>
      <SearchField ariaLabel="Search existing hosts for this enquiry"
        icon={<Search size={16} />} placeholder="One name, city, or market word"
        value={controller.identitySearch}
        onChange={(value) => {controller.setIdentitySearch(value); setMatchId("");}} />
      <CatchField recipe="select" title="Existing host" value={matchId}
        onChanged={(value) => setMatchId(value ?? "")}
        {...selectOptions([{value: "", label: "Choose a reviewed match"},
          ...matches.map((row) => ({value: row.organizerId,
            label: `${row.name} · ${row.city || row.marketLabel || "Location unknown"}`}))])} />
      {controller.identityMatches.isPending ? <CatchText as="p" variant="supporting">Searching hosts…</CatchText> : null}
      {controller.identitySearch.trim() &&
        !/^[A-Za-z0-9]{2,80}$/u.test(controller.identitySearch.trim()) ?
        <CatchText as="p" variant="supporting" role="status">Search one word of 2–80 letters or numbers.</CatchText> : null}
      {controller.identityMatches.error ? <CatchText as="p" variant="supporting" role="alert">
        Host search failed. Try another search.</CatchText> : null}
      {controller.identityMatches.data?.nextCursor ? <CatchText as="p" variant="supporting">
        More matches exist. Narrow the search before linking.</CatchText> : null}
      <AdminToolbar>
        <AdminButton type="submit" variant="primary"
          disabled={!matchId || controller.isSaving}>Link to selected host</AdminButton>
        <AdminButton onClick={onOpenIntake}>Review as a new host</AdminButton>
        <AdminButton onClick={() => setSelectedId("")}>Cancel</AdminButton>
      </AdminToolbar>
    </AdminForm> : null}
  </Panel>;
}

function PilotsView({controller, onOpenHost}: {
  controller: SalesWorkspaceController; onOpenHost: (id: string) => void;
}) {
  return <Panel title="Pilots" icon={<ClipboardList size={18} />}>
    <CatchText as="p" variant="supporting">Select a pilot stage to see its opportunities and next commitments. Pilot outcomes
      require linked evidence before a commercial or reference claim is made.</CatchText>
    <CatchField recipe="select" title="Pilot stage" value={controller.opportunityStage}
      onChanged={(value) => controller.setStageFilter(value ?? "")} {...selectOptions([
        {value: "", label: "All opportunities"},
        {value: "pilot_agreed", label: "Pilot agreed"},
        {value: "pilot_running", label: "Pilot running"},
      ])} />
    <QueryState loading={controller.opportunities.isPending}
      error={controller.opportunities.error}
      empty={!controller.opportunities.data?.rows.length}
      onRetry={() => void controller.opportunities.refetch()} />
    {controller.opportunities.data?.rows.map((item) =>
      <StateRow key={item.opportunityId} label={labelFor(item.stage)} value={<>
        {item.nextStep || "No next step"} · {dateLabel(item.nextStepAt)}{" "}
        <AdminButton onClick={() => onOpenHost(item.organizerId)}>Open host</AdminButton>
      </>} />)}
    <Pagination hasPrevious={controller.hasPreviousOpportunityPage}
      hasNext={Boolean(controller.opportunities.data?.nextCursor)}
      onPrevious={controller.previousOpportunityPage}
      onNext={controller.nextOpportunityPage} />
  </Panel>;
}

function HostDetail({controller, currentUserUid, isAdminOwner, assignedStaffOnly,
  onOpenOrganizer}: {
  controller: SalesWorkspaceController; currentUserUid: string;
  isAdminOwner: boolean;
  assignedStaffOnly: boolean;
  onOpenOrganizer: (id: string) => void;
}) {
  const [tab, setTab] = useState<DetailTab>("overview");
  const detail = controller.detail.data;
  if (controller.detail.isPending) return <EmptyState>Loading host…</EmptyState>;
  if (controller.detail.error || !detail) return <EmptyState>
    Host details could not be loaded.
    <AdminButton onClick={() => void controller.detail.refetch()}>Try again</AdminButton>
  </EmptyState>;
  const availableDetailTabs = assignedStaffOnly ? detailTabs.filter((item) =>
    item.id !== "demo" && item.id !== "commercial") : detailTabs;
  const visibleTab = assignedStaffOnly && (tab === "demo" || tab === "commercial") ?
    "overview" : tab;
  return <AdminDetailScreenStack>
    <AdminToolbar>
      <AdminTag tone="neutral">Research: {labelFor(detail.account.researchStatus)}</AdminTag>
      <AdminTag tone="neutral">Listing: {labelFor(detail.organizerSummary.appVisibility)}</AdminTag>
      <AdminTag tone="neutral">Claim: {labelFor(detail.organizerSummary.claimStatus)}</AdminTag>
      {assignedStaffOnly ? null : <AdminButton
        onClick={() => onOpenOrganizer(detail.account.organizerId)}>
        Open organizer record
      </AdminButton>}
    </AdminToolbar>
    <SegmentedControl ariaLabel="Host detail tab" mobileLayout="content"
      mobileSelectLabel="Host detail section" options={availableDetailTabs}
      value={visibleTab} onChange={setTab} />
    {visibleTab === "overview" || visibleTab === "research" ?
      <HostAccountEditor key={detail.account.organizerId} detail={detail}
        controller={controller} currentUserUid={currentUserUid}
        assignedStaffOnly={assignedStaffOnly} /> : null}
    {visibleTab === "activity" ? <>
      <HostActivity detail={detail} controller={controller} />
      {assignedStaffOnly ? null : renderSalesImportedHistory(
        detail.account.organizerId, currentUserUid)}
    </> : null}
    {visibleTab === "opportunities" ? <HostOpportunities detail={detail}
      controller={controller} currentUserUid={currentUserUid} /> : null}
    {visibleTab === "intelligence" ? <SalesIntelligenceWorkspace
      organizerId={detail.account.organizerId}
      organizerName={detail.organizerSummary.name}
      currentUserUid={currentUserUid} isAdminOwner={isAdminOwner} /> : null}
    {visibleTab === "commercial" && !assignedStaffOnly ? renderSalesCommercialWorkspace(detail,
      controller.evidence.data?.rows ?? [], isAdminOwner) : null}
    {visibleTab === "people" ? <SalesRecordsWorkspace section="people" detail={detail}
      controller={controller} assignedStaffOnly={assignedStaffOnly} /> : null}
    {visibleTab === "demo" && !assignedStaffOnly ? <SalesDemoWorkspace
      key={`${currentUserUid}:${detail.account.organizerId}:${isAdminOwner}`}
      organizerId={detail.account.organizerId}
      organizerName={detail.organizerSummary.name}
      isAdminOwner={isAdminOwner} currentUserUid={currentUserUid} /> : null}
    {visibleTab === "workflow" ? <SalesRecordsWorkspace section="draft" detail={detail}
      controller={controller} /> : null}
    {visibleTab === "research" ? <SalesRecordsWorkspace section="evidence" detail={detail}
      controller={controller} assignedStaffOnly={assignedStaffOnly} /> : null}
    {!assignedStaffOnly && (visibleTab === "overview" || visibleTab === "research") ?
      <SalesRecordsWorkspace
      section="suppression" detail={detail} controller={controller} /> : null}
    {!assignedStaffOnly && (visibleTab === "overview" || visibleTab === "research") ?
      <HostCustomFields
      detail={detail} controller={controller} /> : null}
    {!assignedStaffOnly && visibleTab === "overview" ? renderSalesPartnerOffer(
      currentUserUid, detail.account.organizerId, detail.organizerSummary.name) : null}
    <SalesRecordsWorkspace section="tasks" detail={detail} controller={controller}
      currentUserUid={currentUserUid} assignedStaffOnly={assignedStaffOnly} />
  </AdminDetailScreenStack>;
}

function HostCustomFields({detail, controller}: {
  detail: SalesAccountDetail; controller: SalesWorkspaceController;
}) {
  const fields = controller.customFields.data?.rows ?? [];
  return <Panel title="Additional host information" icon={<ClipboardList size={18} />}>
    <QueryState loading={controller.customFields.isPending}
      error={controller.customFields.error} empty={!fields.length}
      onRetry={() => void controller.customFields.refetch()} />
    {fields.map((field) => <CustomFieldValueEditor key={field.fieldId}
      field={field} detail={detail} controller={controller} />)}
  </Panel>;
}

function CustomFieldValueEditor({field, detail, controller}: {
  field: SalesCustomFieldDefinition; detail: SalesAccountDetail;
  controller: SalesWorkspaceController;
}) {
  const current = detail.customValues?.find((value) => value.fieldId === field.fieldId);
  const [textValue, setTextValue] = useState(() => String(current?.value ?? ""));
  const [dirty, setDirty] = useState(false);
  const [baseRevision, setBaseRevision] = useState(current?.revision ?? 0);
  useEffect(() => {
    if (dirty) return;
    setTextValue(String(current?.value ?? ""));
    setBaseRevision(current?.revision ?? 0);
  }, [current?.revision, current?.value, dirty]);
  const changedElsewhere = (current?.revision ?? 0) !== baseRevision;
  const validNumber = field.type !== "number" ||
    (textValue.trim() !== "" && Number.isFinite(Number(textValue)));
  const save = async () => {
    if (!textValue.trim() || !validNumber || changedElsewhere) return;
    const value = field.type === "number" ? Number(textValue) :
      field.type === "boolean" ? textValue === "true" : textValue.trim();
    const saved = await controller.saveCustomValue({
      organizerId: detail.account.organizerId, fieldId: field.fieldId,
      expectedRevision: baseRevision, value,
    });
    if (saved) setDirty(false);
  };
  const update = (value: string) => {setTextValue(value); setDirty(true);};
  return <AdminForm onSubmit={(event) => {event.preventDefault(); void save();}}>
    {field.type === "enum" ? <CatchField recipe="select" title={field.label} value={textValue}
      onChanged={(value) => update(value ?? "")} {...selectOptions([{value: "", label: "Choose"},
        ...(field.enumOptions ?? []).map((option) => ({
          value: option, label: option,
        }))])} /> : field.type === "boolean" ?
      <CatchField recipe="select" title={field.label} value={textValue}
        onChanged={(value) => update(value ?? "")}
        {...selectOptions([{value: "", label: "Unknown"}, {value: "true", label: "Yes"},
          {value: "false", label: "No"}])} /> :
      <CatchField recipe="input" title={field.label} value={textValue} onChanged={update}
        keyboardType={field.type === "number" ? "decimal" :
          field.type === "date" ? "date" : "text"} />}
    {field.helpText ? <CatchText as="p" variant="supporting">{field.helpText}</CatchText> : null}
    {!validNumber ? <CatchText as="p" variant="supporting" role="alert">Enter a valid number.</CatchText> : null}
    {changedElsewhere ? <CatchText as="p" variant="supporting" role="alert">This value changed elsewhere.
      Latest saved value: {String(current?.value ?? "Unknown")}.</CatchText> : null}
    <AdminButton type="submit" disabled={!dirty || changedElsewhere || !textValue.trim() ||
      !validNumber || controller.isSaving}>Save field</AdminButton>
    {changedElsewhere ? <AdminButton onClick={() => {
      setTextValue(String(current?.value ?? ""));
      setBaseRevision(current?.revision ?? 0);
      setDirty(false);
    }}>Use latest value</AdminButton> : null}
  </AdminForm>;
}

function HostAccountEditor({detail, controller, currentUserUid, assignedStaffOnly}: {
  detail: SalesAccountDetail; controller: SalesWorkspaceController;
  currentUserUid: string;
  assignedStaffOnly: boolean;
}) {
  const [form, setForm] = useState(() => accountFormValues(detail.account));
  const [dirty, setDirty] = useState(false);
  const [baseRevision, setBaseRevision] = useState(detail.account.revision);
  useEffect(() => {
    if (dirty) return;
    setForm(accountFormValues(detail.account));
    setBaseRevision(detail.account.revision);
  }, [detail.account, dirty]);
  const changedElsewhere = detail.account.revision !== baseRevision;
  const save = async () => {
    if (!dirty || changedElsewhere) return;
    const saved = await controller.saveAccount({
      organizerId: detail.account.organizerId,
      expectedRevision: baseRevision,
      patch: assignedStaffOnly ? {
        summary: form.summary.trim() || null,
        nextAction: form.nextAction.trim() || null,
      } : {
        researchStatus: form.researchStatus,
        assignedOwnerUid: form.assignedOwnerUid.trim() || null,
        summary: form.summary.trim() || null,
        nextAction: form.nextAction.trim() || null,
      },
    });
    if (saved) setDirty(false);
  };
  return <Panel title="Host summary" icon={<ClipboardList size={18} />} action={
    <AdminButton disabled={!dirty || changedElsewhere || controller.isSaving}
      variant="primary"
      onClick={() => void save()}>{controller.isSaving ? "Saving…" :
        assignedStaffOnly ? "Save summary" : "Save research"}</AdminButton>
  }>
    <CatchText as="p" variant="supporting">{detail.organizerSummary.name} ·
      {[detail.organizerSummary.city, detail.organizerSummary.marketLabel]
        .filter(Boolean).join(", ") || "Location not recorded"}</CatchText>
    {changedElsewhere ? <CatchText as="p" variant="supporting" role="alert">This host changed since you started editing.
      Compare the latest version below; your edits are retained.</CatchText> : null}
    <AdminForm onSubmit={(event) => {event.preventDefault(); void save();}}>
      {assignedStaffOnly ? null : <CatchField recipe="select" title="Research status"
        value={form.researchStatus} {...selectOptions(researchStatusOptions)}
        onChanged={(value) => {
          setForm((current) => ({...current,
            researchStatus: (value ?? "") as SalesResearchStatus})); setDirty(true);
        }} />}
      {assignedStaffOnly ? null : <StateRow label="Owner" value={ownerLabel(form.assignedOwnerUid,
        currentUserUid)} />}
      {!assignedStaffOnly && form.assignedOwnerUid !== currentUserUid ? <AdminButton
        onClick={() => {setForm((current) => ({...current,
          assignedOwnerUid: currentUserUid})); setDirty(true);}}>
        Assign to me
      </AdminButton> : null}
      <CatchField recipe="input" title="Working summary" maxLines={4} value={form.summary}
        onChanged={(summary) => {
          setForm((current) => ({...current, summary})); setDirty(true);
        }} />
      <CatchField recipe="input" title="Next action" value={form.nextAction}
        onChanged={(nextAction) => {
          setForm((current) => ({...current, nextAction})); setDirty(true);
        }} />
    </AdminForm>
    {changedElsewhere ? <StateRow label="Latest saved version" value={<>
      Summary: {detail.account.summary || "None"}<br />
      Next action: {detail.account.nextAction || "None"}{" "}
      <AdminButton onClick={() => {
        setForm(accountFormValues(detail.account));
        setBaseRevision(detail.account.revision);
        setDirty(false);
      }}>Use latest version</AdminButton>
    </>} /> : null}
  </Panel>;
}

function HostActivity({detail, controller}: {
  detail: SalesAccountDetail; controller: SalesWorkspaceController;
}) {
  const [type, setType] = useState<"note" | "reply" | "call" | "demo" | "pilot" |
    "outreach_sent_manual">("note");
  const [channel, setChannel] = useState<"email" | "whatsapp" | "other">("email");
  const [note, setNote] = useState("");
  const [occurredAt, setOccurredAt] = useState(() =>
    toLocalDateTimeInput(new Date()));
  const save = async () => {
    if (!note.trim() || Number.isNaN(new Date(occurredAt).getTime())) return;
    const saved = await controller.logActivity({
      organizerId: detail.account.organizerId, type,
      occurredAt: new Date(occurredAt).toISOString(), note: note.trim(),
      ...(type === "outreach_sent_manual" ? {
        channel, attestation: "sent_elsewhere_by_actor" as const,
      } : {}),
    });
    if (saved) setNote("");
  };
  return <Panel title="Activity" icon={<ClipboardList size={18} />}>
    <AdminForm onSubmit={(event) => {event.preventDefault(); void save();}}>
      <CatchField recipe="select" title="What happened?" value={type}
        onChanged={(value) => setType((value ?? "") as typeof type)} {...selectOptions([
          {value: "note", label: "Research or conversation note"},
          {value: "call", label: "Call"},
          {value: "reply", label: "Reply received"},
          {value: "demo", label: "Demo"},
          {value: "pilot", label: "Pilot update"},
          {value: "outreach_sent_manual", label: "Sent elsewhere (manual log)"},
        ])} />
      {type === "outreach_sent_manual" ? <>
        <CatchField recipe="select" title="Channel" value={channel}
          onChanged={(value) => setChannel((value ?? "") as typeof channel)} {...selectOptions([
            {value: "email", label: "Email"},
            {value: "whatsapp", label: "WhatsApp"},
            {value: "other", label: "Other"},
          ])} />
        <CatchText as="p" variant="supporting">You attest this was sent outside Catch. Delivery is unconfirmed.</CatchText>
      </> : null}
      <CatchField recipe="input" title="When" value={occurredAt} onChanged={setOccurredAt}
        keyboardType="datetime" />
      <CatchField recipe="input" title="What should the team know?" maxLines={3} value={note}
        onChanged={setNote} />
      <AdminButton type="submit" variant="primary"
        disabled={!note.trim() || controller.isSaving}>Record activity</AdminButton>
    </AdminForm>
    {detail.activities.length ? detail.activities.map((activity) =>
      <StateRow key={activity.activityId} label={labelFor(activity.type)}
        value={<>{dateLabel(activity.occurredAt)} · {activity.note}
          {activity.type === "outreach_sent_manual" ?
            ` · ${activity.channel || "other"} · Actor-attested; delivery unconfirmed` : ""}
        </>} />
    ) : <EmptyState>No activity recorded yet.</EmptyState>}
  </Panel>;
}

function HostOpportunities({detail, controller, currentUserUid}: {
  detail: SalesAccountDetail; controller: SalesWorkspaceController;
  currentUserUid: string;
}) {
  const [selectedId, setSelectedId] = useState("");
  const [selectedRevision, setSelectedRevision] = useState(0);
  const [transitionReason, setTransitionReason] = useState("");
  const selected = useMemo(() => detail.opportunities.find((item) =>
    item.opportunityId === selectedId), [detail.opportunities, selectedId]);
  const [motion, setMotion] = useState("first_workflow_pilot");
  const [stage, setStage] = useState("new_enquiry");
  const [ownerUid, setOwnerUid] = useState(currentUserUid);
  const [nextStep, setNextStep] = useState("");
  const [nextStepAt, setNextStepAt] = useState("");
  const select = (item: SalesOpportunity | null) => {
    setTransitionReason("");
    setSelectedId(item?.opportunityId ?? "");
    setSelectedRevision(item?.revision ?? 0);
    setMotion(item?.motion ?? "first_workflow_pilot");
    setStage(item?.stage ?? "new_enquiry");
    setOwnerUid(item?.ownerUid ?? currentUserUid);
    setNextStep(item?.nextStep ?? "");
    setNextStepAt(item?.nextStepAt ?
      toLocalDateTimeInput(new Date(item.nextStepAt)) : "");
  };
  const save = async () => {
    if (selected && selected.revision !== selectedRevision) return;
    if (!ownerUid.trim() || !nextStep.trim() || !nextStepAt) return;
    const saved = await controller.saveOpportunity({
      organizerId: detail.account.organizerId,
      opportunityId: selected?.opportunityId,
      expectedRevision: selectedRevision,
      ...(transitionReason.trim() ? {transitionReason: transitionReason.trim()} : {}),
      fields: {motion, stage, ownerUid: ownerUid.trim(),
        nextStep: nextStep.trim(), nextStepAt: new Date(nextStepAt).toISOString()},
    });
    if (saved) select(null);
  };
  return <Panel title="Opportunities" icon={<ClipboardList size={18} />}>
    {detail.opportunities.map((item) => <StateRow key={item.opportunityId}
      label={labelFor(item.stage)} value={<>
        {labelFor(item.motion)} · {item.nextStep} ({dateLabel(item.nextStepAt)}){" "}
        <AdminButton onClick={() => select(item)}>Update</AdminButton>
      </>} />)}
    {!detail.opportunities.length ? <EmptyState>No opportunity recorded yet.</EmptyState> : null}
    <AdminForm onSubmit={(event) => {event.preventDefault(); void save();}}>
      <CatchText as="h3" variant="sectionTitle">{selected ? "Update opportunity" : "New opportunity"}</CatchText>
      {selected && selected.revision !== selectedRevision ? <p role="alert">
        This opportunity changed while you were editing. Review the latest stage and
        next step before saving.
        <AdminButton onClick={() => select(selected)}>Use latest version</AdminButton>
      </p> : null}
      <CatchField recipe="select" title="Motion" value={motion}
        onChanged={(value) => setMotion(value ?? "")} {...selectOptions([
        {value: "first_workflow_pilot", label: "First workflow pilot"},
        {value: "listing_claim_assistance", label: "Listing claim assistance"},
        {value: "inbound_stack_review", label: "Inbound stack review"},
        {value: "expansion", label: "Expansion"},
        {value: "renewal", label: "Renewal"},
      ])} />
      <CatchField recipe="select" title="Stage" value={stage}
        onChanged={(value) => setStage(value ?? "")}
        {...selectOptions(stageOptions.filter((item) => item.value &&
          (item.value !== "closed_won" || selected?.stage === "closed_won")))} />
      <StateRow label="Owner" value={ownerLabel(ownerUid, currentUserUid)} />
      {ownerUid !== currentUserUid ? <AdminButton onClick={() =>
        setOwnerUid(currentUserUid)}>Assign to me</AdminButton> : null}
      {stage === "closed_lost" || selected?.stage === "closed_lost" ? (
        <CatchField recipe="input" title="Reason for closing or reopening" value={transitionReason}
          onChanged={setTransitionReason} maxLines={3} />
      ) : null}
      {stage === "closed_won" ? <CatchText as="p" variant="supporting">Payment-backed closing is managed in Pilot &amp; terms.</CatchText> : null}
      <CatchField recipe="input" title="Next step" value={nextStep} onChanged={setNextStep} />
      <CatchField recipe="input" title="Due" value={nextStepAt} onChanged={setNextStepAt}
        keyboardType="datetime" />
      <AdminButton type="submit" variant="primary" disabled={controller.isSaving ||
        (selected && selected.revision !== selectedRevision) ||
        stage === "closed_won" ||
        ((stage === "closed_lost" || selected?.stage === "closed_lost") &&
          !transitionReason.trim()) ||
        !ownerUid.trim() || !nextStep.trim() || !nextStepAt}>
        {selected ? "Save opportunity" : "Add opportunity"}
      </AdminButton>
      {selected ? <AdminButton onClick={() => select(null)}>Cancel editing</AdminButton> : null}
    </AdminForm>
  </Panel>;
}
