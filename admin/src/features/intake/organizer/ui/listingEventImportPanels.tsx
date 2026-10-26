import {CatchBadge, type CatchBadgeTone, CatchField, CatchText} from "@catch/web-ui";
import {useState} from "react";
import {
  AdminButton,
  AdminForm,
  AdminIntakeSection,
  AdminLinkButton,
  AdminOrganizerIntakeCheckboxField,
  AdminToolbar,
  Panel,
  StateRow,
} from "../../../../shared/ui/AdminPrimitives";
import type {ImportedEvent, ListingEventImport} from "../api/listingEventImportRepository";
import type {
  ListingEventImportsController,
  ListingEventPublishRequest,
} from "../controllers/useListingEventImportsController";

type Checklist = ListingEventPublishRequest["checklist"];

const checklistItems: Array<[keyof Checklist, string]> = [
  ["outboundLinksReviewed", "Each event's link opens the organizer's own page for it"],
  ["noCatchBookingPaymentsWaitlist", "Guests book on that page; Catch takes no booking, payment or waitlist"],
  ["ownerSafeCopyReviewed", "The title and description are fit to show on Catch, with no dating framing"],
];

const stateLabels: Record<ImportedEvent["state"], [string, CatchBadgeTone]> = {
  published: ["Published", "success"],
  withdrawn: ["Withdrawn", "neutral"],
  ready: ["Ready", "success"],
  needs_resolution: ["Needs a check", "warning"],
  blocked: ["Blocked", "danger"],
};

const blockerLabels: Record<string, string> = {
  missing_end_time: "no end time",
  missing_location_detail: "no venue or address",
  missing_exact_coordinates: "no map location",
  duplicate_normalized_event_key: "may duplicate another event",
  requires_owner_safe_copy_review: "copy not reviewed",
  requires_event_defaults_policy: "booking defaults undecided",
  event_already_ended: "already ended",
  event_cancelled: "cancelled",
  platform_not_publishable: "platform not supported yet",
  start_time_missing: "no start time",
  organizer_page_unpublished: "the organizer's page is not published",
  organizer_market_unknown: "the organizer has no launch market",
  organizer_listing_pending: "the listing is not approved",
  external_event_contract_invalid: "the event data is out of contract",
  organizer_authority_mismatch: "the organizer's settings changed",
  import_policy_not_acknowledged: "the import checklist is not confirmed",
};

const uncheckedList = (): Checklist => ({outboundLinksReviewed: false, noCatchBookingPaymentsWaitlist: false,
  ownerSafeCopyReviewed: false});

const when = (iso: string) => new Date(iso).toLocaleString("en-IN",
  {dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata"});

const selectable = (event: ImportedEvent) => event.state === "ready" || event.state === "needs_resolution";

function findingText(event: ImportedEvent): string | null {
  const reasons = event.automatedFindings.map((finding) => finding.check === "dating_framing" ?
    `its ${finding.field} says "${finding.match}"` : finding.check === "price_missing" ?
      "its page states no price" : `it names another organizer (${finding.match})`);
  return reasons.length ? `Left for a person: ${reasons.join("; ")}.` : null;
}

/**
 * Events Supply Intake imported for approved listings. Under the publication
 * policy the ones that pass every check publish on their own; staff publish
 * the rest here, and withdraw any published event.
 */
export function renderListingEventImports(controller: ListingEventImportsController) {
  return <ListingEventImports controller={controller} />;
}

function ListingEventImports({controller}: {controller: ListingEventImportsController}) {
  const [selected, setSelected] = useState<string | null>(null);
  const row = controller.rows.find((entry) => entry.intakeRequestId === selected) ?? null;
  return <>
    <Panel title="Imported events" icon={null}>
      <CatchText as="p" variant="supporting">{controller.policy?.mode === "staff_review" ?
        "Every event imported for an approved listing waits here until you publish it." :
        "Events from approved listings publish on the organizer's page by themselves when they pass every " +
        "check. The rest wait here for you."}</CatchText>
      {controller.page.isPending ? <CatchText as="p" variant="supporting">Loading imported events…</CatchText> : null}
      {controller.page.error ? <CatchText as="p" variant="supporting" role="alert">
        Imported events could not be loaded. Try again.</CatchText> : null}
      {!controller.page.isPending && !controller.page.error && controller.rows.length === 0 ?
        <CatchText as="p" variant="supporting">No approved listing has imported events yet.</CatchText> : null}
      {controller.unavailableCount ? <CatchText as="p" variant="supporting" role="status">
        {controller.unavailableCount} approved listing{controller.unavailableCount === 1 ? "" : "s"} on this page
        could not be read.</CatchText> : null}
      {controller.rows.map((entry) => <StateRow key={entry.intakeRequestId}
        label={entry.organizer.name ?? "Unnamed organizer"}
        value={<>
          Approved {when(entry.approvedAt)} · {summary(entry)}{" "}
          <AdminButton onClick={() => setSelected(entry.intakeRequestId)}>Review events</AdminButton>
        </>} />)}
      <AdminToolbar>
        <AdminButton disabled={!controller.hasPreviousPage} onClick={controller.previousPage}>Previous page</AdminButton>
        <AdminButton disabled={!controller.hasNextPage} onClick={controller.nextPage}>Next page</AdminButton>
      </AdminToolbar>
    </Panel>
    {row ? <ListingEvents key={row.intakeRequestId} row={row} controller={controller}
      onClose={() => setSelected(null)} /> : null}
  </>;
}

function summary(row: ListingEventImport): string {
  if (row.events.length === 0) return "no upcoming events";
  const counts = new Map<string, number>();
  for (const event of row.events) {
    const label = stateLabels[event.state][0].toLowerCase();
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts].map(([label, count]) => `${count} ${label}`).join(" · ");
}

function ListingEvents({row, controller, onClose}: {
  row: ListingEventImport;
  controller: ListingEventImportsController;
  onClose: () => void;
}) {
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
  const [checklist, setChecklist] = useState<Checklist>(uncheckedList);
  const [note, setNote] = useState("");
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const [withdrawNote, setWithdrawNote] = useState("");
  const picked = row.events.filter((event) => chosen.has(event.eventWorkItemId));
  const needsNote = picked.filter((event) => event.resolvableBlockers.length > 0);
  const ready = picked.length > 0 && note.trim().length >= 10 && checklistItems.every(([key]) => checklist[key]) &&
    needsNote.every((event) => (resolutionNotes[event.eventWorkItemId] ?? "").trim().length >= 10);
  const toggle = (id: string, on: boolean) => setChosen((current) => {
    const next = new Set(current);
    if (on) next.add(id); else next.delete(id);
    return next;
  });
  const submit = async () => {
    if (!ready) return;
    const published = await controller.publish({intakeRequestId: row.intakeRequestId, checklist,
      eventWorkItemIds: picked.map((event) => event.eventWorkItemId), reviewNote: note.trim(),
      blockerResolutions: needsNote.flatMap((event) => event.resolvableBlockers.map((blockerCode) => ({
        eventWorkItemId: event.eventWorkItemId, blockerCode, outcome: "resolved" as const,
        policyGapDecisionId: null, note: resolutionNotes[event.eventWorkItemId].trim()})))});
    if (published) {
      setChosen(new Set());
      setChecklist(uncheckedList());
      setNote("");
    }
  };
  return <Panel title={`Events imported for ${row.organizer.name ?? "this organizer"}`} icon={null}>
    {!row.organizer.pagePublished ? <CatchText as="p" variant="supporting" role="status">The organizer's page is
      not published, so none of its events can be.</CatchText> : null}
    {row.events.length === 0 ? <CatchText as="p" variant="supporting">The listing found no upcoming
      events.</CatchText> : null}
    {row.events.map((event) => {
      const [label, tone] = stateLabels[event.state];
      const reasons = event.blockers.map((code) => blockerLabels[code] ?? code);
      return <AdminIntakeSection key={event.eventWorkItemId}>
        <StateRow label={event.title ?? "Untitled event"} value={<>
          <CatchBadge recipe="status" tone={tone} label={`${label}${event.publishedBy === "policy" ? " by policy" :
            event.publishedBy === "staff" && event.state === "published" ? " by staff" : ""}`} />{" "}
          {when(event.startAt)}{event.venue ? ` · ${event.venue}` : ""}{event.priceLabel ? ` · ${event.priceLabel}` : ""}{" "}
          <AdminLinkButton href={event.sourceUrl} rel="noreferrer" target="_blank">{event.platform}</AdminLinkButton>
        </>} />
        {findingText(event) ? <CatchText as="p" variant="supporting">{findingText(event)}</CatchText> : null}
        {reasons.length ? <CatchText as="p" variant="supporting">{event.state === "blocked" ?
          "Cannot publish" : "Check before publishing"}: {reasons.join(", ")}.</CatchText> : null}
        {selectable(event) ? <AdminOrganizerIntakeCheckboxField label={`Publish ${event.title ?? "this event"}`}
          checked={chosen.has(event.eventWorkItemId)} onChange={(on) => toggle(event.eventWorkItemId, on)} /> : null}
        {chosen.has(event.eventWorkItemId) && event.resolvableBlockers.length > 0 ?
          <CatchField recipe="input" title={`What you checked for ${event.title ?? "this event"}`} maxLength={500}
            value={resolutionNotes[event.eventWorkItemId] ?? ""}
            onChanged={(value) => setResolutionNotes((current) => ({...current, [event.eventWorkItemId]: value}))}
            helperText={`Confirms ${event.resolvableBlockers.map((code) => blockerLabels[code] ?? code)
              .join(", ")} is acceptable for this event.`} /> : null}
        {event.state === "published" && event.eventId ? withdrawing === event.eventId ?
          <AdminForm onSubmit={(submitted) => {
            submitted.preventDefault();
            void controller.withdraw({eventId: event.eventId!, reviewNote: withdrawNote.trim()})
              .then((done) => done && setWithdrawing(null));
          }}>
            <CatchField recipe="input" title="Why it comes down" maxLength={500} value={withdrawNote}
              onChanged={setWithdrawNote} />
            <AdminToolbar>
              <AdminButton type="submit" variant="primary"
                disabled={withdrawNote.trim().length < 10 || controller.isWithdrawing}>Withdraw event</AdminButton>
              <AdminButton onClick={() => setWithdrawing(null)}>Keep it</AdminButton>
            </AdminToolbar>
          </AdminForm> :
          <AdminButton onClick={() => {
            setWithdrawNote("");
            setWithdrawing(event.eventId);
          }}>Withdraw</AdminButton> : null}
      </AdminIntakeSection>;
    })}
    {picked.length > 0 ? <AdminForm onSubmit={(submitted) => {
      submitted.preventDefault();
      void submit();
    }}>
      {checklistItems.map(([key, label]) => <AdminOrganizerIntakeCheckboxField key={key} label={label}
        checked={checklist[key]} onChange={(checked) => setChecklist((current) => ({...current, [key]: checked}))} />)}
      <CatchField recipe="input" title="Review note" maxLines={3} maxLength={500} value={note} onChanged={setNote}
        helperText="What you checked, in at least ten characters." />
      <AdminToolbar>
        <AdminButton type="submit" variant="primary" disabled={!ready || controller.isPublishing}>
          Publish {picked.length} event{picked.length === 1 ? "" : "s"}</AdminButton>
      </AdminToolbar>
    </AdminForm> : null}
    <AdminToolbar>
      {row.organizer.canonicalPath ? <AdminLinkButton href={`https://catchdates.com${row.organizer.canonicalPath}`}
        rel="noreferrer" target="_blank">Open the organizer's page</AdminLinkButton> : null}
      <AdminButton disabled={controller.isRefreshing || !row.organizer.pagePublished}
        onClick={() => void controller.refresh(row.organizer.organizerId)}>Check for new events</AdminButton>
      <AdminButton onClick={onClose}>Close</AdminButton>
    </AdminToolbar>
  </Panel>;
}
