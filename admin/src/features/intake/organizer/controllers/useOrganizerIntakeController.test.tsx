import {act, renderHook, waitFor} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {createQueryHarness} from "../../../../shared/test/queryHarness";
import {useOrganizerIntakeController} from "./useOrganizerIntakeController";

describe("useOrganizerIntakeController", () => {
  it("loads the intake workbench and retains explicit review notes", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useOrganizerIntakeController({
      onError: vi.fn(),
      onNotice: vi.fn(),
    }), {wrapper});

    await waitFor(() => expect(result.current).toBeTruthy());
    expect(result.current.source).toBe("sample");
    expect(result.current.bridge.searchCandidates.candidates).toHaveLength(2);
    expect(result.current.bridge.summary.searchResultCandidates).toBe(2);
    act(() => result.current.setDecisionNotes({"organizer-1": "Reviewed evidence."}));
    expect(result.current.decisionNotes["organizer-1"]).toBe("Reviewed evidence.");
  });

  it("creates a hidden organizer draft then opens its publishing workspace",
    async () => {
      const {wrapper} = createQueryHarness();
      const onOrganizerDraftCreated = vi.fn();
      const {result} = renderHook(() => useOrganizerIntakeController({
        onError: vi.fn(),
        onNotice: vi.fn(),
        onOrganizerDraftCreated,
      }), {wrapper});

      await waitFor(() =>
        expect(result.current.bridge.searchCandidates.candidates).toHaveLength(2)
      );
      const candidate = result.current.bridge.searchCandidates.candidates
        .find((entry) => entry.existingEntityMatches.length === 0);
      expect(candidate).toBeTruthy();
      if (!candidate) throw new Error("Expected a net-new organizer candidate.");
      await act(async () => {
        await result.current.handleCreateOrganizerDraft(candidate);
      });

      expect(result.current.localOrganizerDrafts[candidate.candidateId])
        .toMatchObject({
          organizerId: "sampleOrg00000000001",
          appVisibility: "hidden",
          claimState: "unclaimed",
          publishStatus: "draft",
          indexStatus: "noindex",
          crawlStatus: "disabled",
        });
      expect(onOrganizerDraftCreated)
        .toHaveBeenCalledWith("sampleOrg00000000001");
    });

  it("requires an explicit canonical match before attaching a surface",
    async () => {
      const {wrapper} = createQueryHarness();
      const onError = vi.fn();
      const {result} = renderHook(() => useOrganizerIntakeController({
        onError, onNotice: vi.fn(),
      }), {wrapper});
      await waitFor(() => expect(result.current?.bridge.searchCandidates
        .candidates).toHaveLength(2));
      const sampleCandidate = result.current.bridge.searchCandidates.candidates
        .find((entry) => entry.existingEntityMatches.length > 0);
      expect(sampleCandidate).toBeTruthy();
      if (!sampleCandidate) throw new Error("Expected matched candidate.");
      const candidate = {...sampleCandidate,
        suggestedSurface: {...sampleCandidate.suggestedSurface,
          evidenceRefs: sampleCandidate.suggestedSurface.evidenceRefs ?? [],
          notes: sampleCandidate.suggestedSurface.notes ?? ""}};
      await act(async () => {
        expect(await result.current.handleAttachCandidate(candidate)).toBe(false);
      });
      expect(onError).toHaveBeenCalledWith(
        "Choose a matched organizer before attaching this surface.");
      expect(result.current.localCuration[candidate.candidateId])
        .toBeUndefined();
      const selectedId = candidate.existingEntityMatches[0]?.entityId;
      if (!selectedId) throw new Error("Expected canonical match.");
      act(() => result.current.setSelectedMatchByCandidate((current) => ({
        ...current, [candidate.candidateId]: selectedId,
      })));
      await act(async () => {
        expect(await result.current.handleAttachCandidate(candidate)).toBe(true);
      });
      expect(result.current.localCuration[candidate.candidateId])
        .toBeTruthy();
      expect(result.current.localSalesLinks[candidate.candidateId])
        .toBeUndefined();
    });
});
