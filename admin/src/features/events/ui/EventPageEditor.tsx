import {
  CatchButton,
  CatchDialog,
  CatchField,
  CatchGap,
  CatchIndexRow,
  CatchMetaRow,
  CatchSection,
  CatchLegacyText,
  type CatchMetaEntry,
} from "@catch/web-ui";
import {useState} from "react";
import {launchMarketForId} from "../../../shared/config/launchMarkets";
import {eventWhenLabel, stepTimeLabel} from "../../../shared/domain/recordDates";
import type {
  AdminEventActivityKind,
  AdminEventDetails,
  AdminEventInteractionModel,
  AdminEventPace,
} from "../../../shared/types/adminTypes";
import {selectOptions} from "../../../shared/ui/AdminPrimitives";
import {eventPriceLabel} from "../controllers/eventRecordLabels";
import {
  eventActivityKindOptions,
  eventInteractionModelOptions,
  eventPaceOptions,
} from "../controllers/eventPublishingHelpers";
import type {EventPageEditorController} from "../controllers/useEventPageEditorController";

const activityLabels: Record<AdminEventActivityKind, string> = {
  socialRun: "Social run",
  running: "Run",
  walking: "Walk",
  pickleball: "Pickleball",
  padel: "Padel",
  tennis: "Tennis",
  badminton: "Badminton",
  cycling: "Cycling",
  spinClass: "Spin class",
  yoga: "Yoga",
  strengthTraining: "Strength training",
  pubQuiz: "Trivia",
  barCrawl: "Bar crawl",
  dinner: "Dinner",
  singlesMixer: "Singles mixer",
  openActivity: "Open activity",
};

const interactionLabels: Record<AdminEventInteractionModel, string> = {
  pacePods: "In pace groups",
  pairedRotations: "In pairs",
  teamRotations: "In teams",
  seatedTable: "Seated at a table",
  freeFormMixer: "Mixing with everyone",
  routeStops: "Moving between stops",
  hostLedProgram: "Led by the host",
  openFormat: "However they like",
};

const paceLabels: Record<AdminEventPace, string> = {
  easy: "Easy",
  moderate: "Moderate",
  fast: "Fast",
  competitive: "Competitive",
};

/** Only these have a route, so only these show distance and pace. */
const movingActivities: ReadonlySet<AdminEventActivityKind> =
  new Set(["socialRun", "running", "walking", "cycling"]);

function whoCanJoin(event: AdminEventDetails): string {
  const {discovery} = event;
  const gate = [
    discovery.inviteRequired ? "by invite" : null,
    discovery.membershipRequired ? "members" : null,
    discovery.manualApprovalRequired ? "by request" : null,
  ].filter(Boolean).join(", ") || "Anyone";
  const {minAge, maxAge} = discovery;
  const age = minAge === null && maxAge === null ? null :
    maxAge === null ? `${minAge} and over` :
      minAge === null ? `up to ${maxAge}` : `${minAge} to ${maxAge}`;
  const who = gate.charAt(0).toUpperCase() + gate.slice(1);
  return age ? `${who}, ${age}` : who;
}

/** The form: what guests read and the format; the organizer's own terms are shown, not edited. */
function EventPageEditorForm({editor}: {editor: EventPageEditorController}) {
  const {event, form, update} = editor;
  if (!event || !form) {
    return <CatchLegacyText as="p" color="ink2" variant="bodyM">Loading the event</CatchLegacyText>;
  }
  const facts: CatchMetaEntry[] = [
    {label: "Starts", value: eventWhenLabel(event.startTime)},
    {label: "Ends", value: eventWhenLabel(event.endTime)},
    {label: "Places", value: `${event.capacityLimit}${event.waitlistedCount ? `, with a waitlist of ${event.waitlistedCount}` : ""}`},
    {label: "Price", value: eventPriceLabel(event.priceInPaise)},
  ];
  return (
    <CatchGap size="majorSection">
      <CatchSection dividers="none" title="What guests read">
        <CatchGap size="section">
          <CatchField
            helperText="Guests read this on the event page."
            maxLines={5}
            onChanged={(value) => update("description", value)}
            recipe="input"
            title="Description"
            value={form.description}
          />
          <CatchField
            helperText="Leave this empty to use the lettermark."
            onChanged={(value) => update("photoUrl", value)}
            recipe="input"
            title="Cover photo"
            value={form.photoUrl}
          />
        </CatchGap>
      </CatchSection>
      <CatchSection dividers="none" title="Format">
        <CatchGap size="section">
          <CatchField
            onChanged={(value) => update("activityKind", (value ?? "") as AdminEventActivityKind)}
            recipe="select"
            title="Activity"
            {...selectOptions(eventActivityKindOptions.map((value) => ({value, label: activityLabels[value]})))}
            value={form.activityKind}
          />
          <CatchField
            onChanged={(value) => update("interactionModel", (value ?? "") as AdminEventInteractionModel)}
            recipe="select"
            title="How people take part"
            {...selectOptions(eventInteractionModelOptions.map((value) => ({value, label: interactionLabels[value]})))}
            value={form.interactionModel}
          />
          <CatchField
            onChanged={(value) => update("customActivityLabel", value)}
            recipe="input"
            title="Label shown instead (optional)"
            value={form.customActivityLabel}
          />
          {movingActivities.has(form.activityKind) ? (
            <>
              <CatchField
                onChanged={(value) => update("distanceKm", value)}
                recipe="input"
                title="Distance in km"
                value={form.distanceKm}
              />
              <CatchField
                onChanged={(value) => update("pace", (value ?? "") as AdminEventPace)}
                recipe="select"
                title="Pace"
                {...selectOptions(eventPaceOptions.map((value) => ({value, label: paceLabels[value]})))}
                value={form.pace}
              />
            </>
          ) : null}
        </CatchGap>
      </CatchSection>
      <CatchSection dividers="none" note="They change these in the host app" title="Set by the organizer">
        <CatchMetaRow entries={facts} />
      </CatchSection>
      <CatchSection dividers="none" title="Why this change">
        <CatchField
          helperText="Kept in History. Guests never see it."
          maxLines={2}
          onChanged={(value) => update("reviewNote", value)}
          recipe="input"
          title="Note for the team"
          value={form.reviewNote}
        />
      </CatchSection>
    </CatchGap>
  );
}

/** Beside the form: what stops a save, what changed, and how the event shows in Explore. */
function EventPageEditorSide({editor}: {editor: EventPageEditorController}) {
  const {diffRows, event, issues} = editor;
  if (!event) return null;
  const placesLeft = Math.max(0, event.capacityLimit - event.bookedCount);
  return (
    <CatchGap size="majorSection">
      <CatchSection dividers="none" title="Checks">
        {issues.length === 0 ? (
          <CatchIndexRow title="Ready to save" titleVariant="bodyM" />
        ) : issues.map((issue) => (
          <CatchIndexRow key={issue.id} subtitle={issue.detail} title={issue.label} titleMaxLines={2} titleVariant="bodyM" />
        ))}
        <CatchIndexRow
          subtitle="Editing this page never touches bookings"
          title="Bookings unchanged"
          titleVariant="bodyM"
        />
      </CatchSection>
      <CatchSection count={diffRows.length} dividers="none" empty="No changes yet." title="Your changes">
        {diffRows.length === 0 ? null : diffRows.map((row) => (
          <CatchIndexRow
            key={row.field}
            subtitle={`${row.before} → ${row.after}`}
            title={row.field}
            titleVariant="bodyM"
          />
        ))}
      </CatchSection>
      <CatchSection dividers="none" note="Updates when you save" title="In Explore">
        <CatchMetaRow columns={1} entries={[
          {label: "City", value: launchMarketForId(event.discovery.citySlug)?.cityName ?? event.discovery.citySlug ?? "—"},
          {label: "Shows as", value: activityLabels[event.eventFormat.activityKind]},
          {label: "Places left", value: String(placesLeft)},
          {label: "Who can join", value: whoCanJoin(event)},
          event.searchIndexStatus === "indexed" ?
            {label: "Search", value: "Listed", tone: "success"} :
            {label: "Search", value: "Not listed yet", tone: "warning"},
        ]} />
      </CatchSection>
    </CatchGap>
  );
}

/** Save and Discard for the top bar. */
function EventPageEditorActions({editor}: {editor: EventPageEditorController}) {
  return (
    <>
      <CatchButton
        label="Discard"
        onPressed={editor.diffRows.length > 0 && !editor.isSaving ? editor.discard : null}
        size="sm"
        variant="secondary"
      />
      <CatchButton
        label={editor.isSaving ? "Saving" : "Save changes"}
        onPressed={editor.canSave ? () => void editor.save() : null}
        size="sm"
      />
    </>
  );
}

/**
 * Overview's pilot review. It affects when the organizer's activation is first counted, so it asks
 * for a note, and saves on its own rather than with any page edits.
 */
function EventPilotReviewSection({editor}: {editor: EventPageEditorController}) {
  const {event} = editor;
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  if (!event) return null;
  const reviewed = event.hostPilotReview?.realEvent === true;
  const close = () => {
    setOpen(false);
    setNote("");
  };
  return (
    <CatchSection dividers="none" title="Pilots">
      <CatchIndexRow
        subtitle={event.hostActivation ?
          `First activation counted ${stepTimeLabel(new Date(event.hostActivation.activatedAt).toISOString())}` :
          "Save before the first check-in. The first check-in at a published event then counts as this organizer's activation, once. It doesn't start advertising or send guest data."}
        title={reviewed ? "Reviewed as a real pilot event" : "Not reviewed as a real pilot event"}
        titleMaxLines={2}
        titleVariant="bodyM"
        trailing={(
          <CatchButton
            label={reviewed ? "Undo" : "Mark as real"}
            onPressed={() => setOpen(true)}
            size="sm"
            variant="secondary"
          />
        )}
      />
      <CatchDialog
        cancel={{label: "Cancel", onPressed: close}}
        confirm={{
          label: reviewed ? "Undo the review" : "Mark as real",
          onPressed: note.trim() ? () => {
            void editor.savePilotReview(!reviewed, note.trim()).then((saved) => {
              if (saved) close();
            });
          } : null,
        }}
        onClose={close}
        open={open}
        title={reviewed ? "Undo the pilot review?" : "Is this a real pilot event, not a test?"}
      >
        <CatchField
          helperText="Kept in History."
          maxLines={3}
          onChanged={setNote}
          recipe="input"
          title="Note for the team"
          value={note}
        />
      </CatchDialog>
    </CatchSection>
  );
}

export const eventPageEditorPanels = {EventPageEditorForm, EventPageEditorSide, EventPageEditorActions, EventPilotReviewSection};
