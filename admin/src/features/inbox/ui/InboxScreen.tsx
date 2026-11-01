import {
  CatchButton,
  CatchDock,
  CatchEmptyState,
  CatchField,
  CatchIndexRow,
  CatchMetaRow,
  CatchPaneLayout,
  CatchSection,
  CatchTable,
  CatchWorkspaceHeader,
  type CatchMetaEntry,
  type CatchSectionStep,
  type CatchTableColumn,
} from "@catch/web-ui";
import {useMemo, useState} from "react";
import type {InboxItem, InboxItemDetail, InboxScope, InboxType, JourneyStep} from "../api/inboxRepository";
import {inboxTypeLabels, type InboxController} from "../controllers/useInboxController";
import {inboxScopeLabels, inboxTypeLabel, queueNote, waitingLabel, waitingTone} from "../controllers/inboxLabels";

interface Row {
  key: string;
  item: {title: string; subtitle?: string};
  type: {label: string; tone: "neutral"};
  state: {text: string; tone?: "success" | "warning" | "danger"};
  waiting: {text: string; tone?: "warning" | "danger"};
}

const columns: CatchTableColumn<Row>[] = [
  {key: "item", label: "Item", kind: "title"},
  {key: "type", label: "Type", kind: "badge", width: "96px"},
  {key: "state", label: "Where it is", width: "180px"},
  {key: "waiting", label: "Waiting", width: "92px", sort: "asc", align: "end"},
];

const types: InboxType[] = ["listing", "event", "claim", "enquiry", "access", "stuck"];
const toneOf = (tone: InboxItem["state"]["tone"]) =>
  tone === "success" || tone === "warning" || tone === "danger" ? tone : undefined;

/** The inbox list: one header (title, totals, scope, type chips, search) over the oldest-first table. */
function InboxQueue({controller, selectedItemId, onSelect}: {
  controller: InboxScreenModel;
  selectedItemId: string | null;
  onSelect: (itemId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const totals = controller.totals;
  const rows = useMemo<Row[]>(() => controller.items
    .filter((item) => !search.trim() || `${item.title} ${item.subtitle ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()))
    .map((item) => ({
      key: item.itemId,
      item: {title: item.title, ...(item.subtitle ? {subtitle: item.subtitle} : {})},
      type: {label: inboxTypeLabel[item.type], tone: "neutral"},
      state: {text: item.state.label, ...(toneOf(item.state.tone) ? {tone: toneOf(item.state.tone)} : {})},
      waiting: {text: waitingLabel(item.waitingSince), ...(waitingTone(item.waitingSince) ? {tone: waitingTone(item.waitingSince)} : {})},
    })), [controller.items, search]);
  const scopes = (Object.keys(inboxScopeLabels) as Array<keyof typeof inboxScopeLabels>).map((value) => ({
    value, label: inboxScopeLabels[value],
    ...(value !== "done" && totals ? {count: totals.scopes[value]} : {}),
  }));
  return (
    <>
      <CatchWorkspaceHeader
        title="Inbox"
        count={totals?.scopes.waiting}
        note={queueNote(controller.items, controller.oldestWaitingSince)}
        views={{items: scopes, value: controller.scope, label: "Inbox view",
          onChanged: (value) => controller.setScope(value as InboxScope)}}
        filters={{
          chips: [
            {label: "All", count: totals?.types.all, selected: controller.type === null, onPressed: () => controller.setType(null)},
            ...types.filter((type) => (totals?.types[type] ?? 0) > 0 || controller.type === type).map((type) => ({
              label: inboxTypeLabels[type], count: totals?.types[type], selected: controller.type === type,
              onPressed: () => controller.setType(type),
            })),
          ],
          search: {placeholder: `Search ${totals?.types.all ?? ""} items`.replace("  ", " "), value: search, onChanged: setSearch},
        }}
        actions={<>
          {controller.hasPreviousPage ? <CatchButton label="Newer" variant="secondary" size="sm" onPressed={controller.previousPage} /> : null}
          {controller.hasNextPage ? <CatchButton label="Older" variant="secondary" size="sm" onPressed={controller.nextPage} /> : null}
        </>}
      />
      <CatchTable
        columns={columns}
        rows={rows}
        label="Inbox"
        rowKey="key"
        selectedKey={selectedItemId}
        onRowPressed={(row) => onSelect(row.key)}
        density="compact"
      />
    </>
  );
}

const dayMs = 86_400_000;

/** A market slug as a person reads it: "delhi-ncr" is "Delhi Ncr", "mumbai" is "Mumbai". */
const cityLabel = (slug: string) => slug.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");

function facts(item: InboxItem): CatchMetaEntry[] {
  const tone = waitingTone(item.waitingSince);
  const entries: CatchMetaEntry[] = [
    {label: "Type", value: inboxTypeLabel[item.type]},
    {label: "Waiting", value: waitingLabel(item.waitingSince), ...(tone ? {tone} : {})},
    {label: "Came from", value: item.cameFrom},
    {label: "City", value: item.city ? cityLabel(item.city) : "Not set"},
    {label: "Where it is", value: item.state.label,
      ...(item.state.tone === "success" || item.state.tone === "warning" || item.state.tone === "danger" ? {tone: item.state.tone} : {})},
    {label: "Assigned to", value: item.assigneeUid ?? "Nobody yet"},
  ];
  if (item.subtitle) entries.push({label: item.type === "stuck" ? "What went wrong" : "About", value: item.subtitle, wide: true,
    ...(item.type === "stuck" ? {tone: "danger" as const} : {})});
  if (item.recommendation) {
    entries.push({label: item.recommendation.decision === "approve" ? "Recommended approval" : "Recommended rejection",
      value: item.recommendation.note || "No note", wide: true});
  }
  return entries;
}

/** The journey as the timeline draws it: every recorded step, then where it is now. */
function timeline(item: InboxItem, journey: readonly JourneyStep[]): CatchSectionStep[] {
  const steps: CatchSectionStep[] = journey.map((step) => ({
    title: step.title,
    ...(step.detail ? {subtitle: step.detail} : {}),
    meta: new Intl.DateTimeFormat("en-IN", {weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit"})
      .format(new Date(step.occurredAt)),
    state: "done",
    ...(step.tone === "danger" ? {tone: "danger" as const} : step.tone === "warning" ? {tone: "warning" as const} : {}),
  }));
  if (item.status !== "done") {
    steps.push({title: item.status === "snoozed" ? "Snoozed" : "Waiting for a person", subtitle: item.state.label, meta: "Now",
      state: "current", ...(item.state.tone === "danger" ? {tone: "danger" as const} : {tone: "warning" as const})});
  }
  return steps;
}

/**
 * One inbox item beside the queue: what it is, how it got here, and the
 * decision bar. Claims are recommended by ops and decided by the owner;
 * launch access is decided here; listings, events and enquiries open their
 * own review, which this pane links to. Every type can be picked up or
 * snoozed for a day.
 */
function InboxInspector({controller, detail, uid, onClose, onOpenReview}: {
  controller: InboxScreenModel;
  detail: InboxItemDetail;
  uid: string | null;
  onClose: () => void;
  /** Listings, events and enquiries are still decided in the review workspace. */
  onOpenReview: () => void;
}) {
  const {item, journey, canWork, canDecideClaim} = detail;
  const [note, setNote] = useState("");
  const [hostId, setHostId] = useState<string | null>(null);
  const noteText = note.trim();
  const busy = controller.isWorking;
  const position = controller.position;
  const pickUp = uid && item.assigneeUid !== uid ? () => void controller.updateItem({itemId: item.itemId, action: "assign",
    assigneeUid: uid, snoozedUntil: null, note: noteText || null}, "Picked up. It's in Mine.") : null;
  const snooze = () => void controller.updateItem({itemId: item.itemId, action: "snooze", assigneeUid: null,
    snoozedUntil: new Date(Date.now() + dayMs).toISOString(), note: noteText || null}, "Snoozed until tomorrow.");

  let dock = null;
  let picker = null;
  if (canWork) {
    const next = controller.nextItem ? `Then ${controller.nextItem.title}` : "Then the inbox is clear";
    if (item.type === "claim" && canDecideClaim) {
      dock = <CatchDock recipe="pane"
        primary={{label: "Approve claim", isLoading: busy, onPressed: () => void controller.decideClaim({requestId: item.sourceId,
          decision: "approve", decisionReason: noteText || null})}}
        danger={{label: "Reject", onPressed: noteText ? () => void controller.decideClaim({requestId: item.sourceId,
          decision: "reject", decisionReason: noteText}) : null}}
        secondary={{label: "Snooze a day", onPressed: snooze}}
        note={{label: "Note for the record", placeholder: "Why. Required to reject.", value: note, onChanged: setNote}}
        next={next} />;
    } else if (item.type === "claim") {
      dock = <CatchDock recipe="pane"
        primary={{label: "Recommend approval", isLoading: busy, onPressed: noteText ? () => void controller.recommendClaim({
          requestId: item.sourceId, decision: "approve", note: noteText}) : null}}
        danger={{label: "Recommend rejection", onPressed: noteText ? () => void controller.recommendClaim({
          requestId: item.sourceId, decision: "reject", note: noteText}) : null}}
        secondary={{label: "Snooze a day", onPressed: snooze}}
        note={{label: "Note for the owner", placeholder: "What you checked", value: note, onChanged: setNote, required: true}}
        next={`Only the owner approves claims · ${next.toLowerCase()}`} />;
    } else if (item.type === "access") {
      dock = <CatchDock recipe="pane"
        primary={{label: "Approve", isLoading: busy, onPressed: noteText ? () => void controller.decideAccess({
          applicationUid: item.sourceId, decision: "approve", note: noteText}) : null}}
        danger={{label: "Not yet", onPressed: noteText ? () => void controller.decideAccess({
          applicationUid: item.sourceId, decision: "deny", note: noteText}) : null}}
        secondary={{label: "Snooze a day", onPressed: snooze}}
        note={{label: "Note for the record", placeholder: "Why", value: note, onChanged: setNote, required: true}}
        next={next} />;
    } else if (item.type === "enquiry") {
      const chosen = controller.hostMatches.find((match) => match.organizerId === hostId) ?? null;
      picker = <CatchSection title="Which host is it?" dividers="none">
        <CatchField recipe="input" title="Search organizers" value={controller.hostQuery} onChanged={controller.setHostQuery}
          inputHint="Harbor Social Club" />
        {controller.hostMatches.map((match) => <CatchIndexRow key={match.organizerId} title={match.name}
          subtitle={match.city ?? undefined} selected={match.organizerId === hostId} onTap={() => setHostId(match.organizerId)} />)}
      </CatchSection>;
      dock = <CatchDock recipe="pane"
        primary={{label: chosen ? `Link to ${chosen.name}` : "Pick the host first", isLoading: busy,
          onPressed: chosen ? () => void controller.linkEnquiry({intentId: item.sourceId, organizerId: chosen.organizerId}, chosen.name) : null}}
        secondary={{label: item.assigneeUid === uid ? "Snooze a day" : "Pick it up", onPressed: item.assigneeUid === uid ? snooze : pickUp}}
        next={`Linking opens their Sales work; it doesn't approve a claim · ${next.toLowerCase()}`} />;
    } else {
      const reviewLabel = item.type === "listing" ? "Review the listing" : item.type === "event" ? "Review the event" :
        "Fill in by hand";
      dock = <CatchDock recipe="pane"
        primary={{label: reviewLabel, onPressed: onOpenReview}}
        secondary={{label: item.assigneeUid === uid ? "Snooze a day" : "Pick it up", isLoading: busy,
          onPressed: item.assigneeUid === uid ? snooze : pickUp}}
        note={{label: "Note for the record", placeholder: "Optional", value: note, onChanged: setNote}}
        next={next} />;
    }
  }

  return (
    <>
      <CatchWorkspaceHeader
        title={item.title}
        kicker="Inbox"
        back={{label: "Back to Inbox", onPressed: onClose, close: true}}
        {...(position ? {position: {label: `${position.index} of ${position.of}`,
          ...(controller.previousItem ? {previous: {label: "Previous", onPressed: controller.selectPrevious}} : {}),
          ...(controller.nextItem ? {next: {label: "Next", onPressed: controller.selectNext}} : {})}} : {})}
      />
      <CatchMetaRow entries={facts(item)} columns={2} />
      {picker}
      <CatchSection title="How it got here" timeline={timeline(item, journey)} dividers="none" />
      {dock}
    </>
  );
}

/** What the inbox screen draws from: the controller, with the open item as plain data. */
export type InboxScreenModel = Omit<InboxController, "detail" | "page" | "refresh" | "city" | "setCity"> & {
  detail: InboxItemDetail | null;
  detailError: boolean;
};

/**
 * The Intake inbox: everything waiting on a person, oldest first, with the
 * selected item open beside it (the queue pattern). On a narrow screen the
 * item replaces the list and Back returns to it.
 */
export function InboxScreen({model, selectedItemId, onSelect, uid, onOpenReview}: {
  model: InboxScreenModel;
  selectedItemId: string | null;
  onSelect: (itemId: string | null) => void;
  uid: string | null;
  /** Listings and events are still reviewed in Intake review, until they move into the inbox. */
  onOpenReview: () => void;
}) {
  const detail = model.detail;
  return (
    <CatchPaneLayout
      pattern="queue"
      detailOpen={selectedItemId !== null}
      main={<InboxQueue controller={model} selectedItemId={selectedItemId} onSelect={onSelect} />}
      detail={selectedItemId === null ? <CatchEmptyState title="Pick an item" message="What it is, how it got here and the decision open here." /> :
        detail && detail.item.itemId === selectedItemId ?
        <InboxInspector controller={model} detail={detail} uid={uid} onClose={() => onSelect(null)} onOpenReview={onOpenReview} /> :
        model.detailError ?
          <CatchEmptyState title="This item could not be opened" message="It may have been decided already. Pick another." /> :
          null}
    />
  );
}
