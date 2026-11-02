import {CatchAdminIntakeSourceList, CatchAdminSearchCandidateHeader, CatchBadge, CatchField, CatchGap, CatchText} from "@catch/web-ui";
import {useState} from "react";
import {Clock3, ExternalLink, FileWarning, FolderSearch} from "lucide-react";
import type {
  AdminEventListRow,
  AdminExternalEventListRow,
} from "../../../shared/types/adminTypes";
import {
  AdminButton,
  AdminEventSupplyDetail,
  AdminEventSupplyEmptyState,
  AdminEventSupplyLinks,
  AdminLinkButton,
  CheckboxField,
  DataTable,
  EmptyState,
  QualityList,
  QualityRow,
  StateRow,
  AdminEyebrow,
  AdminMutedCell,
} from "../../../shared/ui/AdminPrimitives";
import {type ExternalEventTakedownRequest} from "../controllers/useEventPublishingController";
import {
  eventIsFull,
  externalEventNeedsReview,
  formatEventLabel,
} from "../controllers/eventPublishingHelpers";

function ExternalEventSupplyDetail({
  event,
}: {
  event: AdminExternalEventListRow | null;
}) {
  if (!event) {
    return (
      <AdminEventSupplyEmptyState icon={<Clock3 size={16} strokeWidth={1.9} />}>
        Select an external event to inspect source attribution.
      </AdminEventSupplyEmptyState>
    );
  }

  return (
    <AdminEventSupplyDetail
      aria-label={`External event supply detail for ${event.title}`}
    >
      <CatchAdminSearchCandidateHeader>
        <div>
          <AdminEyebrow>{event.targetPath}</AdminEyebrow>
          <CatchText as="h3" variant="sectionTitle">{event.title}</CatchText>
        </div>
        <CatchBadge recipe="status" tone={externalEventNeedsReview(event) ? "neutral" : "success"} label={externalEventNeedsReview(event) ? "review open" : "reviewed"} />
      </CatchAdminSearchCandidateHeader>
      <QualityList>
        <StateRow label="Canonical organizer" value={event.canonicalHostId} />
        <StateRow label="Compatibility club" value={event.canonicalHostId} />
        <StateRow label="City" value={event.citySlug} />
        <StateRow label="Starts" value={formatDateTime(event.startTime)} />
        <StateRow label="Ends" value={formatDateTime(event.endTime)} />
        <StateRow label="Venue" value={event.meetingPoint || null} />
        <StateRow label="Activity" value={formatEventLabel(event.activityKind)} />
        <StateRow
          label="Format"
          value={formatEventLabel(event.interactionModel)}
        />
        <StateRow
          label="Price"
          value={event.priceDisplayText ?? formatExternalMoney(event)}
        />
        <StateRow label="Publication" value={event.publicationStatus} />
      </QualityList>
      <CatchGap direction="horizontal" size="inline" wrap>
        <CatchBadge label={`import policy ${event.importPolicyAcknowledged ? "ok" : "open"}`} />
        <CatchBadge label={`owner-safe copy ${event.ownerSafeCopyReviewed ? "ok" : "open"}`} />
        <CatchBadge label={`${event.duplicateCandidateCount} duplicate candidates`} />
        <CatchBadge label={event.availability} />
      </CatchGap>
      <CatchAdminIntakeSourceList>
        <StateRow label="Platform" value={event.platform} />
        <StateRow label="Source key" value={event.sourceEventKey} />
        <StateRow label="Candidate" value={event.candidateId} />
        <StateRow label="Normalized key" value={event.normalizedEventKey} />
        <StateRow label="Primary candidate" value={event.primaryCandidateId} />
        <StateRow label="Review batch" value={event.reviewBatchId} />
        <StateRow label="Reviewer" value={event.reviewer} />
        <StateRow label="Decided" value={event.decidedAt} />
      </CatchAdminIntakeSourceList>
      <AdminEventSupplyLinks>
        {event.eventUrl ? (
          <AdminLinkButton
            href={event.eventUrl}
            icon={<ExternalLink size={15} strokeWidth={1.9} />}
            label={`Open external event page for ${event.title}`}
            rel="noreferrer"
            target="_blank"
          >
            Event page
          </AdminLinkButton>
        ) : null}
        {event.sourceUrl && event.sourceUrl !== event.eventUrl ? (
          <AdminLinkButton
            href={event.sourceUrl}
            icon={<ExternalLink size={15} strokeWidth={1.9} />}
            label={`Open source page for ${event.title}`}
            rel="noreferrer"
            target="_blank"
          >
            Source page
          </AdminLinkButton>
        ) : null}
        {event.primaryExternalUrl &&
          event.primaryExternalUrl !== event.eventUrl &&
          event.primaryExternalUrl !== event.sourceUrl ? (
            <AdminLinkButton
              href={event.primaryExternalUrl}
              icon={<ExternalLink size={15} strokeWidth={1.9} />}
              label={`Open primary outbound link for ${event.title}`}
              rel="noreferrer"
              target="_blank"
            >
              Primary outbound
            </AdminLinkButton>
          ) : null}
      </AdminEventSupplyLinks>
    </AdminEventSupplyDetail>
  );
}

function ExternalEventTakedownPanel({
  event,
  isSubmitting,
  onTakedown,
}: {
  event: AdminExternalEventListRow | null;
  isSubmitting: boolean;
  onTakedown: (request: ExternalEventTakedownRequest) => Promise<boolean>;
}) {
  const [reviewNote, setReviewNote] = useState("");
  const [checklist, setChecklist] = useState({
    sourceStatusReviewed: false,
    takedownAuthorityReviewed: false,
    downstreamVisibilityReviewed: false,
  });
  if (!event || event.publicationStatus !== "public") return null;
  const checklistComplete = Object.values(checklist).every(Boolean);
  const disabled = isSubmitting ||
    !reviewNote.trim() ||
    !checklistComplete;

  return (
    <AdminEventSupplyDetail aria-label="External event takedown">
      <QualityRow
        icon={<FileWarning size={16} strokeWidth={1.9} />}
        tone="warning"
      >
        <strong>Remove from external discovery</strong>
        <span>
          This keeps the event and immutable receipts for audit, but marks the
          public projection removed and cancelled.
        </span>
      </QualityRow>
      <CatchField
        recipe="input"
        title="Takedown review note"
        onChanged={setReviewNote}
        inputHint="State what changed at the official source and why removal is authorized."
        maxLines={4}
        value={reviewNote}
      />
      <QualityList>
        <CheckboxField
          checked={checklist.sourceStatusReviewed}
          label="Official source status reviewed"
          onChange={(checked) => setChecklist((current) => ({
            ...current,
            sourceStatusReviewed: checked,
          }))}
        />
        <CheckboxField
          checked={checklist.takedownAuthorityReviewed}
          label="Takedown authority reviewed"
          onChange={(checked) => setChecklist((current) => ({
            ...current,
            takedownAuthorityReviewed: checked,
          }))}
        />
        <CheckboxField
          checked={checklist.downstreamVisibilityReviewed}
          label="Downstream app and web visibility reviewed"
          onChange={(checked) => setChecklist((current) => ({
            ...current,
            downstreamVisibilityReviewed: checked,
          }))}
        />
      </QualityList>
      <AdminButton
        disabled={disabled}
        icon={<FileWarning size={15} strokeWidth={1.9} />}
        loading={isSubmitting}
        loadingLabel="Removing external event"
        onClick={() => onTakedown({
          eventId: event.eventId,
          reviewNote,
          checklist,
        })}
      >
        Remove external event
      </AdminButton>
    </AdminEventSupplyDetail>
  );
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "none";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatMoney(row: {
  currency: string;
  priceInPaise: number;
}): string {
  const amount = row.priceInPaise / 100;
  return new Intl.NumberFormat("en-IN", {
    currency: row.currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amount);
}

function formatExternalMoney(row: {
  currency: string;
  parsedPriceInPaise: number | null;
}): string {
  if (row.parsedPriceInPaise === null) return "none";
  return formatMoney({
    currency: row.currency,
    priceInPaise: row.parsedPriceInPaise,
  });
}

export const eventPublishingSupplyPanels = {
  ExternalEventSupplyDetail,
  ExternalEventTakedownPanel,
};
