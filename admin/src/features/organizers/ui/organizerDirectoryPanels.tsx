import {CatchBadge, CatchField} from "@catch/web-ui";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileWarning,
  FolderSearch,
  RefreshCw,
  Search,
  UploadCloud,
  UserCheck,
} from "lucide-react";
import type {
  AdminClubClaimListRow,
  AdminClubClaimRequestDetails,
  ClubClaimDecision,
} from "../../../shared/types/adminTypes";
import {
  AdminButton,
  AdminDecisionFooterShell,
  AdminDetailScreenStack,
  AdminDirectoryScreenStack,
  AdminEditorPanel,
  AdminEditorSection,
  AdminFieldGrid,
  AdminForm,
  AdminLinkButton,
  AdminMetricCard,
  AdminMetricGrid,
  AdminRoadmapListItem,
  AdminTableRow,
  AdminToolbar,
  AdminWorkbenchNote,
  DataTable,
  EmptyState,
  PageHeader,
  Panel,
  QualityList,
  SearchField,
  StateRow,
  TableActionButton,
  AdminRowTitle,
  AdminTagRow,
} from "../../../shared/ui/AdminPrimitives";
import {type OrganizerPublishingController} from "../controllers/useOrganizerPublishingController";
import {type OrganizerClaimReviewController} from "../controllers/useOrganizerClaimReviewController";
import {organizerDetailPanels} from "./organizerDetailPanels";
import {brand} from "@catch/brand";

const defaultPublicSiteOrigin = brand.web.origin;
const publicSiteOrigin = String(
  import.meta.env.VITE_ADMIN_PUBLIC_SITE_ORIGIN ?? defaultPublicSiteOrigin
).replace(/\/+$/u, "");

function OrganizerDirectoryView({
  controller,
  needsPublishCount,
  publishedCount,
  readinessIssueCount,
}: {
  controller: OrganizerPublishingController;
  needsPublishCount: number;
  publishedCount: number;
  readinessIssueCount: number;
}) {
  return (
    <AdminDirectoryScreenStack>
      <AdminMetricGrid ariaLabel="Organizer publishing state">
        <AdminMetricCard
          caption="Current loaded result; not an all-time collection total."
          label="Loaded organizers"
          value={controller.rows.length}
        />
        <AdminMetricCard
          label="Needs review work"
          tone={needsPublishCount > 0 ? "attention" : "normal"}
          value={needsPublishCount}
        />
        <AdminMetricCard label="Published" value={publishedCount} />
        <AdminMetricCard
          label="Readiness blockers"
          tone={readinessIssueCount > 0 ? "attention" : "normal"}
          value={readinessIssueCount}
        />
      </AdminMetricGrid>

      <organizerDetailPanels.OrganizerDirectoryPanel controller={controller} />
    </AdminDirectoryScreenStack>
  );
}

function OrganizerClaimReviewWorkspace({
  controller,
  onBackToList = () => undefined,
}: {
  controller: OrganizerClaimReviewController;
  onBackToList?: () => void;
}) {
  if (controller.selectedRequestId) {
    return (
      <AdminDetailScreenStack>
        <AdminButton
          icon={<ArrowLeft size={15} strokeWidth={1.9} />}
          onClick={onBackToList}
        >
          All claims
        </AdminButton>
        <PageHeader
          actions={controller.selected ? (
            <CatchBadge label={controller.selected.status} />
          ) : null}
          title={controller.selected?.requesterName ?? controller.selectedRequestId}
        />
        {controller.selectedUnavailable ? (
          <Panel
            icon={<FileWarning size={18} strokeWidth={1.9} />}
            title="Claim unavailable"
            action="Retry available"
          >
            <EmptyState
              variant="workbench"
              icon={<FileWarning size={16} strokeWidth={1.9} />}
            >
              {controller.detailError ??
                "This claim was not returned by the direct detail read."}
            </EmptyState>
            <AdminButton
              disabled={controller.isDetailLoading}
              icon={<RefreshCw size={15} strokeWidth={1.9} />}
              onClick={() => void controller.refreshDetail()}
            >
              Retry claim read
            </AdminButton>
          </Panel>
        ) : (
          <>
            <OrganizerClaimEvidencePanel
              details={controller.details}
              isLoading={controller.isDetailLoading}
              selected={controller.selected}
            />
            {controller.isDetailLoading ? null : (
              <OrganizerClaimDecisionPanel controller={controller} />
            )}
          </>
        )}
      </AdminDetailScreenStack>
    );
  }

  return (
    <AdminDirectoryScreenStack>
      <AdminMetricGrid ariaLabel="Organizer claim queue scope" columns="auto">
        <AdminMetricCard label="Returned claims" value={controller.rows.length} />
        <AdminMetricCard
          caption="Search applies to the currently returned claims."
          label="Shown"
          value={controller.filteredRows.length}
        />
      </AdminMetricGrid>
      <Panel
        span={2}
        icon={<UserCheck size={18} strokeWidth={1.9} />}
        title="Organizer claim review"
        action={controller.isLoading ?
          "Loading" :
          `${controller.filteredRows.length} pending`}
      >
        <AdminToolbar>
          <SearchField
            ariaLabel="Search organizer claims"
            icon={<Search size={16} strokeWidth={1.8} />}
            onChange={controller.setQuery}
            placeholder="Search requester, organizer, role, contact"
            value={controller.query}
          />
          <AdminButton
            disabled={controller.isLoading}
            icon={<RefreshCw size={15} strokeWidth={1.9} />}
            onClick={() => void controller.refresh()}
          >
            Refresh claims
          </AdminButton>
        </AdminToolbar>
        <OrganizerClaimTable
          rows={controller.filteredRows}
          onSelect={controller.select}
        />
        <AdminWorkbenchNote>
          Source generated at {organizerDetailPanels.formatDateTime(controller.generatedAt)}.
          Exact queue totals and pagination require a dedicated list contract.
        </AdminWorkbenchNote>
      </Panel>
    </AdminDirectoryScreenStack>
  );
}

function OrganizerClaimTable({
  onSelect,
  rows,
}: {
  onSelect: (row: AdminClubClaimListRow) => void;
  rows: AdminClubClaimListRow[];
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        variant="workbench"
        icon={<CheckCircle2 size={16} strokeWidth={1.9} />}
      >
        No pending organizer claims match this filter.
      </EmptyState>
    );
  }
  return (
    <DataTable ariaLabel="Pending organizer claims" variant="workbench">
      <thead>
        <tr>
          <th>Requester</th>
          <th>Organizer</th>
          <th>Evidence</th>
          <th>Created</th>
          <th>Select</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <AdminTableRow key={row.requestId}>
            <td>
              <AdminRowTitle>
                <strong>{row.requesterName}</strong>
                <span>{row.requesterRole} · {row.contact ?? "no contact"}</span>
              </AdminRowTitle>
            </td>
            <td>{row.clubId}</td>
            <td>{row.proofCount} proof link{row.proofCount === 1 ? "" : "s"}</td>
            <td>{organizerDetailPanels.formatDateTime(row.createdAt)}</td>
            <td>
              <TableActionButton onClick={() => onSelect(row)}>
                Review
              </TableActionButton>
            </td>
          </AdminTableRow>
        ))}
      </tbody>
    </DataTable>
  );
}

function OrganizerClaimEvidencePanel({
  details,
  isLoading,
  selected,
}: {
  details: AdminClubClaimRequestDetails | null;
  isLoading: boolean;
  selected: AdminClubClaimListRow | null;
}) {
  return (
    <AdminEditorPanel
      icon={<FolderSearch size={18} strokeWidth={1.9} />}
      title="Claim evidence"
      action={isLoading ? "Loading" : details?.status ?? "No claim"}
    >
      {details ? (
        <QualityList>
          <StateRow label="Request" value={details.requestId} />
          <StateRow label="Requester uid" value={details.requesterUid} />
          <StateRow label="Requested role" value={details.requesterRole} />
          <StateRow label="Email" value={details.businessEmail} />
          <StateRow label="Phone" value={details.businessPhone} />
          <StateRow label="Message" value={details.message} />
          <StateRow
            label="Catch profile"
            value={details.requesterProfile.exists ?
              details.requesterProfile.profileComplete ? "complete" : "incomplete" :
              "missing"}
          />
          <StateRow label="Organizer" value={details.club.name ?? details.clubId} />
          <StateRow label="Claim state" value={details.club.claimState} />
          <StateRow label="Ownership" value={details.club.ownershipState} />
          <StateRow label="Current owner" value={details.club.ownerUserId} />
          <StateRow label="Canonical path" value={details.club.canonicalPath} />
          <StateRow
            label="Proof links"
            value={<OrganizerClaimProofLinks urls={details.proofUrls} />}
          />
        </QualityList>
      ) : (
        <EmptyState
          variant="workbench"
          icon={<Clock3 size={16} strokeWidth={1.9} />}
        >
          {isLoading ?
            "Loading claim evidence." : selected ?
            "Loading claim evidence." :
            "Select a pending claim to inspect its evidence."}
        </EmptyState>
      )}
    </AdminEditorPanel>
  );
}

function OrganizerClaimProofLinks({urls}: {urls: string[]}) {
  if (urls.length === 0) return "none";
  return (
    <AdminTagRow as="span">
      {urls.map((url, index) => (
        <AdminLinkButton
          href={url}
          key={url}
          rel="noreferrer"
          target="_blank"
        >
          Proof {index + 1}
        </AdminLinkButton>
      ))}
    </AdminTagRow>
  );
}

function OrganizerClaimDecisionPanel({
  controller,
}: {
  controller: OrganizerClaimReviewController;
}) {
  const isDeciding = controller.decisionInFlight !== null;
  const displayedIssue = controller.validationIssue ?? controller.approvalIssue;
  return (
    <AdminEditorPanel
      icon={<UploadCloud size={18} strokeWidth={1.9} />}
      title="Claim decision"
      action={controller.selected?.status ?? "No claim"}
    >
      {controller.selected ? (
        <AdminForm variant="publishing" onSubmit={(event) => event.preventDefault()}>
          <AdminEditorSection>
            <legend>Audited review note</legend>
            <AdminFieldGrid columns={1}>
              <CatchField
                recipe="input"
                title="Decision reason"
                onChanged={controller.setNote}
                maxLines={5}
                value={controller.note}
              />
            </AdminFieldGrid>
            {displayedIssue ? (
              <AdminRoadmapListItem>
                <FileWarning size={15} strokeWidth={1.9} />
                <span>{displayedIssue}</span>
              </AdminRoadmapListItem>
            ) : null}
          </AdminEditorSection>
          <AdminDecisionFooterShell sticky>
            <AdminWorkbenchNote>
              Approval transfers the canonical organizer claim through the
              audited backend. Rejection remains available when only approval
              blockers are present.
            </AdminWorkbenchNote>
            <AdminTagRow>
              <AdminButton
                disabled={isDeciding || Boolean(controller.approvalIssue)}
                icon={<CheckCircle2 size={15} strokeWidth={1.9} />}
                onClick={() => void controller.decide("approve")}
                variant="primary"
              >
                {decisionLabel(controller.decisionInFlight, "approve")}
              </AdminButton>
              <AdminButton
                disabled={isDeciding || Boolean(controller.rejectionIssue)}
                icon={<FileWarning size={15} strokeWidth={1.9} />}
                onClick={() => void controller.decide("reject")}
              >
                {decisionLabel(controller.decisionInFlight, "reject")}
              </AdminButton>
            </AdminTagRow>
          </AdminDecisionFooterShell>
        </AdminForm>
      ) : (
        <EmptyState
          variant="workbench"
          icon={<Clock3 size={16} strokeWidth={1.9} />}
        >
          Select a pending claim before deciding.
        </EmptyState>
      )}
    </AdminEditorPanel>
  );
}

function decisionLabel(
  inFlight: ClubClaimDecision | null,
  decision: ClubClaimDecision
): string {
  if (inFlight !== decision) return decision === "approve" ? "Approve" : "Reject";
  return decision === "approve" ? "Approving" : "Rejecting";
}

export const organizerDirectoryPanels = {
  OrganizerDirectoryView,
  OrganizerClaimReviewWorkspace,
  OrganizerClaimTable,
  OrganizerClaimEvidencePanel,
  OrganizerClaimProofLinks,
  OrganizerClaimDecisionPanel,
  decisionLabel,
};
