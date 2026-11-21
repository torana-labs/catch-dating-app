import {responseSummaryId} from "./responseSummaryIds";
import type {HostResponseSummaryDocument} from
  "../../shared/generated/firestoreAdminTypes";
import {validateHostResponseSummaryDocument} from
  "../../shared/generated/validators/hostResponseSummaryDocument";

/**
 * Withdrawing a form response redacts every copy of it in the same
 * transaction, Catch Host's summary row (hostResponseSummaries) included, so
 * the redaction rule belongs to the forms context; the host read model
 * applies the same rule when it replays. A replay must retain redacted audit
 * metadata, never re-delete its row.
 */
export function redactResponseSummary(value: unknown, organizerId: string,
  kind: "response" | "application", id: string, withdrawnAtMillis: number)
  : HostResponseSummaryDocument | null {
  if (!validateHostResponseSummaryDocument(value) ||
      value.organizerId !== organizerId || value.kind !== kind ||
      value.summaryId !== responseSummaryId(kind, id) ||
      value.row.entryId !== `${kind}:${id}` ||
      (kind === "response" ? value.row.response?.responseId !== id :
        value.row.application?.applicationId !== id)) return null;
  const view: HostResponseSummaryDocument = JSON.parse(JSON.stringify(value));
  const application = view.row.application;
  if (application) {
    application.applicantDisplayName = "Withdrawn applicant";
    application.contactId = null;
    application.sourceResponseId = null;
    application.reviewStatus = "withdrawn";
    application.dataAccessState = "revokedParticipantGrant";
    if (view.reviewStatus !== undefined) view.reviewStatus = "withdrawn";
  }
  if (view.row.response) {
    view.row.response.status = "withdrawn";
    view.row.response.withdrawnAtMillis = withdrawnAtMillis;
    view.row.response.identity = {displayName: null, email: null,
      phoneE164: null, searchName: null, origin: "anonymous"};
    view.row.response.sourceLinkId = null;
    view.row.response.sourceLabel = null;
    view.row.response.highlights = [];
  }
  return view;
}
