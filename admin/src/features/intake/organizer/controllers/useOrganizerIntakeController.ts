import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {useCallback, useMemo, useState} from "react";
import {
  decideOrganizerIntake,
  decideOrganizerPolicyGap,
  createOrganizerDraftFromCandidate,
  recordOrganizerCuration,
} from "../api/organizerIntakeRepository";
import {
  curationFormKey,
  curationPayloadForItem,
  decisionLabel,
  defaultIntakeDecisionNote,
  defaultPolicyGapDecisionNote,
  intakeChecklistForDecision,
  emptyOrganizerSurfaceChecklist,
  organizerDraftFormFromCandidate,
  organizerDraftPayloadForCandidate,
  organizerIntakeDecisionFromString,
  organizerPolicyGapDecisionFromString,
  organizerSurfaceChecklistReady,
  organizerVisibilityForDecision,
  organizerVisibilityFormForItem,
  policyGapChecklistForDecision,
  policyGapDecisionLabel,
  publicationPacketReady,
  surfaceForCandidateCuration,
} from "./organizerIntakeHelpers";
import {loadOrganizerIntakeBridge} from "./loadOrganizerIntakeBridge";
import {linkOrganizerIntakeToSales, type IntakeSalesLinkResult} from
  "../api/organizerSalesBridgeRepository";
import type {
  AdminDecideOrganizerIntakePayload,
  AdminDecideOrganizerIntakeResponse,
  AdminDecideOrganizerPolicyGapPayload,
  AdminDecideOrganizerPolicyGapResponse,
  AdminCreateOrganizerDraftFromCandidatePayload,
  AdminCreateOrganizerDraftFromCandidateResponse,
  AdminRecordOrganizerCurationPayload,
  AdminRecordOrganizerCurationResponse,
  OrganizerIntakeDecision,
  OrganizerPolicyGapDecision,
} from "../../../../shared/types/adminTypes";
import type * as Intake from "../types/organizerIntakeTypes";
import {adminQueryKeys} from "../../../../shared/query/queryKeys";
import {usePendingMutationRecord} from "../../../../shared/query/usePendingMutationRecord";
import {useAdminPendingOperationGuard} from "../../../../shared/pendingOperation";

export function useOrganizerIntakeController({
  onError,
  onNotice,
  onOrganizerDraftCreated,
}: {
  onError: (message: string | null) => void;
  onNotice: (message: string | null) => void;
  onOrganizerDraftCreated?: (organizerId: string) => void;
}) {
  const queryClient = useQueryClient();
  const {data: intake} = useSuspenseQuery({
    queryKey: adminQueryKeys.organizerIntake.bridge(),
    queryFn: loadOrganizerIntakeBridge,
    staleTime: Infinity,
  });
  const bridge = intake.workbench;
  const {beginOperation, endOperation} = useAdminPendingOperationGuard();
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>(
    {}
  );
  const [localDecisions, setLocalDecisions] =
    useState<Record<string, AdminDecideOrganizerIntakeResponse>>({});
  const [localCuration, setLocalCuration] =
    useState<Record<string, AdminRecordOrganizerCurationResponse>>({});
  const [selectedMatchByCandidate, setSelectedMatchByCandidate] =
    useState<Record<string, string>>({});
  const [localSalesLinks, setLocalSalesLinks] =
    useState<Record<string, IntakeSalesLinkResult>>({});
  const [organizerDraftForms, setOrganizerDraftForms] =
    useState<Record<string, Intake.OrganizerDraftFormState>>({});
  const [localOrganizerDrafts, setLocalOrganizerDrafts] =
    useState<Record<string, AdminCreateOrganizerDraftFromCandidateResponse>>(
      {}
    );
  const [curationForms, setCurationForms] =
    useState<Record<string, Intake.OrganizerCurationFormState>>({});
  const [policyDecisionNotes, setPolicyDecisionNotes] =
    useState<Record<string, string>>({});
  const [localPolicyDecisions, setLocalPolicyDecisions] =
    useState<Record<string, AdminDecideOrganizerPolicyGapResponse>>({});
  const [manualReportAcknowledgements, setManualReportAcknowledgements] =
    useState<Record<string, boolean>>({});
  const [visibilityForms, setVisibilityForms] =
    useState<Record<string, Intake.OrganizerVisibilityFormState>>({});
  const [surfaceChecklists, setSurfaceChecklists] =
    useState<Record<string, Intake.OrganizerSurfaceChecklistState>>({});
  const decisionMutationKey = adminQueryKeys.organizerIntake.decision();
  const curationMutationKey = adminQueryKeys.organizerIntake.curation();
  const organizerDraftMutationKey =
    adminQueryKeys.organizerIntake.createDraft();
  const salesLinkMutationKey = [...adminQueryKeys.all, "intakeSalesLink"];
  const policyDecisionMutationKey =
    adminQueryKeys.organizerIntake.policyDecision();
  const decideOrganizerIntakeMutation = useMutation({
    mutationKey: decisionMutationKey,
    mutationFn: decideOrganizerIntake,
  });
  const decideOrganizerPolicyGapMutation = useMutation({
    mutationKey: policyDecisionMutationKey,
    mutationFn: decideOrganizerPolicyGap,
  });
  const recordOrganizerCurationMutation = useMutation({
    mutationKey: curationMutationKey,
    mutationFn: recordOrganizerCuration,
  });
  const createOrganizerDraftMutation = useMutation({
    mutationKey: organizerDraftMutationKey,
    mutationFn: createOrganizerDraftFromCandidate,
  });
  const salesLinkMutation = useMutation({
    mutationKey: salesLinkMutationKey,
    mutationFn: linkOrganizerIntakeToSales,
  });
  const decisionInFlight = usePendingMutationRecord<
    AdminDecideOrganizerIntakePayload,
    OrganizerIntakeDecision
  >(decisionMutationKey, (payload) => ({
    key: payload.entityId,
    value: payload.decision,
  }));
  const curationInFlight = usePendingMutationRecord<
    AdminRecordOrganizerCurationPayload,
    boolean
  >(curationMutationKey, (payload) => ({
    key: curationKeyForPayload(payload),
    value: true,
  }));
  const organizerDraftInFlight = usePendingMutationRecord<
    AdminCreateOrganizerDraftFromCandidatePayload,
    boolean
  >(organizerDraftMutationKey, (payload) => ({
    key: payload.candidateId,
    value: true,
  }));
  const salesLinkInFlight = usePendingMutationRecord<
    Parameters<typeof linkOrganizerIntakeToSales>[0], boolean
  >(salesLinkMutationKey, (payload) => ({
    key: payload.candidateId, value: true,
  }));
  const policyDecisionInFlight = usePendingMutationRecord<
    AdminDecideOrganizerPolicyGapPayload,
    OrganizerPolicyGapDecision
  >(policyDecisionMutationKey, (payload) => ({
    key: payload.gapId,
    value: payload.decision,
  }));

  const publicationPacketByEntity = useMemo(() =>
    new Map(
      bridge.publicationReviewPackets.packets.map((packet) => [
        packet.entityId,
        packet,
      ])
    ), [bridge.publicationReviewPackets.packets]);

  const handleDecision = useCallback(async (
    item: Intake.OrganizerIntakeItem,
    decision: OrganizerIntakeDecision
  ) => {
    const publicationPacket = publicationPacketByEntity.get(item.entityId);
    if (decision === "approve_public" &&
      !publicationPacketReady(publicationPacket)) {
      onError(
        publicationPacket ?
          "Resolve publication packet blockers before approving this organizer." :
          "Generate a publication review packet before approving this organizer."
      );
      return false;
    }
    const manualReportCount =
      publicationPacket?.evidenceSummary.manualReportsWithoutArtifacts ?? 0;
    if (decision === "approve_public" &&
      manualReportCount > 0 &&
      manualReportAcknowledgements[item.entityId] !== true) {
      onError("Acknowledge manual reports before approving this organizer.");
      return false;
    }
    const checklist = {
      ...intakeChecklistForDecision(item, decision),
      ...(decision === "approve_public" && manualReportCount > 0 ?
        {manualReportsReviewed: true} :
        {}),
    };
    const visibilityForm = visibilityForms[item.entityId] ??
      organizerVisibilityFormForItem(item);
    const surfaceChecklist = surfaceChecklists[item.entityId] ??
      emptyOrganizerSurfaceChecklist();
    if (decision === "approve_public" &&
      !organizerSurfaceChecklistReady(visibilityForm, surfaceChecklist)) {
      onError(
        "Confirm the visibility-specific checks before exposing this organizer."
      );
      return false;
    }
    if (decision === "approve_public" &&
      !Object.values(checklist).every(Boolean)) {
      onError("Resolve review gates before approving this organizer.");
      return false;
    }
    const note = decisionNotes[item.entityId]?.trim() ||
      defaultIntakeDecisionNote(item, decision);
    const payload: AdminDecideOrganizerIntakePayload = {
      entityId: item.entityId,
      decision,
      ...organizerVisibilityForDecision(decision, visibilityForm),
      checklist: {
        ...checklist,
        ...(decision === "approve_public" ? surfaceChecklist : {}),
      },
      note,
    };
    const operation = beginOperation();
    if (!operation) return false;
    onError(null);
    onNotice(null);
    try {
      const response = await decideOrganizerIntakeMutation.mutateAsync(payload);
      setLocalDecisions((current) => ({
        ...current,
        [item.entityId]: response,
      }));
      onNotice(
        `Recorded ${decisionLabel(decision)} for ${item.displayName}.`
      );
      return true;
    } catch (decisionError) {
      onError(
        decisionError instanceof Error ?
          decisionError.message :
          "Unable to record organizer intake decision."
      );
      return false;
    } finally {
      endOperation(operation);
    }
  }, [
    beginOperation,
    decisionNotes,
    decideOrganizerIntakeMutation,
    endOperation,
    manualReportAcknowledgements,
    onError,
    onNotice,
    publicationPacketByEntity,
    surfaceChecklists,
    visibilityForms,
  ]);

  const performSalesLink = useCallback(async (
    candidate: Intake.OrganizerSearchCandidate,
    organizerId: string,
    curationPath: string
  ) => {
    try {
      const result = await salesLinkMutation.mutateAsync({
        workItemId: candidate.workItemId,
        candidateId: candidate.candidateId,
        expectedWorkItemRevision: candidate.workItemRevision,
        expectedCandidateHash: candidate.candidateHash,
        organizerId, curationPath, requestId: crypto.randomUUID(),
      });
      setLocalSalesLinks((current) => ({
        ...current, [candidate.candidateId]: result,
      }));
      await queryClient.invalidateQueries({queryKey: ["sales"]});
      onNotice(result.accountCreated ?
        `Added ${candidate.title} to private Sales research.` :
        `Linked ${candidate.title} to its existing Sales account.`);
      return true;
    } catch (error) {
      onError(error instanceof Error ?
        `Intake decision is saved, but Sales linking needs review: ${
          error.message}` :
        "Intake decision is saved, but Sales linking needs review.");
      return false;
    }
  }, [onError, onNotice, queryClient, salesLinkMutation]);

  const handleAttachCandidate = useCallback(async (
    candidate: Intake.OrganizerSearchCandidate
  ) => {
    const entityId = selectedMatchByCandidate[candidate.candidateId];
    if (!entityId || !candidate.existingEntityMatches.some((match) =>
      match.entityId === entityId)) {
      onError("Choose a matched organizer before attaching this surface.");
      return false;
    }
    const payload: AdminRecordOrganizerCurationPayload = {
      operationType: "attach_surface",
      entityId,
      sourceCandidateId: candidate.candidateId,
      surface: surfaceForCandidateCuration(candidate),
      reason: `Search candidate ${candidate.candidateId} belongs to ${entityId}.`,
    };
    const operation = beginOperation();
    if (!operation) return false;
    onError(null);
    onNotice(null);
    try {
      const response = await recordOrganizerCurationMutation.mutateAsync(payload);
      setLocalCuration((current) => ({
        ...current,
        [candidate.candidateId]: response,
      }));
      if (intake.source === "sample") {
        onNotice(`Sample curation attach recorded for ${candidate.title}.`);
        return true;
      }
      await performSalesLink(candidate, entityId, response.decisionPath);
      return true;
    } catch (curationError) {
      onError(
        curationError instanceof Error ?
          curationError.message :
          "Unable to record organizer curation operation."
      );
      return false;
    } finally {
      endOperation(operation);
    }
  }, [
    beginOperation,
    endOperation,
    intake.source,
    onError,
    onNotice,
    performSalesLink,
    recordOrganizerCurationMutation,
    selectedMatchByCandidate,
  ]);

  const handleCreateOrganizerDraft = useCallback(async (
    candidate: Intake.OrganizerSearchCandidate
  ) => {
    const form = organizerDraftForms[candidate.candidateId] ??
      organizerDraftFormFromCandidate(candidate);
    const payload = organizerDraftPayloadForCandidate(candidate, form);
    if (!payload.ok) {
      onError(payload.message);
      return;
    }
    const operation = beginOperation();
    if (!operation) return;
    onError(null);
    onNotice(null);
    try {
      const response =
        await createOrganizerDraftMutation.mutateAsync(payload.value);
      setLocalOrganizerDrafts((current) => ({
        ...current,
        [candidate.candidateId]: response,
      }));
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: adminQueryKeys.organizerIntake.bridge(),
        }),
        queryClient.invalidateQueries({
          queryKey: [...adminQueryKeys.all, "organizers"],
        }),
      ]);
      if (intake.source === "sample") {
        onNotice(`Preview draft ${response.organizerId} created.`);
        onOrganizerDraftCreated?.(response.organizerId);
      } else if (await performSalesLink(candidate, response.organizerId,
        response.curationPath)) {
        onOrganizerDraftCreated?.(response.organizerId);
      }
    } catch (draftError) {
      onError(
        draftError instanceof Error ?
          draftError.message :
          "Unable to create organizer draft."
      );
    } finally {
      endOperation(operation);
    }
  }, [
    beginOperation,
    createOrganizerDraftMutation,
    endOperation,
    intake.source,
    onError,
    onNotice,
    onOrganizerDraftCreated,
    organizerDraftForms,
    performSalesLink,
    queryClient,
  ]);

  const handleRetrySalesLink = useCallback(async (
    candidate: Intake.OrganizerSearchCandidate
  ) => {
    const draft = localOrganizerDrafts[candidate.candidateId] ??
      candidate.draftLink;
    const selected = selectedMatchByCandidate[candidate.candidateId];
    const curation = localCuration[candidate.candidateId];
    const organizerId = draft?.organizerId ?? selected;
    const curationPath = draft?.curationPath ?? curation?.decisionPath ??
      (selected ? attachCurationPath(selected,
        candidate.suggestedSurface.surfaceId) : null);
    if (!organizerId || !curationPath ||
      (!draft && !candidate.existingEntityMatches.some((match) =>
        match.entityId === organizerId))) {
      onError("Choose the reviewed organizer identity before linking Sales.");
      return false;
    }
    const operation = beginOperation();
    if (!operation) return false;
    onError(null);
    try {
      return await performSalesLink(candidate, organizerId, curationPath);
    } finally {
      endOperation(operation);
    }
  }, [beginOperation, endOperation, localCuration, localOrganizerDrafts,
    onError, performSalesLink, selectedMatchByCandidate]);

  const handleOpenOrganizerDraft = useCallback((organizerId: string) => {
    onOrganizerDraftCreated?.(organizerId);
  }, [onOrganizerDraftCreated]);

  const handleItemCuration = useCallback(async (
    item: Intake.OrganizerIntakeItem,
    form: Intake.OrganizerCurationFormState
  ) => {
    const payload = curationPayloadForItem(item, form);
    if (!payload.ok) {
      onError(payload.message);
      return;
    }
    const operationKey = curationFormKey(item, form);
    const operation = beginOperation();
    if (!operation) return;
    onError(null);
    onNotice(null);
    try {
      const response = await recordOrganizerCurationMutation.mutateAsync(payload.value);
      setLocalCuration((current) => ({
        ...current,
        [operationKey]: response,
      }));
      onNotice(
        `Recorded ${form.operationType.replaceAll("_", " ")} for ${item.displayName}.`
      );
    } catch (curationError) {
      onError(
        curationError instanceof Error ?
          curationError.message :
          "Unable to record organizer curation operation."
      );
    } finally {
      endOperation(operation);
    }
  }, [
    beginOperation,
    endOperation,
    onError,
    onNotice,
    recordOrganizerCurationMutation,
  ]);

  const handlePolicyGapDecision = useCallback(async (
    gap: Intake.OrganizerPolicyGap,
    decision: OrganizerPolicyGapDecision
  ) => {
    const checklist = policyGapChecklistForDecision(decision);
    const requiredInputsReviewed = decision === "accept" ?
      gap.requiredInputs :
      [];
    if (decision === "accept" &&
      (!Object.values(checklist).every(Boolean) ||
        requiredInputsReviewed.length === 0)) {
      onError("Review all policy inputs before accepting this policy gap.");
      return;
    }
    const note = policyDecisionNotes[gap.gapId]?.trim() ||
      defaultPolicyGapDecisionNote(gap, decision);
    const payload: AdminDecideOrganizerPolicyGapPayload = {
      gapId: gap.gapId,
      decision,
      requiredInputsReviewed,
      checklist,
      note,
    };
    const operation = beginOperation();
    if (!operation) return;
    onError(null);
    onNotice(null);
    try {
      const response =
        await decideOrganizerPolicyGapMutation.mutateAsync(payload);
      setLocalPolicyDecisions((current) => ({
        ...current,
        [gap.gapId]: response,
      }));
      onNotice(
        `Recorded ${policyGapDecisionLabel(decision)} for ${gap.gapId}.`
      );
    } catch (decisionError) {
      onError(
        decisionError instanceof Error ?
          decisionError.message :
          "Unable to record policy gap decision."
      );
    } finally {
      endOperation(operation);
    }
  }, [
    beginOperation,
    decideOrganizerPolicyGapMutation,
    endOperation,
    policyDecisionNotes,
    onError,
    onNotice,
  ]);

  const handlePendingInputDecision = useCallback(async (
    input: Intake.OrganizerPendingInputItem,
    decision: string
  ) => {
    const payload = input.callableSubmission?.payloadsByDecision[decision];
    if (!payload) {
      onError("Generated pending-input payload is missing for this decision.");
      return;
    }
    onError(null);
    onNotice(null);
    if (input.requestType === "admin_publication_decision") {
      const intakeDecision = organizerIntakeDecisionFromString(decision);
      if (!intakeDecision) {
        onError("Pending input decision is not a publication decision.");
        return;
      }
      const request =
        payload as unknown as AdminDecideOrganizerIntakePayload;
      const operation = beginOperation();
      if (!operation) return;
      try {
        const response =
          await decideOrganizerIntakeMutation.mutateAsync(request);
        setLocalDecisions((current) => ({
          ...current,
          [response.entityId]: response,
        }));
        onNotice(
          `Recorded ${decisionLabel(response.decision)} for ${input.subjectName}.`
        );
      } catch (decisionError) {
        onError(
          decisionError instanceof Error ?
            decisionError.message :
            "Unable to record organizer intake decision."
        );
      } finally {
        endOperation(operation);
      }
      return;
    }
    if (input.requestType === "policy_decision") {
      const policyDecision = organizerPolicyGapDecisionFromString(decision);
      if (!policyDecision) {
        onError("Pending input decision is not a policy decision.");
        return;
      }
      const request =
        payload as unknown as AdminDecideOrganizerPolicyGapPayload;
      const operation = beginOperation();
      if (!operation) return;
      try {
        const response =
          await decideOrganizerPolicyGapMutation.mutateAsync(request);
        setLocalPolicyDecisions((current) => ({
          ...current,
          [response.gapId]: response,
        }));
        onNotice(
          `Recorded ${policyGapDecisionLabel(response.decision)} for ${input.subjectName}.`
        );
      } catch (decisionError) {
        onError(
          decisionError instanceof Error ?
            decisionError.message :
            "Unable to record policy gap decision."
        );
      } finally {
        endOperation(operation);
      }
      return;
    }
    onError("Pending input request type is not wired for admin action.");
  }, [
    beginOperation,
    decideOrganizerIntakeMutation,
    decideOrganizerPolicyGapMutation,
    endOperation,
    onError,
    onNotice,
  ]);

  return {
    availability: intake.availability,
    bridge,
    source: intake.source,
    curationForms,
    curationInFlight,
    decisionInFlight,
    decisionNotes,
    handleAttachCandidate,
    handleCreateOrganizerDraft,
    handleDecision,
    handleItemCuration,
    handleOpenOrganizerDraft,
    handleRetrySalesLink,
    handlePendingInputDecision,
    handlePolicyGapDecision,
    localCuration,
    localDecisions,
    localOrganizerDrafts,
    localSalesLinks,
    localPolicyDecisions,
    manualReportAcknowledgements,
    organizerDraftForms,
    organizerDraftInFlight,
    salesLinkInFlight,
    selectedMatchByCandidate,
    setSelectedMatchByCandidate,
    policyDecisionInFlight,
    policyDecisionNotes,
    publicationPacketByEntity,
    setCurationForms,
    setDecisionNotes,
    setManualReportAcknowledgements,
    setOrganizerDraftForms,
    setPolicyDecisionNotes,
    setSurfaceChecklists,
    setVisibilityForms,
    surfaceChecklists,
    visibilityForms,
  };
}

function attachCurationPath(organizerId: string,
  surfaceId: string): string {
  const operationId = ["attach", organizerId, surfaceId].join("-")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "").slice(0, 140);
  return `organizerIntakeCurationDecisions/${operationId}`;
}

function curationKeyForPayload(payload: AdminRecordOrganizerCurationPayload) {
  if (payload.sourceCandidateId) return payload.sourceCandidateId;
  return [
    payload.entityId ?? payload.sourceEntityId,
    payload.operationType,
    payload.targetEntityId,
    payload.surfaceId,
    payload.decision,
    payload.newEntityId,
  ].filter(Boolean).join(":");
}

export type OrganizerIntakeController =
  ReturnType<typeof useOrganizerIntakeController>;
