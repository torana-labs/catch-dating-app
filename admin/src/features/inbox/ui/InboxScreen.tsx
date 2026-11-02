import {
  CatchBadge,
  CatchButton,
  CatchCheckboxInput,
  CatchDock,
  CatchEmptyState,
  CatchField,
  CatchGap,
  CatchIndexRow,
  CatchMetaRow,
  CatchPaneLayout,
  CatchSection,
  CatchSheet,
  CatchTable,
  CatchWorkspaceHeader,
  type CatchMetaEntry,
  type CatchSectionStep,
  type CatchTableColumn,
} from "@catch/web-ui";
import {useMemo, useState} from "react";
import {launchMarkets} from "../../../shared/config/launchMarkets";
import type {
  InboxItem,
  InboxItemDetail,
  InboxScope,
  InboxType,
  JourneyStep,
  ListingApprovalInput,
  ListingEventReview,
  ListingReview,
} from "../api/inboxRepository";
import {
  emptyListingEventForm,
  eventCheckReasons,
  eventPlatformLabel,
  listingEventChecklistItems,
  listingEventPublishRequest,
  needsMapLocation,
  type ListingEventPublishForm,
} from "../controllers/listingEventPublish";
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
 * launch access is decided here; listings and events open a sheet to review
 * and publish; stuck intake still opens the old review. Events and stuck intake
 * can be dismissed, with a reason, and come back. Every type can be picked up
 * or snoozed for a day.
 */
function InboxInspector({controller, detail, uid, onClose, onOpenReview}: {
  controller: InboxScreenModel;
  detail: InboxItemDetail;
  uid: string | null;
  onClose: () => void;
  /** Stuck intake is still filled in by hand in the review workspace. */
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

  const dismiss = {label: "Dismiss", onPressed: noteText ? () => void controller.updateItem({itemId: item.itemId, action: "dismiss",
    assigneeUid: null, snoozedUntil: null, note: noteText}, "Dismissed. It stays in Done if you need it back.") : null};
  const holdIt = {label: item.assigneeUid === uid ? "Snooze a day" : "Pick it up", isLoading: busy,
    onPressed: item.assigneeUid === uid ? snooze : pickUp};

  let dock = null;
  let picker = null;
  if (item.state.code === "dismissed") {
    dock = <CatchDock recipe="pane" primary={{label: "Back in the inbox", isLoading: busy, onPressed: () => void controller.updateItem({
      itemId: item.itemId, action: "reopen", assigneeUid: null, snoozedUntil: null, note: null}, "It's back in the inbox.")}} />;
  } else if (canWork) {
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
    } else if (item.type === "event") {
      const ref = item.listingEvent ?? null;
      dock = <CatchDock recipe="pane"
        primary={{label: item.state.code === "blocked" ? "See why" : "Review and publish", onPressed: ref ? () => controller.openEventReview(ref) : null}}
        danger={dismiss}
        secondary={holdIt}
        note={{label: "Note for the record", placeholder: "Why. Required to dismiss.", value: note, onChanged: setNote}}
        next={next} />;
    } else {
      dock = <CatchDock recipe="pane"
        primary={item.type === "listing" ? {label: "Review and approve", onPressed: () => controller.openListingReview(item.sourceId)} :
          {label: "Fill in by hand", onPressed: onOpenReview}}
        {...(item.type === "stuck" ? {danger: dismiss} : {})}
        secondary={holdIt}
        note={{label: "Note for the record", placeholder: item.type === "stuck" ? "Why. Required to dismiss." : "Optional", value: note, onChanged: setNote}}
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
      {controller.listingReviewFailed || controller.eventReviewFailed ? <CatchEmptyState title="The review could not be opened" message="It may have been decided already. Try again." /> : null}
      {dock}
      {controller.listingReview && controller.listingReview.review.requestId === item.sourceId ? (
        <ListingApprovalSheet key={item.sourceId} controller={controller} requestId={item.sourceId} review={controller.listingReview.review}
          canApprove={controller.listingReview.canApprove} onClose={() => controller.openListingReview(null)} />
      ) : null}
      {controller.eventReview && item.listingEvent?.eventWorkItemId === controller.eventReview.event.eventWorkItemId ? (
        <EventPublishSheet key={item.itemId} controller={controller} intakeRequestId={item.listingEvent.intakeRequestId}
          review={controller.eventReview} onClose={() => controller.openEventReview(null)} />
      ) : null}
    </>
  );
}

type Checklist = ListingApprovalInput["checklist"];

const organizerTypes = [
  {value: "community", label: "Community"}, {value: "club", label: "Club"}, {value: "eventProducer", label: "Event producer"},
  {value: "venue", label: "Venue"}, {value: "brand", label: "Brand"}, {value: "individual", label: "Individual"},
];
const checklistItems: Array<[keyof Checklist, string]> = [
  ["identityReviewed", "This is one real organizer, not one Catch already lists"],
  ["surfaceInventoryReviewed", "Every link belongs to this organizer"],
  ["ownerSafeCopyReviewed", "The description is fit to show the organizer"],
  ["marketScopeReviewed", "They run events in the chosen market"],
  ["mediaRightsReviewed", "No image or copy is used without the right to"],
  ["crawlDisabledReviewed", "Crawling stays off for this page"],
  ["claimTargetReviewed", "Claim target is present and owner-safe"],
  ["takedownPathReviewed", "Takedown path is available"],
  ["impersonationReviewed", "Identity does not impersonate another organizer"],
];
const possibleDuplicateGap = "possible_duplicate_organizer";
const bandLabels: Record<string, string> = {
  match: "Likely the same", probable: "Probably the same", review: "Possibly the same", low: "Weak overlap",
};

/**
 * How the listing compares with the organizers Catch already lists. Advisory:
 * the reviewer decides, and approving is never blocked by it.
 */
function DuplicateCheck({review}: {review: ListingReview}) {
  const check = review.duplicateCheck;
  if (!check) {
    return <CatchIndexRow title="Not compared with listed organizers" subtitle="Search Organizers before approving." titleVariant="bodyM" />;
  }
  const scope = `${check.organizersCompared} published organizer${check.organizersCompared === 1 ? "" : "s"}` +
    (check.citySlug ? ` in ${check.citySlug}` : " across every city");
  const truncated = check.truncated ? " Only the first ones were compared, so search Organizers too." : "";
  if (!review.listing.gaps.includes(possibleDuplicateGap) || check.candidates.length === 0) {
    return <CatchIndexRow title="No likely duplicate" subtitle={`Compared with ${scope}: none looks like the same organizer.${truncated}`} titleVariant="bodyM" />;
  }
  return (
    <CatchSection title="Possible duplicate organizer" note={`Compared with ${scope}`} dividers="none">
      <CatchIndexRow title="Catch may already list this organizer" titleVariant="bodyM"
        subtitle={`Open each match and approve only if this is a different organizer.${truncated}`}
        trailing={<CatchBadge recipe="status" tone="warning" label="Check" />} />
      {check.candidates.map((candidate) => <CatchIndexRow key={candidate.organizerId} titleVariant="bodyM"
        title={candidate.name ?? candidate.organizerId}
        href={`/organizers/${encodeURIComponent(candidate.organizerId)}`}
        subtitle={`${bandLabels[candidate.band] ?? candidate.band} · score ${candidate.score.toFixed(2)} · ${candidate.rationale}`} />)}
    </CatchSection>
  );
}

/** Approving publishes the page unclaimed and noindex, hidden in the app, and opens its Sales work. */
function ListingApprovalSheet({controller, requestId, review, canApprove, onClose}: {
  controller: InboxScreenModel;
  requestId: string;
  review: ListingReview;
  canApprove: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState(review.listing.name ?? "");
  const [publicSlug, setPublicSlug] = useState(review.suggestedSlug);
  const [marketId, setMarketId] = useState(review.market.open && review.market.marketId ? review.market.marketId : "");
  const [organizerType, setOrganizerType] = useState("community");
  const [checklist, setChecklist] = useState<Checklist>(
    () => Object.fromEntries(checklistItems.map(([key]) => [key, false])) as never);
  const [note, setNote] = useState("");
  const ready = Boolean(name.trim() && /^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])$/u.test(publicSlug) && marketId &&
    note.trim().length >= 10 && checklistItems.every(([key]) => checklist[key]));
  const markets = [{value: "", label: "Choose a launch market"},
    ...launchMarkets.map((market) => ({value: market.id as string, label: market.label as string}))];
  return (
    <CatchSheet recipe="standard" pinFooter open onClose={onClose} title={`Review ${review.listing.name ?? "listing"}`} subtitle="Inbox"
      footer={canApprove ? <CatchButton label={controller.isApproving ? "Publishing" : "Approve and publish unclaimed"}
        onPressed={ready && !controller.isApproving ? () => void controller.approveListing({
          listingWorkItemId: review.listingWorkItemId, contentHash: review.listing.contentHash, name: name.trim(), publicSlug, marketId,
          organizerType: organizerType as ListingApprovalInput["organizerType"], checklist, note: note.trim()}, requestId) : null} /> : undefined}>
      <CatchGap size="section">
        <CatchSection title="What Catch found" dividers="none">
          <CatchMetaRow columns={2} entries={[
            ...(review.listing.description ? [{label: "About", value: review.listing.description, wide: true}] : []),
            {label: "Upcoming events", value: String(review.listing.eventCount)},
            {label: "Pages read", value: `${review.listing.fetchedPageCount} of ${review.listing.pageCount}`},
            ...(review.listing.gaps.length ? [{label: "To check", value: `${review.listing.gaps.join(", ")}.${review.listing.researchNeeded ? " Research is still needed." : ""}`,
              tone: "warning" as const, wide: true}] : []),
            ...(!review.market.open ? [{label: "Market", value: `Nominated for ${review.market.label ?? review.market.slug}, which Catch has not opened. Choose an open market or wait.`,
              tone: "warning" as const, wide: true}] : []),
          ]} />
          {review.listing.links.map((link) => <CatchIndexRow key={link.url} title={link.platform} titleVariant="bodyM" subtitle={link.url} href={link.url} />)}
        </CatchSection>
        <DuplicateCheck review={review} />
        {canApprove ? (
          <CatchGap size="related">
            <CatchField recipe="input" title="Organizer name" maxLength={120} value={name} onChanged={setName} />
            <CatchField recipe="input" title="Public page slug" maxLength={64} value={publicSlug}
              onChanged={(value) => setPublicSlug(value.trim().toLowerCase())} />
            <CatchField recipe="select" title="Launch market" value={marketId} values={markets.map((entry) => entry.value)}
              itemLabelBuilder={(value) => markets.find((entry) => entry.value === value)?.label ?? value}
              onChanged={(value) => setMarketId(value ?? "")} />
            <CatchField recipe="select" title="Organizer type" value={organizerType} values={organizerTypes.map((entry) => entry.value)}
              itemLabelBuilder={(value) => organizerTypes.find((entry) => entry.value === value)?.label ?? value}
              onChanged={(value) => setOrganizerType(value ?? "community")} />
            {checklistItems.map(([key, label]) => <CatchCheckboxInput key={key} label={label} value={checklist[key]}
              onChanged={(value) => setChecklist((current) => ({...current, [key]: value}))} />)}
            <CatchField recipe="input" title="Review note" maxLines={3} maxLength={500} value={note} onChanged={setNote}
              helperText="What you checked, in at least ten characters." />
          </CatchGap>
        ) : <CatchEmptyState title="Approving needs an ops or owner role" />}
      </CatchGap>
    </CatchSheet>
  );
}

const eventWhen = (iso: string) => new Date(iso).toLocaleString("en-IN",
  {dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata"});

/** Publishing puts one imported event on the organizer's page, read-only: guests still book on the source page. */
function EventPublishSheet({controller, intakeRequestId, review, onClose}: {
  controller: InboxScreenModel;
  intakeRequestId: string;
  review: ListingEventReview;
  onClose: () => void;
}) {
  const {event, organizer} = review;
  const title = event.title ?? "This event";
  const [form, setForm] = useState<ListingEventPublishForm>(emptyListingEventForm);
  const change = (patch: Partial<ListingEventPublishForm>) => setForm((current) => ({...current, ...patch}));
  const blocked = event.state === "blocked";
  const reasons = eventCheckReasons(event);
  const request = blocked ? null : listingEventPublishRequest(event, intakeRequestId, form);
  return (
    <CatchSheet recipe="standard" pinFooter open onClose={onClose} title={title} subtitle={organizer.name ?? "Inbox"}
      footer={blocked ? undefined : <CatchButton label={controller.isPublishingEvent ? "Publishing" : "Publish on the organizer's page"}
        onPressed={request && !controller.isPublishingEvent ? () => void controller.publishEvent(request, title) : null} />}>
      <CatchGap size="section">
        <CatchSection title="What Catch found" dividers="none">
          <CatchMetaRow columns={2} entries={[
            {label: "When", value: eventWhen(event.startAt)},
            {label: "Ends", value: event.endAt ? eventWhen(event.endAt) : "Not stated"},
            {label: "Where", value: [event.venue, event.address].filter(Boolean).join(", ") || "Not stated"},
            {label: "Price", value: event.priceLabel ?? "Not stated"},
          ]} />
          <CatchIndexRow title={`Open on ${eventPlatformLabel(event.platform)}`} titleVariant="bodyM" subtitle={event.sourceUrl} href={event.sourceUrl} />
          <CatchIndexRow title={`Open ${organizer.name ?? "the organizer"}`} titleVariant="bodyM"
            href={`/organizers/${encodeURIComponent(organizer.organizerId)}`} />
        </CatchSection>
        {reasons.length ? (
          <CatchSection title={blocked ? "Why it cannot publish" : "Left for you to check"} dividers="none">
            {reasons.map((reason) => <CatchIndexRow key={reason} title={reason} titleVariant="bodyM" />)}
          </CatchSection>
        ) : null}
        {blocked ? null : (
          <CatchGap size="related">
            {needsMapLocation(event) ? (
              <CatchGap size="related">
                <CatchCheckboxInput label="It has no fixed place, like an online event" value={form.noFixedPlace}
                  onChanged={(noFixedPlace) => change({noFixedPlace})} />
                {form.noFixedPlace ? null : (
                  <CatchField recipe="input" title="Map location" maxLength={60} value={form.mapLocation}
                    onChanged={(mapLocation) => change({mapLocation})}
                    helperText="Latitude, longitude as Google Maps copies a dropped pin, for example 19.0596, 72.8227." />
                )}
                {form.noFixedPlace || event.venue || event.address ? null : (
                  <CatchField recipe="input" title="Venue" maxLength={240} value={form.venueName}
                    onChanged={(venueName) => change({venueName})} helperText="The place name guests will look for." />
                )}
              </CatchGap>
            ) : null}
            {listingEventChecklistItems.map(([key, label]) => <CatchCheckboxInput key={key} label={label} value={form.checklist[key]}
              onChanged={(value) => change({checklist: {...form.checklist, [key]: value}})} />)}
            <CatchField recipe="input" title="Review note" maxLines={3} maxLength={500} value={form.note}
              onChanged={(value) => change({note: value})}
              helperText={reasons.length ? "What you checked, in at least ten characters. It covers each check above." :
                "What you checked, in at least ten characters."} />
          </CatchGap>
        )}
      </CatchGap>
    </CatchSheet>
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
  /** Stuck intake is still filled in by hand in Intake review. */
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
