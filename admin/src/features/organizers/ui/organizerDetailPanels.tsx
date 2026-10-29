import {CatchBadge, CatchField} from "@catch/web-ui";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Database,
  ExternalLink,
  FileWarning,
  FolderSearch,
  RefreshCw,
  Save,
  Search,
  Smartphone,
  Settings2,
  UploadCloud,
  Users,
} from "lucide-react";
import type {
  AdminClubDetails,
  AdminClubListRow,
  OrganizerAppVisibility,
  OrganizerType,
  OrganizerPublishStatus,
  OrganizerSourceConfidence,
  OrganizerVerificationStatus,
} from "../../../shared/types/adminTypes";
import {
  AdminButton,
  AdminChecklistCopy,
  AdminChecklistHeader,
  AdminChecklistStack,
  AdminDetailScreenStack,
  AdminDecisionFooterShell,
  AdminDiffList,
  AdminDiffRow,
  AdminEditorGrid,
  AdminEditorPanel,
  AdminEditorSection,
  AdminFieldGrid,
  AdminForm,
  AdminLinkButton,
  AdminMutedCell,
  AdminPublishingLoadbar,
  AdminRoadmapList,
  AdminRoadmapListItem,
  AdminStatusGrid,
  AdminSurfacePreview,
  AdminTableRow,
  AdminToolbar,
  AdminWorkbenchStack,
  AdminWorkbenchNote,
  AlertRow,
  CheckboxField,
  DataTable,
  EmptyState,
  PageHeader,
  Panel,
  QualityList,
  SearchField,
  SegmentedControl,
  selectOptions,
  StateRow,
  TableActionButton,
  AdminRowTitle,
  AdminTagRow,
} from "../../../shared/ui/AdminPrimitives";
import {
  countBlockingIssues,
  countDiffRows,
  organizerNeedsPublish,
  type OrganizerPublishingController,
  type OrganizerPublishingFilter,
} from "../controllers/useOrganizerPublishingController";
import type {
  OrganizerDiffRow,
  OrganizerPublishingFormState,
  OrganizerValidationIssue,
  PublishChecklistState,
} from "../controllers/organizerPublishingHelpers";
import {
  countIncompletePublishChecklist,
  organizerAppVisibilityOptions,
  organizerLaunchMarketOptions,
  organizerPublishStatusOptions,
  organizerPublishingFieldIds,
  organizerSourceConfidenceOptions,
  organizerTypeLabel,
  organizerTypeOptions,
  organizerVerificationStatusOptions,
  publishChecklistItems,
  updateOrganizerLaunchMarket,
} from "../controllers/organizerPublishingHelpers";

import {organizerLinksPanels} from "./organizerLinksEditor";

const {OrganizerLinksEditor} = organizerLinksPanels;
const defaultPublicSiteOrigin = "https://catchdates.com";
const publicSiteOrigin = String(
  import.meta.env.VITE_ADMIN_PUBLIC_SITE_ORIGIN ?? defaultPublicSiteOrigin
).replace(/\/+$/u, "");

function OrganizerDetailView({
  controller,
}: {
  controller: OrganizerPublishingController;
}) {
  const title =
    controller.club?.name ||
    controller.form?.name ||
    controller.clubId ||
    "Organizer";
  return (
    <AdminDetailScreenStack>
      <PageHeader
        actions={
          <AdminButton
            icon={<ArrowLeft size={15} strokeWidth={1.9} />}
            onClick={controller.backToList}
          >
            Directory
          </AdminButton>
        }
        title={title}
      />
      <OrganizerDetailSummary controller={controller} />
      <OrganizerEditor
        checklist={controller.checklist}
        club={controller.club}
        clubId={controller.clubId}
        completeChecklist={controller.completeChecklist}
        diffRows={controller.diffRows}
        form={controller.form}
        isDetailLoading={controller.isDetailLoading}
        isPublishing={controller.isPublishing}
        isSaving={controller.isSaving}
        publishingIssues={controller.publishingIssues}
        onChecklistChange={controller.setChecklist}
        onClubIdChange={controller.setClubId}
        onFormChange={controller.setForm}
        onLoad={() => void controller.selectOrganizer(controller.clubId)}
        onPublish={() => void controller.saveAndPublish()}
        onSave={() => void controller.save()}
        validationIssues={controller.validationIssues}
      />
    </AdminDetailScreenStack>
  );
}

function OrganizerDirectoryPanel({
  controller,
}: {
  controller: OrganizerPublishingController;
}) {
  return (
    <Panel
      span={2}
      icon={<Users size={18} strokeWidth={1.9} />}
      title="Canonical organizer directory"
      action={
        controller.isListLoading ?
          "Loading" :
          `${controller.filteredRows.length} shown`
      }
    >
      <AdminToolbar>
        <SegmentedControl<OrganizerPublishingFilter>
          ariaLabel="Organizer filters"
          options={[
            {id: "launchCities", label: "Indore + Mumbai"},
            {id: "all", label: "All"},
            {id: "needsPublish", label: "Needs review"},
            {id: "published", label: "Published"},
            {id: "appHidden", label: "App hidden"},
            {id: "routeIssues", label: "Route issues"},
            {id: "searchIssues", label: "Search issues"},
          ]}
          value={controller.filter}
          onChange={controller.setFilter}
        />
        <SearchField
          ariaLabel="Search canonical organizers"
          icon={<Search size={16} strokeWidth={1.8} />}
          onChange={controller.setQuery}
          placeholder="Search name, id, path, city, status"
          value={controller.query}
        />
        <AdminButton
          disabled={controller.isListLoading}
          icon={<RefreshCw size={15} strokeWidth={1.9} />}
          onClick={() => void controller.refreshList()}
        >
          Refresh
        </AdminButton>
      </AdminToolbar>
      <OrganizerDirectoryTable
        rows={controller.filteredRows}
        selectedClubId={controller.club?.clubId ?? controller.clubId}
        onSelect={controller.selectOrganizer}
      />
      <AdminWorkbenchNote>
        {controller.filteredRows.length} shown from {controller.rows.length} loaded
        organizers. Source generated at {formatDateTime(controller.listGeneratedAt)}.
      </AdminWorkbenchNote>
    </Panel>
  );
}

function OrganizerDetailSummary({
  controller,
}: {
  controller: OrganizerPublishingController;
}) {
  const club = controller.club;
  const form = controller.form;
  const saveBlockers = countBlockingIssues(controller.validationIssues);
  const publishBlockers = countBlockingIssues(controller.publishingIssues);
  const readinessIssues = [
    ...controller.validationIssues,
    ...controller.publishingIssues,
  ].filter((issue, index, issues) =>
    issues.findIndex((candidate) => candidate.id === issue.id) === index
  );
  const blockerCount = countBlockingIssues(readinessIssues);
  const checklistTaskCount =
    countIncompletePublishChecklist(controller.checklist);
  const remainingTaskCount = blockerCount + checklistTaskCount;
  const isReady = remainingTaskCount === 0;
  return (
    <Panel
      span={2}
      icon={<Users size={18} strokeWidth={1.9} />}
      title="Readiness"
      action={isReady ? "Ready" : `${remainingTaskCount} tasks`}
    >
      <AlertRow
        icon={isReady ?
          <CheckCircle2 size={16} strokeWidth={1.9} /> :
          <FileWarning size={16} strokeWidth={1.9} />}
        title={isReady ?
          "Ready for operator review" :
          `${remainingTaskCount} steps before publishing`}
        tone={isReady ? "neutral" : "warning"}
      >
        App visibility, public-web publication, and search indexing are separate
        states. Required fields and the evidence checklist are shown beside the
        editor; each field blocker links to its control.
      </AlertRow>
      <AdminStatusGrid>
        <StateRow label="Document" value={club?.clubId ?? controller.clubId} />
        <StateRow
          label="App · member visibility"
          value={form?.appVisibility ?? club?.appVisibility}
        />
        <StateRow
          label="Public web · publication"
          value={form?.publishStatus ?? club?.publicPage.publishStatus}
        />
        <StateRow label="Public web · indexing" value={club?.publicPage.indexStatus} />
        <StateRow label="Ownership claim" value={club?.claimState} />
        <StateRow label="Ownership state" value={club?.ownershipState} />
        <StateRow
          label="Verification"
          value={club?.provenance.verificationStatus}
        />
        <StateRow
          label="Pending field changes"
          value={`${controller.diffRows.length} pending`}
        />
        <StateRow label="Save blockers" value={saveBlockers} />
        <StateRow label="Publish blockers" value={publishBlockers} />
        <StateRow label="Checklist tasks" value={checklistTaskCount} />
      </AdminStatusGrid>
    </Panel>
  );
}

function OrganizerDirectoryTable({
  onSelect,
  rows,
  selectedClubId,
}: {
  onSelect: (clubId: string) => void;
  rows: AdminClubListRow[];
  selectedClubId: string;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        variant="workbench"
        icon={<FolderSearch size={16} strokeWidth={1.9} />}
      >
        No canonical organizers match this filter.
      </EmptyState>
    );
  }
  return (
    <DataTable ariaLabel="Organizer directory" variant="workbench">
      <thead>
        <tr>
          <th>Organizer</th>
          <th>City</th>
          <th>Public page</th>
          <th>App / claim</th>
          <th>Readiness</th>
          <th>Select</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <AdminTableRow key={row.clubId} selected={selectedClubId === row.clubId}>
            <td>
              <AdminRowTitle>
                <strong>{row.name}</strong>
                <span>{row.clubId}</span>
              </AdminRowTitle>
            </td>
            <td>
              <AdminRowTitle compact>
                <span>{row.cityName ?? "Unknown city"}</span>
                <span>{row.citySlug ?? "No city slug"}</span>
              </AdminRowTitle>
            </td>
            <td>
              <AdminRowTitle compact>
                <span>{row.canonicalPath ?? "No public path"}</span>
                <span>{row.publishStatus ?? "no status"} / {row.indexStatus ?? "no index"}</span>
              </AdminRowTitle>
            </td>
            <td>
              <AdminTagRow>
                <CatchBadge label={row.appVisibility ?? "unset"} />
                <CatchBadge label={row.claimState ?? "no claim"} />
              </AdminTagRow>
            </td>
            <td>
              <AdminTagRow>
                <CatchBadge label={row.routeStatus} />
                <CatchBadge label={row.routeReservationStatus} />
                <CatchBadge label={row.searchIndexStatus} />
                <CatchBadge label={row.sourceConfidence ?? "source unset"} />
                <CatchBadge label={row.verificationStatus ?? "verification unset"} />
                <CatchBadge label={organizerNeedsPublish(row) ? "needs work" : "ready"} />
              </AdminTagRow>
            </td>
            <td>
              <TableActionButton onClick={() => onSelect(row.clubId)}>
                {selectedClubId === row.clubId ? "Selected" : "Open"}
              </TableActionButton>
            </td>
          </AdminTableRow>
        ))}
      </tbody>
    </DataTable>
  );
}

function OrganizerEditor({
  checklist,
  club,
  clubId,
  completeChecklist,
  diffRows,
  form,
  isDetailLoading,
  isPublishing,
  isSaving,
  onChecklistChange,
  onClubIdChange,
  onFormChange,
  onLoad,
  onPublish,
  onSave,
  publishingIssues,
  validationIssues,
}: {
  checklist: PublishChecklistState;
  club: AdminClubDetails | null;
  clubId: string;
  completeChecklist: boolean;
  diffRows: OrganizerDiffRow[];
  form: OrganizerPublishingFormState | null;
  isDetailLoading: boolean;
  isPublishing: boolean;
  isSaving: boolean;
  onChecklistChange: (checklist: PublishChecklistState) => void;
  onClubIdChange: (clubId: string) => void;
  onFormChange: (form: OrganizerPublishingFormState | null) => void;
  onLoad: () => void;
  onPublish: () => void;
  onSave: () => void;
  publishingIssues: OrganizerValidationIssue[];
  validationIssues: OrganizerValidationIssue[];
}) {
  const update = <K extends keyof OrganizerPublishingFormState>(
    key: K,
    value: OrganizerPublishingFormState[K]
  ) => {
    if (!form) return;
    onFormChange({...form, [key]: value});
  };
  const updateLaunchMarket = (marketId: string) => {
    if (!form) return;
    onFormChange(updateOrganizerLaunchMarket(form, marketId));
  };
  const targetIssue = (targetId: string) =>
    publishingIssues.find((issue) =>
      issue.severity === "blocker" && issue.targetId === targetId)?.detail;
  const publishBlockerCount = countBlockingIssues(publishingIssues);
  const checklistTaskCount = countIncompletePublishChecklist(checklist);
  const remainingPublishTaskCount =
    publishBlockerCount + checklistTaskCount;
  const publishDisabledReason =
    !form ? "Load an organizer before publishing." :
    remainingPublishTaskCount > 0 ?
      `${publishBlockerCount} field blocker${
        publishBlockerCount === 1 ? "" : "s"
      } · ${checklistTaskCount} checklist item${
        checklistTaskCount === 1 ? "" : "s"
      } remaining.` :
    isSaving ? "Wait for the current save to finish." :
    isPublishing ? "Organizer publish is already in progress." :
    undefined;
  const canPublish =
    Boolean(form) &&
    completeChecklist &&
    publishBlockerCount === 0 &&
    !isSaving &&
    !isPublishing;
  return (
    <>
    <AdminEditorGrid>
      <AdminEditorPanel
        icon={<Settings2 size={18} strokeWidth={1.9} />}
        title="Canonical organizer record"
        action={club?.clubId ?? "No organizer loaded"}
      >
        <AdminPublishingLoadbar>
          <CatchField
            recipe="input"
            title="Document ID"
            onChanged={onClubIdChange}
            value={clubId}
          />
          <AdminButton
            disabled={isDetailLoading}
            icon={<FolderSearch size={15} strokeWidth={1.9} />}
            onClick={onLoad}
          >
            {isDetailLoading ? "Loading" : "Load"}
          </AdminButton>
        </AdminPublishingLoadbar>

        {form ? (
          <AdminForm variant="publishing">
            <AdminEditorSection>
              <legend>Identity</legend>
              <AdminFieldGrid columns={2}>
                <CatchField
                  recipe="input"
                  id={organizerPublishingFieldIds.name}
                  errorText={targetIssue(organizerPublishingFieldIds.name)}
                  title="Name"
                  onChanged={(value) => update("name", value)}
                  value={form.name}
                />
                <CatchField
                  recipe="select"
                  title="Organizer type"
                  onChanged={(value) => update("organizerType", (value ?? "") as OrganizerType)}
                  {...selectOptions([...organizerTypeOptions])}
                  value={form.organizerType}
                />
                <CatchField
                  recipe="input"
                  title="Public listing descriptor (optional)"
                  onChanged={(value) => update("publicCategoryLabel", value)}
                  value={form.publicCategoryLabel}
                />
                <CatchField
                  recipe="input"
                  id={organizerPublishingFieldIds.area}
                  errorText={targetIssue(organizerPublishingFieldIds.area)}
                  title="Verified area / locality"
                  onChanged={(value) => update("area", value)}
                  value={form.area}
                />
              </AdminFieldGrid>
              <AdminWorkbenchNote>
                Organizer type is the governed classification. The public
                listing descriptor is optional reader-facing copy, not a
                grouping category. Leave locality blank until a source
                establishes an area within the launch market.
              </AdminWorkbenchNote>
              <AdminFieldGrid columns={1}>
                <CatchField
                  recipe="input"
                  id={organizerPublishingFieldIds.description}
                  errorText={targetIssue(
                    organizerPublishingFieldIds.description
                  )}
                  title="Description"
                  onChanged={(value) => update("description", value)}
                  maxLines={4}
                  value={form.description}
                />
                <CatchField
                  recipe="input"
                  title="Tags"
                  onChanged={(value) => update("tagsText", value)}
                  maxLines={4}
                  value={form.tagsText}
                />
              </AdminFieldGrid>
            </AdminEditorSection>

            <AdminEditorSection>
              <legend>Ownership and contact</legend>
              <QualityList>
                <StateRow label="Claim state" value={club?.claimState ?? "Unavailable"} />
                <StateRow label="Ownership state" value={club?.ownershipState ?? "Unavailable"} />
              </QualityList>
              <AdminFieldGrid columns={1}>
                <CatchField
                  recipe="select"
                  id={organizerPublishingFieldIds.launchMarket}
                  errorText={targetIssue(
                    organizerPublishingFieldIds.launchMarket
                  )}
                  title="Launch market"
                  onChanged={(value) => updateLaunchMarket(value ?? "")}
                  {...selectOptions([
                    ...(!organizerLaunchMarketOptions.some(
                      (option) => option.value === form.location
                    ) && form.location ?
                      [{
                        value: form.location,
                        label: `Current unsupported market · ${form.location}`,
                      }] :
                      []),
                    ...organizerLaunchMarketOptions,
                  ])}
                  value={form.location}
                />
              </AdminFieldGrid>
              <AdminWorkbenchNote>
                This governed choice sets the canonical market, city, region,
                country, and public page city slug together.
              </AdminWorkbenchNote>
              <AdminStatusGrid compact>
                <StateRow label="Market ID" value={form.location} />
                <StateRow label="City" value={form.cityName} />
                <StateRow label="Region" value={form.regionName} />
                <StateRow
                  label="Country"
                  value={[form.countryName, form.countryCode]
                    .filter(Boolean).join(" · ")}
                />
                <StateRow
                  label="Page city slug"
                  value={form.publicPageCitySlug}
                />
              </AdminStatusGrid>
              <AdminFieldGrid columns={3}>
                <CatchField
                  recipe="input"
                  title="Instagram"
                  onChanged={(value) => update("instagramHandle", value)}
                  value={form.instagramHandle}
                />
                <CatchField
                  recipe="input"
                  id={organizerPublishingFieldIds.email}
                  errorText={targetIssue(organizerPublishingFieldIds.email)}
                  title="Email"
                  onChanged={(value) => update("email", value)}
                  value={form.email}
                  keyboardType="emailAddress"
                />
                <CatchField
                  recipe="input"
                  title="Phone"
                  onChanged={(value) => update("phoneNumber", value)}
                  value={form.phoneNumber}
                  keyboardType="phone"
                />
              </AdminFieldGrid>
            </AdminEditorSection>

            <AdminEditorSection>
              <legend>Routes and visibility</legend>
              <AlertRow
                icon={<ExternalLink size={16} strokeWidth={1.9} />}
                title="App and public web are independent"
                tone="neutral"
              >
                App visibility controls member discovery. Public-web publication
                is a separate state, and search indexing changes only through
                Save + publish.
              </AlertRow>
              <AdminFieldGrid columns={2}>
                <CatchField
                  recipe="select"
                  title="App visibility"
                  onChanged={(value) => update("appVisibility", (value ?? "") as OrganizerAppVisibility)}
                  {...selectOptions([...organizerAppVisibilityOptions])}
                  value={form.appVisibility}
                />
                <CatchField
                  recipe="input"
                  id={organizerPublishingFieldIds.publicPageSlug}
                  errorText={targetIssue(
                    organizerPublishingFieldIds.publicPageSlug
                  )}
                  title="Slug"
                  onChanged={(value) => update("publicPageSlug", value)}
                  pattern="[a-z0-9-]+"
                  value={form.publicPageSlug}
                />
                <CatchField
                  recipe="input"
                  title="Page city slug"
                  inputMode="readOnly"
                  value={form.publicPageCitySlug}
                />
                <CatchField
                  recipe="input"
                  id={organizerPublishingFieldIds.canonicalPath}
                  errorText={targetIssue(
                    organizerPublishingFieldIds.canonicalPath
                  )}
                  title="Canonical path"
                  onChanged={(value) => update("canonicalPath", value)}
                  value={form.canonicalPath}
                />
                <CatchField
                  recipe="select"
                  title="Public-web publication"
                  onChanged={(value) => update("publishStatus", (value ?? "") as OrganizerPublishStatus)}
                  {...selectOptions([...organizerPublishStatusOptions])}
                  value={form.publishStatus}
                />
                <StateRow
                  label="Search indexing"
                  value={`${club?.publicPage.indexStatus ?? "Unavailable"} · changed only by Save + publish`}
                />
                <CatchField
                  recipe="input"
                  id={organizerPublishingFieldIds.imageUrl}
                  errorText={targetIssue(organizerPublishingFieldIds.imageUrl)}
                  title="Image URL"
                  onChanged={(value) => update("imageUrl", value)}
                  value={form.imageUrl}
                  keyboardType="url"
                />
                <CatchField
                  recipe="input"
                  id={organizerPublishingFieldIds.logoUrl}
                  errorText={targetIssue(organizerPublishingFieldIds.logoUrl)}
                  title="Logo URL"
                  onChanged={(value) => update("profileImageUrl", value)}
                  value={form.profileImageUrl}
                  keyboardType="url"
                />
                <CatchField
                  recipe="input"
                  title="SEO title"
                  onChanged={(value) => update("seoTitle", value)}
                  value={form.seoTitle}
                />
                <CatchField
                  recipe="input"
                  title="SEO description"
                  onChanged={(value) => update("seoDescription", value)}
                  value={form.seoDescription}
                />
              </AdminFieldGrid>
            </AdminEditorSection>

            <AdminEditorSection>
              <legend>Member-facing fields</legend>
              <AdminFieldGrid columns={1}>
                <CatchField
                  recipe="input"
                  id={organizerPublishingFieldIds.headline}
                  errorText={targetIssue(organizerPublishingFieldIds.headline)}
                  title="Headline"
                  onChanged={(value) => update("headline", value)}
                  value={form.headline}
                />
                <CatchField
                  recipe="input"
                  id={organizerPublishingFieldIds.summary}
                  errorText={targetIssue(organizerPublishingFieldIds.summary)}
                  title="Summary"
                  onChanged={(value) => update("summary", value)}
                  maxLines={5}
                  value={form.summary}
                />
                <CatchField
                  recipe="input"
                  title="Source summary"
                  onChanged={(value) => update("sourceSummary", value)}
                  maxLines={4}
                  value={form.sourceSummary}
                />
                <CatchField
                  recipe="input"
                  title="Formats"
                  onChanged={(value) => update("formatsText", value)}
                  maxLines={5}
                  value={form.formatsText}
                />
              </AdminFieldGrid>
            </AdminEditorSection>

            <OrganizerLinksEditor
              links={form.ownerLinks}
              onChange={(links) => update("ownerLinks", links)}
              targetIssue={targetIssue}
            />

            <AdminEditorSection>
              <legend>Evidence and review note</legend>
              <AdminFieldGrid columns={3}>
                <CatchField
                  recipe="select"
                  id={organizerPublishingFieldIds.sourceConfidence}
                  errorText={targetIssue(
                    organizerPublishingFieldIds.sourceConfidence
                  )}
                  title="Source confidence"
                  onChanged={(value) => update("sourceConfidence", (value ?? "") as OrganizerSourceConfidence)}
                  {...selectOptions([...organizerSourceConfidenceOptions])}
                  value={form.sourceConfidence}
                />
                <CatchField
                  recipe="select"
                  id={organizerPublishingFieldIds.verificationStatus}
                  errorText={targetIssue(
                    organizerPublishingFieldIds.verificationStatus
                  )}
                  title="Verification"
                  onChanged={(value) => update("verificationStatus", (value ?? "") as OrganizerVerificationStatus)}
                  {...selectOptions([...organizerVerificationStatusOptions])}
                  value={form.verificationStatus}
                />
                <CatchField
                  recipe="input"
                  id={organizerPublishingFieldIds.reviewNote}
                  errorText={targetIssue(
                    organizerPublishingFieldIds.reviewNote
                  )}
                  title="Review note"
                  onChanged={(value) => update("reviewNote", value)}
                  maxLines={3}
                  value={form.reviewNote}
                />
              </AdminFieldGrid>
            </AdminEditorSection>
          </AdminForm>
        ) : (
          <EmptyState
            variant="editor"
            icon={<Clock3 size={16} strokeWidth={1.9} />}
          >
            Load an organizer document to review canonical fields.
          </EmptyState>
        )}
      </AdminEditorPanel>

      <PublishingSidePanel
        checklist={checklist}
        club={club}
        diffRows={diffRows}
        form={form}
        onChecklistChange={onChecklistChange}
        publishingIssues={publishingIssues}
        validationIssues={validationIssues}
      />
    </AdminEditorGrid>
    <AdminDecisionFooterShell
      layout="publishing-actions"
      sticky
    >
      <div>
        <strong>{diffRows.length} pending field change{diffRows.length === 1 ? "" : "s"}</strong>
        <span>{publishDisabledReason ?? "Ready for save or publish review."}</span>
      </div>
      {remainingPublishTaskCount > 0 && (
        <AdminButton
          onClick={() => focusOrganizerPublishingTarget(
            "organizer-publishing-readiness"
          )}
        >
          Review {remainingPublishTaskCount} tasks
        </AdminButton>
      )}
      <AdminButton
        disabled={!form || isSaving}
        icon={<Save size={15} strokeWidth={1.9} />}
        onClick={onSave}
      >
        {isSaving ? "Saving" : "Save changes"}
      </AdminButton>
      <AdminButton
        disabled={!canPublish}
        icon={<UploadCloud size={15} strokeWidth={1.9} />}
        onClick={onPublish}
        title={publishDisabledReason}
        variant="primary"
      >
        {isPublishing ? "Publishing" : "Save + publish"}
      </AdminButton>
    </AdminDecisionFooterShell>
    </>
  );
}

function PublishingSidePanel({
  checklist,
  club,
  diffRows,
  form,
  onChecklistChange,
  publishingIssues,
  validationIssues,
}: {
  checklist: PublishChecklistState;
  club: AdminClubDetails | null;
  diffRows: OrganizerDiffRow[];
  form: OrganizerPublishingFormState | null;
  onChecklistChange: (checklist: PublishChecklistState) => void;
  publishingIssues: OrganizerValidationIssue[];
  validationIssues: OrganizerValidationIssue[];
}) {
  const readinessIssues = [...validationIssues, ...publishingIssues].filter(
    (issue, index, rows) => rows.findIndex((item) => item.id === issue.id) === index
  );
  const blockerCount = countBlockingIssues(readinessIssues);
  const checklistTaskCount = countIncompletePublishChecklist(checklist);
  const remainingTaskCount = blockerCount + checklistTaskCount;
  return (
    <AdminWorkbenchStack alignStart>
      <div id="organizer-publishing-readiness">
        <Panel
          icon={<FileWarning size={18} strokeWidth={1.9} />}
          title="Readiness and blockers"
          action={remainingTaskCount === 0 ?
            "Ready" :
            `${remainingTaskCount} tasks`}
        >
        <AlertRow
          icon={remainingTaskCount === 0 ?
            <CheckCircle2 size={16} strokeWidth={1.9} /> :
            <FileWarning size={16} strokeWidth={1.9} />}
          title={remainingTaskCount === 0 ?
            "Ready for final operator review" :
            `${blockerCount} fields · ${checklistTaskCount} checks remaining`}
          tone={remainingTaskCount === 0 ? "neutral" : "warning"}
        >
          Fix required fields first, then confirm each evidence check. Selecting
          a blocker moves focus to the owning control.
        </AlertRow>
        <IssueList
          issues={readinessIssues}
          onResolve={focusOrganizerPublishingIssue}
        />
        <AdminChecklistHeader
          label="Publication checklist"
          detail={<>{publishChecklistItems.length - checklistTaskCount} of {
            publishChecklistItems.length
          } complete</>}
        />
        <AdminChecklistStack>
          {publishChecklistItems.map((item) => (
            <CheckboxField
              checked={checklist[item.key]}
              key={item.key}
              label={(
                <AdminChecklistCopy
                  detail={item.detail}
                  label={item.label}
                />
              )}
              onChange={(checked) =>
                onChecklistChange({...checklist, [item.key]: checked})}
            />
          ))}
        </AdminChecklistStack>
        </Panel>
      </div>
      <Panel
        icon={<Database size={18} strokeWidth={1.9} />}
        title="Before / after diff"
        action={`${countDiffRows(diffRows)} changes`}
      >
        <DiffList rows={diffRows} />
      </Panel>
      <Panel
        icon={<Smartphone size={18} strokeWidth={1.9} />}
        title="App listing preview"
        action={form?.appVisibility ?? "No app"}
      >
        {form ? (
          <AppListingPreview club={club} form={form} />
        ) : (
          <EmptyState icon={<Clock3 size={16} strokeWidth={1.9} />}>
            No organizer loaded
          </EmptyState>
        )}
      </Panel>
      <Panel
        icon={<ExternalLink size={18} strokeWidth={1.9} />}
        title="Public page preview"
        action={club?.publicPage.indexStatus ?? "No page"}
      >
        {form ? (
          <QualityList>
            <StateRow label="Claim" value={club?.claimState} />
            <StateRow label="Ownership" value={club?.ownershipState} />
            <StateRow label="Canonical" value={form.canonicalPath} />
            <StateRow label="Public-web publication" value={form.publishStatus} />
            <StateRow label="Search indexing" value={club?.publicPage.indexStatus} />
            <StateRow label="Robots" value={club?.publicPage.robots} />
            {form.canonicalPath && (
              <AdminLinkButton
                href={publicPreviewHref(form.canonicalPath)}
                rel="noreferrer"
                target="_blank"
              >
                Public preview
              </AdminLinkButton>
            )}
          </QualityList>
        ) : (
          <EmptyState icon={<Clock3 size={16} strokeWidth={1.9} />}>
            No organizer loaded
          </EmptyState>
        )}
      </Panel>
    </AdminWorkbenchStack>
  );
}

function publicPreviewHref(canonicalPath: string): string {
  const path = canonicalPath.startsWith("/") ?
    canonicalPath :
    `/${canonicalPath}`;
  return `${publicSiteOrigin}${path}`;
}

function AppListingPreview({
  club,
  form,
}: {
  club: AdminClubDetails | null;
  form: OrganizerPublishingFormState;
}) {
  const location = [form.cityName || form.area, form.regionName]
    .filter(Boolean)
    .join(", ");
  const tags = [...new Set([
    ...splitPreviewList(form.tagsText),
    ...splitPreviewList(form.formatsText),
  ])].slice(0, 6);
  return (
    <QualityList>
      <StateRow
        label="Record ID"
        value={club?.clubId}
      />
      <StateRow label="App visibility" value={form.appVisibility} />
      <StateRow label="Image" value={form.imageUrl ? "imageUrl set" : "missing"} />
      <StateRow
        label="Logo"
        value={form.profileImageUrl ? "profileImageUrl set" : "missing"}
      />
      <AdminSurfacePreview>
        <strong>{form.name || "Untitled organizer"}</strong>
        <span>
          {[
            form.publicCategoryLabel || organizerTypeLabel(form.organizerType),
            location || form.location,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
        <span>{form.headline || form.summary || form.description}</span>
        {tags.length > 0 && (
          <AdminTagRow>
            {tags.map((tag) => (
              <CatchBadge key={tag} label={tag} />
            ))}
          </AdminTagRow>
        )}
      </AdminSurfacePreview>
    </QualityList>
  );
}

function splitPreviewList(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function IssueList({
  issues,
  onResolve,
}: {
  issues: OrganizerValidationIssue[];
  onResolve: (issue: OrganizerValidationIssue) => void;
}) {
  if (issues.length === 0) {
    return (
      <QualityList>
        <StateRow label="Ready" value="No validation blockers" />
      </QualityList>
    );
  }
  return (
    <AdminRoadmapList>
      {issues.map((issue) => (
        <AdminRoadmapListItem
          actionable
          key={issue.id}
          tone={issue.severity}
        >
          <FileWarning size={15} strokeWidth={1.9} />
          <span>
            <strong>{issue.label}:</strong> {issue.detail}
          </span>
          {issue.targetId && (
            <AdminButton
              onClick={() => onResolve(issue)}
              variant="link"
            >
              Go to field
            </AdminButton>
          )}
        </AdminRoadmapListItem>
      ))}
    </AdminRoadmapList>
  );
}

function focusOrganizerPublishingIssue(issue: OrganizerValidationIssue) {
  if (!issue.targetId) return;
  focusOrganizerPublishingTarget(issue.targetId);
}

function focusOrganizerPublishingTarget(targetId: string) {
  const target = document.getElementById(targetId);
  if (!target) return;
  target.scrollIntoView({behavior: "smooth", block: "center"});
  if (target instanceof HTMLElement) target.focus({preventScroll: true});
}

function DiffList({rows}: {rows: OrganizerDiffRow[]}) {
  if (rows.length === 0) {
    return (
      <QualityList>
        <StateRow label="Changes" value="No unsaved changes" />
      </QualityList>
    );
  }
  return (
    <AdminDiffList>
      {rows.slice(0, 12).map((row) => (
        <AdminDiffRow
          key={row.field}
          field={row.field}
          before={row.before}
          after={row.after}
        />
      ))}
      {rows.length > 12 && (
        <AdminMutedCell>{rows.length - 12} more changes</AdminMutedCell>
      )}
    </AdminDiffList>
  );
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "none";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export const organizerDetailPanels = {
  OrganizerDetailView,
  OrganizerDirectoryPanel,
  OrganizerDetailSummary,
  OrganizerDirectoryTable,
  OrganizerEditor,
  PublishingSidePanel,
  publicPreviewHref,
  AppListingPreview,
  splitPreviewList,
  IssueList,
  DiffList,
  formatDateTime,
};
