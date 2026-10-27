import {CatchBadge, CatchField} from "@catch/web-ui";
import {useState} from "react";
import {
  ChevronRight,
  Clock3,
  FileWarning,
  PauseCircle,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {
  AdminButton,
  AdminEditorGrid,
  AdminProfilePhotoGrid,
  AdminTagList,
  AdminToolbar,
  AdminWorkbenchNote,
  AdminWorkbenchStack,
  AlertRow,
  CheckboxField,
  EmptyState,
  Panel,
  QualityList,
  SegmentedControl,
  StateRow,
  StatusBanner,
} from "../../../shared/ui/AdminPrimitives";
import {
  type CrossPathsShowcaseCandidate,
  type CrossPathsShowcaseController,
  type CrossPathsShowcaseFilter,
  useCrossPathsShowcaseController,
} from "../controllers/useCrossPathsShowcaseController";

export function CrossPathsShowcaseScreen({
  canDecide,
  onError,
  onNotice,
}: {
  canDecide: boolean;
  onError: (message: string | null) => void;
  onNotice: (message: string | null) => void;
}) {
  const controller = useCrossPathsShowcaseController({onError, onNotice});
  return (
    <CrossPathsShowcaseWorkspace
      canDecide={canDecide}
      controller={controller}
    />
  );
}

export function CrossPathsShowcaseWorkspace({
  canDecide,
  controller,
}: {
  canDecide: boolean;
  controller: CrossPathsShowcaseController;
}) {
  return (
    <AdminWorkbenchStack>
      <StatusBanner
        icon={<ShieldCheck size={17} strokeWidth={1.9} />}
        tone="success"
      >
        This queue uses completeness, media integrity, and moderation checks.
        It never stores or displays an attractiveness score.
      </StatusBanner>
      <StatusBanner
        icon={<ShieldCheck size={17} strokeWidth={1.9} />}
        tone="success"
      >
        Mumbai pilot only. This queue is limited to public profiles whose
        canonical market is in-mh-mumbai; eligibility never implies consent.
      </StatusBanner>
      <Panel
        action={controller.generatedAt ?
          `Generated ${formatDateTime(controller.generatedAt)}` :
          "server-owned"}
        icon={<UserRound size={18} strokeWidth={1.9} />}
        span={2}
        title="Cross Paths showcase review"
      >
        <AdminWorkbenchNote>
          Automated checks establish whether a public profile is complete and
          displayable. A reviewer separately confirms a clear primary portrait,
          current identity, and the launch policy. Any later public-profile edit
          changes the fingerprint and sends an approval back to review.
        </AdminWorkbenchNote>
        <AdminToolbar>
          <SegmentedControl<CrossPathsShowcaseFilter>
            ariaLabel="Cross Paths showcase status"
            mobileLayout="content"
            onChange={controller.setFilter}
            options={[
              {id: "needsReview", label: "Needs review"},
              {id: "eligible", label: "Eligible"},
              {id: "paused", label: "Paused"},
              {id: "all", label: "All"},
            ]}
            value={controller.filter}
          />
          <AdminButton
            disabled={controller.isLoading || controller.isMutating}
            icon={<RefreshCw size={15} strokeWidth={1.9} />}
            onClick={() => void controller.refresh()}
          >
            Refresh
          </AdminButton>
        </AdminToolbar>
      </Panel>

      {!canDecide ? (
        <AlertRow
          icon={<ShieldCheck size={16} strokeWidth={1.9} />}
          title="Read-only reviewer access"
          tone="neutral"
        >
          Support can inspect this queue. Admin, Admin Owner, or Safety Reviewer
          access is required to record an eligibility decision.
        </AlertRow>
      ) : null}

      {controller.isLoading && controller.candidates.length === 0 ? (
        <EmptyState
          icon={<Clock3 size={16} strokeWidth={1.9} />}
          variant="workbench"
        >
          Loading the bounded Cross Paths showcase review queue.
        </EmptyState>
      ) : controller.errorMessage ? (
        <Panel
          action="retry available"
          icon={<FileWarning size={18} strokeWidth={1.9} />}
          span={2}
          title="Review queue unavailable"
        >
          <AdminWorkbenchNote>{controller.errorMessage}</AdminWorkbenchNote>
          <AdminButton onClick={() => void controller.refresh()}>
            Retry data load
          </AdminButton>
        </Panel>
      ) : controller.candidates.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck size={16} strokeWidth={1.9} />}
          variant="workbench"
        >
          No profiles match this review status on the current bounded page.
        </EmptyState>
      ) : (
        <AdminWorkbenchStack>
          {controller.candidates.map((candidate) => (
            <CandidateReviewPanel
              canDecide={canDecide}
              candidate={candidate}
              controller={controller}
              key={candidate.uid}
            />
          ))}
        </AdminWorkbenchStack>
      )}

      {controller.nextCursor ? (
        <AdminButton
          disabled={controller.isLoading || controller.isMutating}
          icon={<ChevronRight size={15} strokeWidth={1.9} />}
          onClick={controller.loadNext}
        >
          Next bounded page
        </AdminButton>
      ) : null}
    </AdminWorkbenchStack>
  );
}

function CandidateReviewPanel({
  canDecide,
  candidate,
  controller,
}: {
  canDecide: boolean;
  candidate: CrossPathsShowcaseCandidate;
  controller: CrossPathsShowcaseController;
}) {
  const [primaryPortraitClear, setPrimaryPortraitClear] = useState(false);
  const [profileRepresentsCurrentMember, setProfileRepresentsCurrentMember] =
    useState(false);
  const [showcasePolicyReviewed, setShowcasePolicyReviewed] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const isPending = controller.pendingUid === candidate.uid;
  const checklistComplete = primaryPortraitClear &&
    profileRepresentsCurrentMember && showcasePolicyReviewed;
  const submit = async (
    status: "eligible" | "needsReview" | "paused"
  ) => {
    const saved = await controller.decide({
      uid: candidate.uid,
      status,
      reviewChecklist: {
        primaryPortraitClear,
        profileRepresentsCurrentMember,
        showcasePolicyReviewed,
      },
      reviewNote,
    });
    if (saved) setReviewNote("");
  };

  return (
    <Panel
      action={statusLabel(candidate.effectiveStatus)}
      icon={<UserRound size={18} strokeWidth={1.9} />}
      span={2}
      title={candidate.name ?? candidate.uid}
    >
      <AdminEditorGrid>
        <AdminWorkbenchStack compact>
          {candidate.photoUrls.length > 0 ? (
            <AdminProfilePhotoGrid
              ariaLabel={
                `Public profile photos for ${candidate.name ?? candidate.uid}`
              }
              photos={candidate.photoUrls.map((url, index) => ({
                alt: `${candidate.name ?? "Member"} public profile ${index + 1}`,
                url,
              }))}
            />
          ) : (
            <AlertRow
              icon={<FileWarning size={16} strokeWidth={1.9} />}
              title="No displayable public photos"
              tone="warning"
            >
              This profile cannot be approved until its media is complete.
            </AlertRow>
          )}
          <QualityList>
            <StateRow label="UID" value={candidate.uid} />
            <StateRow label="Age" value={candidate.age?.toString() ?? "Missing"} />
            <StateRow label="Gender" value={candidate.gender ?? "Missing"} />
            <StateRow label="City" value={candidate.city ?? "Missing"} />
            <StateRow
              label="Relationship goal"
              value={candidate.relationshipGoal ?? "Missing"}
            />
            <StateRow
              label="Profile fingerprint"
              value={candidate.profileFingerprint.slice(0, 12)}
            />
          </QualityList>
        </AdminWorkbenchStack>
        <AdminWorkbenchStack compact>
          <AdminTagList>
            <CatchBadge label={candidate.automaticStatus} />
            <CatchBadge label={`${candidate.photoUrls.length} displayable photos`} />
            <CatchBadge label={`${candidate.promptAnswers.length} prompts`} />
            {candidate.effectiveReasonCodes.map((reason) => (
              <CatchBadge key={reason} label={reasonLabel(reason)} />
            ))}
          </AdminTagList>
          {candidate.promptAnswers.map((prompt) => (
            <Panel
              action="public prompt"
              icon={<UserRound size={16} strokeWidth={1.9} />}
              key={`${prompt.prompt}-${prompt.answer}`}
              title={prompt.prompt || "Untitled prompt"}
            >
              <AdminWorkbenchNote>
                {prompt.answer || "No answer supplied."}
              </AdminWorkbenchNote>
            </Panel>
          ))}
          {candidate.reviewedAt ? (
            <QualityList>
              <StateRow label="Last reviewer" value={candidate.reviewedByUid} />
              <StateRow
                label="Last reviewed"
                value={formatDateTime(candidate.reviewedAt)}
              />
              <StateRow label="Review note" value={candidate.reviewNote} />
            </QualityList>
          ) : null}
        </AdminWorkbenchStack>
      </AdminEditorGrid>

      {candidate.automaticReasonCodes.length > 0 ? (
        <AlertRow
          icon={<FileWarning size={16} strokeWidth={1.9} />}
          title="Objective readiness blockers"
          tone="warning"
        >
          {candidate.automaticReasonCodes.map(reasonLabel).join(", ")}
        </AlertRow>
      ) : null}

      {canDecide ? (
        <AdminWorkbenchStack compact>
          <CheckboxField
            checked={primaryPortraitClear}
            disabled={isPending}
            label="The primary portrait is clear and identifies the member."
            onChange={setPrimaryPortraitClear}
          />
          <CheckboxField
            checked={profileRepresentsCurrentMember}
            disabled={isPending}
            label="The public profile appears current and internally consistent."
            onChange={setProfileRepresentsCurrentMember}
          />
          <CheckboxField
            checked={showcasePolicyReviewed}
            disabled={isPending}
            label="I reviewed the score-free Cross Paths showcase policy."
            onChange={setShowcasePolicyReviewed}
          />
          <CatchField
            recipe="input"
            inputMode={isPending ? "inactive" : "editable"}
            title="Audited review note"
            maxLength={1000}
            onChanged={setReviewNote}
            maxLines={3}
            value={reviewNote}
          />
          <AdminToolbar>
            <AdminButton
              disabled={isPending || !reviewNote.trim() ||
                candidate.automaticStatus !== "ready" || !checklistComplete}
              icon={<ShieldCheck size={15} strokeWidth={1.9} />}
              onClick={() => void submit("eligible")}
              variant="primary"
            >
              Approve for showcase
            </AdminButton>
            <AdminButton
              disabled={isPending || !reviewNote.trim()}
              icon={<FileWarning size={15} strokeWidth={1.9} />}
              onClick={() => void submit("needsReview")}
            >
              Keep in review
            </AdminButton>
            <AdminButton
              disabled={isPending || !reviewNote.trim()}
              icon={<PauseCircle size={15} strokeWidth={1.9} />}
              onClick={() => void submit("paused")}
            >
              Pause showcase
            </AdminButton>
          </AdminToolbar>
        </AdminWorkbenchStack>
      ) : null}
    </Panel>
  );
}

function reasonLabel(reason: string): string {
  return reason.replaceAll("_", " ");
}

function statusLabel(status: CrossPathsShowcaseCandidate["effectiveStatus"]): string {
  if (status === "needsReview") return "needs review";
  return status;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
