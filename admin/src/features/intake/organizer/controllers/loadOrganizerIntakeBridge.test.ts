import {afterEach, describe, expect, it, vi} from "vitest";

const mocks = vi.hoisted(() => ({
  listIntakeOperations: vi.fn(),
}));

vi.mock("../../../../shared/api/adminApi", () => ({
  listIntakeOperations: mocks.listIntakeOperations,
}));

import {loadOrganizerIntakeBridge} from "./loadOrganizerIntakeBridge";

afterEach(() => {
  vi.unstubAllEnvs();
  mocks.listIntakeOperations.mockReset();
});

describe("loadOrganizerIntakeBridge", () => {
  it("joins the newest persisted organizer run for both launch markets", async () => {
    vi.stubEnv("VITE_ADMIN_DATA_MODE", "live");
    const runs = [
      {
        ...operationRun(
          "newer-general-indore-run",
          "indore",
          "2026-07-24T12:02:00.000Z"
        ),
        scope: {market: "indore", intakeScope: "all"},
      },
      operationRun("mumbai-run", "mumbai", "2026-07-24T12:01:00.000Z"),
      operationRun("indore-run", "indore", "2026-07-24T12:00:00.000Z"),
    ];
    mocks.listIntakeOperations.mockImplementation(async (
      payload: {runId?: string}
    ) => {
      if (!payload.runId) return operationResponse({runs, workItems: []});
      const market = payload.runId === "mumbai-run" ? "mumbai" : "indore";
      return operationResponse({
        runs: [runs.find((run) => run.runId === payload.runId)],
        workItems: Array.from({length: 25}, (_value, index) =>
          organizerWorkItem(market, index + 1)),
        organizerDraftLinks: market === "mumbai" ? [{
          workItemId: "wi-mumbai-candidate-10",
          candidateId: "mumbai-candidate-10",
          organizerId: "courtside",
          curationPath: "organizerIntakeCurationDecisions/create-draft-test",
        }] : [],
      });
    });

    const result = await loadOrganizerIntakeBridge();

    expect(result.source).toBe("firestore");
    expect(result.availability).toEqual({
      searchCandidates: true,
      publicationPackets: false,
      canonicalItems: false,
      discoveryCandidateCount: 50,
      runIds: ["mumbai-run", "indore-run"],
    });
    expect(result.workbench.summary).toMatchObject({
      reviewItems: null,
      evidenceReview: null,
      promotionReview: null,
      blocked: null,
      approvedPublic: null,
      appDiscoverable: null,
    });
    expect(result.workbench.publicationReviewPackets.summary).toMatchObject({
      packets: null,
      readyForManualPublicationReview: null,
      blockedByData: null,
    });
    expect(result.workbench.searchCandidates.summary.candidates).toBe(50);
    expect(new Set(
      result.workbench.searchCandidates.candidates.map((candidate) =>
        candidate.queryIntent.marketSlug)
    )).toEqual(new Set(["indore", "mumbai"]));
    expect(mocks.listIntakeOperations).toHaveBeenCalledTimes(3);
    expect(result.workbench.searchCandidates.candidates.find((candidate) =>
      candidate.candidateId === "mumbai-candidate-10")).toMatchObject({
      workItemId: "wi-mumbai-candidate-10",
      workItemRevision: 0,
      candidateHash: "b".repeat(64),
      draftLink: {
        organizerId: "courtside",
      },
    });
    expect(mocks.listIntakeOperations).toHaveBeenNthCalledWith(1, {
      workflowId: "supply-intake",
      runStatus: "completed",
      entityKind: "organizer",
      runLimit: 25,
      workItemLimit: 1,
    });
    expect(mocks.listIntakeOperations).not.toHaveBeenCalledWith(
      expect.objectContaining({runId: "newer-general-indore-run"})
    );
  });

  it("tolerates list responses from before draft-link projection", async () => {
    const run = operationRun(
      "mumbai-run",
      "mumbai",
      "2026-07-24T12:01:00.000Z"
    );
    mocks.listIntakeOperations.mockImplementation(async (
      payload: {runId?: string}
    ) => {
      const response = operationResponse({
        runs: [run],
        workItems: payload.runId ? [organizerWorkItem("mumbai", 1)] : [],
      }) as {organizerDraftLinks?: unknown[]};
      delete response.organizerDraftLinks;
      return response;
    });

    const result = await loadOrganizerIntakeBridge();

    expect(result.workbench.searchCandidates.summary.candidates).toBe(1);
    expect(result.workbench.searchCandidates.candidates[0]?.draftLink)
      .toBeUndefined();
  });

  it("hydrates bounded publication packets into the live workbench", async () => {
    const run = operationRun(
      "indore-run",
      "indore",
      "2026-07-24T12:01:00.000Z"
    );
    mocks.listIntakeOperations.mockImplementation(async (
      payload: {runId?: string}
    ) => operationResponse({
      runs: [run],
      workItems: payload.runId ? [
        organizerWorkItem("indore", 1),
        organizerPacketWorkItem("afterfly", "indore"),
      ] : [],
    }));

    const result = await loadOrganizerIntakeBridge();

    expect(result.availability).toMatchObject({
      searchCandidates: true,
      publicationPackets: true,
      canonicalItems: true,
      discoveryCandidateCount: 1,
      runIds: ["indore-run"],
    });
    expect(result.workbench.items).toHaveLength(1);
    expect(result.workbench.items[0]).toMatchObject({
      entityId: "afterfly",
      displayName: "AFTER FLY",
      priority: "p1",
      reviewStatus: "ready",
      publishStatus: "published",
      appVisibility: "hidden",
      markets: [{marketSlug: "indore", displayName: "Indore"}],
    });
    expect(result.workbench.publicationReviewPackets.packets).toHaveLength(1);
    expect(result.workbench.publicationReviewPackets.packets[0]).toMatchObject({
      packetId: "packet-afterfly",
      entityId: "afterfly",
      status: "published",
      evidenceSummary: {
        records: 6,
        manualReportsWithoutArtifacts: 2,
      },
      adminDecision: {
        currentDecision: {
          decision: "approve_public",
          appVisibility: "hidden",
        },
      },
    });
    expect(result.workbench.summary).toMatchObject({
      reviewItems: 1,
      evidenceReview: 6,
      promotionReview: 0,
      blocked: 0,
      approvedPublic: 1,
      appDiscoverable: 0,
      publicationReviewPackets: 1,
    });
    expect(result.workbench.publicationReviewPackets.summary).toMatchObject({
      packets: 1,
      published: 1,
      evidenceRecords: 6,
      manualReportsWithoutArtifacts: 2,
    });
  });

  it.each([
    {
      decision: "approve_public",
      packetStatus: "published",
      publishStatus: "published",
      indexStatus: "indexed",
    },
    {
      decision: "hold",
      packetStatus: "ready_for_manual_publication_review",
      publishStatus: "draft",
      indexStatus: "noindex",
    },
    {
      decision: "suppress",
      packetStatus: "suppressed",
      publishStatus: "suppressed",
      indexStatus: "noindex",
    },
  ])("normalizes the exact legacy $decision packet shape", async ({
    decision,
    packetStatus,
    publishStatus,
    indexStatus,
  }) => {
    const run = operationRun(
      "indore-run",
      "indore",
      "2026-07-24T12:01:00.000Z"
    );
    const packet = organizerPacketWorkItem("afterfly", "indore");
    const intake = packet.normalizedPayload.intake as {
      packet: {
        status: string;
        publicPresence: Record<string, unknown>;
        adminDecision: {
          currentDecision: Record<string, unknown>;
        };
      };
    };
    intake.packet.status = packetStatus;
    delete intake.packet.publicPresence.publishStatus;
    intake.packet.publicPresence.indexStatus = indexStatus;
    intake.packet.adminDecision.currentDecision.decision = decision;
    delete intake.packet.adminDecision.currentDecision.publishStatus;
    delete intake.packet.adminDecision.currentDecision.indexStatus;
    mocks.listIntakeOperations.mockImplementation(async (
      payload: {runId?: string}
    ) => operationResponse({
      runs: [run],
      workItems: payload.runId ? [packet] : [],
    }));

    const result = await loadOrganizerIntakeBridge();

    expect(result.workbench.items[0]).toMatchObject({
      entityId: "afterfly",
      publishStatus,
      indexStatus,
      appVisibility: "hidden",
    });
    expect(result.workbench.publicationReviewPackets.packets[0])
      .toMatchObject({
        publicPresence: {
          publishStatus,
          indexStatus,
          appVisibility: "hidden",
        },
        adminDecision: {
          currentDecision: {
            decision,
            publishStatus,
            indexStatus,
            appVisibility: "hidden",
          },
        },
      });
  });

  it("normalizes an undecided legacy packet without creating a decision",
    async () => {
      const run = operationRun(
        "indore-run",
        "indore",
        "2026-07-24T12:01:00.000Z"
      );
      const packet = organizerPacketWorkItem("afterfly", "indore");
      const intake = packet.normalizedPayload.intake as {
        packet: {
          status: string;
          publicPresence: Record<string, unknown>;
          adminDecision: {
            currentDecision: Record<string, unknown> | null;
          };
        };
      };
      intake.packet.status = "ready_for_manual_publication_review";
      delete intake.packet.publicPresence.publishStatus;
      intake.packet.publicPresence.indexStatus = "noindex";
      intake.packet.adminDecision.currentDecision = null;
      mocks.listIntakeOperations.mockImplementation(async (
        payload: {runId?: string}
      ) => operationResponse({
        runs: [run],
        workItems: payload.runId ? [packet] : [],
      }));

      const result = await loadOrganizerIntakeBridge();

      expect(result.workbench.items[0]).toMatchObject({
        publishStatus: "draft",
        indexStatus: "noindex",
        appVisibility: "hidden",
        reviewDecision: null,
      });
      expect(result.workbench.publicationReviewPackets.packets[0])
        .toMatchObject({
          publicPresence: {
            publishStatus: "draft",
            indexStatus: "noindex",
            appVisibility: "hidden",
          },
          adminDecision: {currentDecision: null},
        });
    });

  it("rejects contradictory legacy visibility instead of inventing state",
    async () => {
      const run = operationRun(
        "indore-run",
        "indore",
        "2026-07-24T12:01:00.000Z"
      );
      const packet = organizerPacketWorkItem("afterfly", "indore");
      const intake = packet.normalizedPayload.intake as {
        packet: {
          publicPresence: Record<string, unknown>;
          adminDecision: {
            currentDecision: Record<string, unknown>;
          };
        };
      };
      delete intake.packet.publicPresence.publishStatus;
      intake.packet.publicPresence.indexStatus = "noindex";
      delete intake.packet.adminDecision.currentDecision.publishStatus;
      delete intake.packet.adminDecision.currentDecision.indexStatus;
      mocks.listIntakeOperations.mockImplementation(async (
        payload: {runId?: string}
      ) => operationResponse({
        runs: [run],
        workItems: payload.runId ? [packet] : [],
      }));

      await expect(loadOrganizerIntakeBridge()).rejects.toThrow(
        "invalid publication packet projection"
      );
    });

  it("rejects malformed publication packet projections", async () => {
    const run = operationRun(
      "indore-run",
      "indore",
      "2026-07-24T12:01:00.000Z"
    );
    const packet = organizerPacketWorkItem("afterfly", "indore");
    const intake = packet.normalizedPayload.intake as {
      packet: Record<string, unknown>;
    };
    delete intake.packet.approvalChecklist;
    mocks.listIntakeOperations.mockImplementation(async (
      payload: {runId?: string}
    ) => operationResponse({
      runs: [run],
      workItems: payload.runId ? [packet] : [],
    }));

    await expect(loadOrganizerIntakeBridge()).rejects.toThrow(
      "invalid publication packet projection"
    );
  });

  it("retains mixed and all-invalid page diagnostics while draining raw cursors", async () => {
    const run = operationRun("indore-run", "indore", "2026-07-24T12:01:00.000Z");
    const candidate = organizerWorkItem("indore", 1);
    const packet = organizerPacketWorkItem("healthy", "indore");
    const badA = unavailable("legacy-packet-a");
    const badB = unavailable("legacy-packet-b");
    const first = operationResponse({runs: [run], workItems: [candidate, packet]});
    const summary = {...first.summary, workItemCount: 4};
    mocks.listIntakeOperations
      .mockResolvedValueOnce(operationResponse({runs: [run], workItems: []}))
      .mockResolvedValueOnce({...first, summary,
        workItemPage: {scannedCount: 3, unavailableRecords: [badA]},
        nextWorkItemCursor: " legacy-packet-a "})
      .mockResolvedValueOnce({...first, summary, workItems: [],
        workItemPage: {scannedCount: 1, unavailableRecords: [badB]},
        nextWorkItemCursor: null});

    const result = await loadOrganizerIntakeBridge();

    expect(result.workbench.searchCandidates.candidates).toHaveLength(1);
    expect(result.workbench.items).toHaveLength(1);
    expect(result.workbench.unavailableRecords).toEqual([badA, badB]);
    expect(result.workbench.summary.reviewItems).toBeNull();
    expect(result.workbench.summary.publicationReviewPackets).toBeUndefined();
    expect(result.workbench.summary.publicationReviewReady).toBeUndefined();
    expect(result.workbench.summary.publicationReviewBlockedByData).toBeUndefined();
    expect(result.workbench.publicationReviewPackets.summary.packets).toBeNull();
    expect(result.workbench.publicationReviewPackets.summary.published).toBeNull();
    expect(mocks.listIntakeOperations.mock.calls[2]?.[0]).toMatchObject({
      runId: "indore-run", workItemCursor: " legacy-packet-a ",
    });
  });

  it("keeps an all-invalid organizer run explicitly unavailable", async () => {
    const run = operationRun("indore-run", "indore", "2026-07-24T12:01:00.000Z");
    const bad = unavailable("legacy-packet");
    const inventory = operationResponse({runs: [run], workItems: []});
    mocks.listIntakeOperations
      .mockResolvedValueOnce(inventory)
      .mockResolvedValueOnce({...inventory,
        summary: {...inventory.summary, workItemCount: 1},
        workItemPage: {scannedCount: 1, unavailableRecords: [bad]}});

    const result = await loadOrganizerIntakeBridge();
    expect(result.workbench.items).toEqual([]);
    expect(result.workbench.unavailableRecords).toEqual([bad]);
    expect(result.workbench.publicationReviewPackets.summary.packets).toBeNull();
    expect(result.availability.publicationPackets).toBe(false);
  });

  it.each(["cursor", "run", "summary", "empty scan"])(
    "rejects organizer %s drift instead of discarding unavailable diagnostics", async (drift) => {
      const run = operationRun("indore-run", "indore", "2026-07-24T12:01:00.000Z");
      const inventory = operationResponse({runs: [run], workItems: []});
      const first = {...inventory, summary: {...inventory.summary, workItemCount: 2},
        workItemPage: {scannedCount: 1, unavailableRecords: [unavailable("bad-1")]},
        nextWorkItemCursor: "bad-1"};
      const next = {...first,
        workItemPage: {scannedCount: 1, unavailableRecords: [unavailable("bad-2")]},
        nextWorkItemCursor: null as string | null};
      if (drift === "cursor") next.nextWorkItemCursor = "bad-1";
      if (drift === "run") next.runs = [{...run, runId: "other-run"}];
      if (drift === "summary") next.summary = {...next.summary, workItemCount: 3};
      if (drift === "empty scan") {
        next.workItemPage = {scannedCount: 0, unavailableRecords: []};
        next.nextWorkItemCursor = "bad-2";
      }
      mocks.listIntakeOperations
        .mockResolvedValueOnce(inventory)
        .mockResolvedValueOnce(first)
        .mockResolvedValueOnce(next);
      await expect(loadOrganizerIntakeBridge()).rejects.toThrow();
    }
  );

  it("propagates query failures even after an unavailable page", async () => {
    const run = operationRun("indore-run", "indore", "2026-07-24T12:01:00.000Z");
    const inventory = operationResponse({runs: [run], workItems: []});
    const failure = new Error("transport unavailable");
    mocks.listIntakeOperations
      .mockResolvedValueOnce(inventory)
      .mockResolvedValueOnce({...inventory,
        workItemPage: {scannedCount: 1, unavailableRecords: [unavailable("bad")]},
        nextWorkItemCursor: "bad"})
      .mockRejectedValueOnce(failure);
    await expect(loadOrganizerIntakeBridge()).rejects.toBe(failure);
  });

});

function operationRun(runId: string, market: string, updatedAt: string) {
  return {
    schemaVersion: 1,
    runId,
    workflowId: "supply-intake",
    revision: 0,
    mode: "shadow",
    status: "completed",
    scope: {market, intakeScope: "organizer"},
    rulesetVersion: "supply-intake-v0.1.0",
    policyVersion: "supply-intake-shadow-policy-v1",
    inputHash: "a".repeat(64),
    budgets: {
      maxWorkItems: 1000,
      maxModelCalls: 0,
      maxModelTokens: 0,
      maxCostMicros: 0,
      deadlineAt: null,
    },
    counters: {
      discovered: 25,
      processed: 0,
      modelCalls: 0,
      modelTokens: 0,
      costMicros: 0,
      escalated: 25,
      published: 0,
      failed: 0,
    },
    checkpoint: {lastSequence: 1, cursor: null},
    createdAt: updatedAt,
    updatedAt,
    startedAt: updatedAt,
    finishedAt: updatedAt,
    failure: null,
    metadata: {},
  };
}

function organizerWorkItem(market: string, rank: number) {
  const candidateId = `${market}-candidate-${rank}`;
  return {
    schemaVersion: 1,
    workItemId: `wi-${candidateId}`,
    workflowId: "supply-intake",
    runId: `${market}-run`,
    entityKind: "organizer",
    externalKey: candidateId,
    revision: 0,
    candidateHash: "b".repeat(64),
    primaryStage: "incoming",
    lifecycleStatus: "queued",
    outcome: null,
    taskFlags: ["human_review_required"],
    blockerCodes: [],
    warningCodes: [],
    priority: 400000,
    attemptCount: 1,
    evidenceRefs: [],
    fieldProvenance: [],
    normalizedPayload: {
      intake: {
        recordType: "organizer_search_candidate",
        candidate: {
          candidateId,
          batchId: `batch-${market}`,
          resultId: candidateId,
          rank,
          query: `${market} organizers`,
          queryIntent: {
            activityKind: "organizer-discovery",
            entityHint: null,
            marketSlug: market,
          },
          observedAt: "2026-07-24",
          title: `${market} candidate ${rank}`,
          snippet: "Evidence.",
          url: `https://${candidateId}.example/`,
          canonicalUrl: `https://${candidateId}.example/`,
          platform: "officialWebsite",
          surfaceKind: "website",
          normalizedKey: `domain:${candidateId}.example`,
          suggestedSurface: {
            confidence: {city: "high", entityMatch: "medium", ownership: "low"},
          },
          existingEntityMatches: [],
          reviewAction: "verify_ownership_before_attach",
          diagnostics: [],
        },
      },
    },
    decisionId: null,
    publicationPlanId: null,
    createdAt: "2026-07-24T12:00:00.000Z",
    updatedAt: "2026-07-24T12:00:00.000Z",
    staleAt: null,
    expiresAt: null,
  };
}

function organizerPacketWorkItem(entityId: string, market: string) {
  return {
    ...organizerWorkItem(market, 99),
    workItemId: `wi-packet-${entityId}`,
    externalKey: entityId,
    primaryStage: "ready",
    lifecycleStatus: "ready",
    normalizedPayload: {
      intake: {
        recordType: "organizer_publication_packet",
        packet: {
          packetId: `packet-${entityId}`,
          entityId,
          canonicalHostId: entityId,
          displayName: "AFTER FLY",
          status: "published",
          priority: "p1",
          markets: [{slug: market, displayName: "Indore"}],
          blockers: [],
          dataBlockers: [],
          evidenceBlockers: [],
          approvalChecklist: {
            crawlDisabledReviewed: true,
            identityReviewed: true,
            marketScopeReviewed: true,
            mediaRightsReviewed: true,
            ownerSafeCopyReviewed: true,
            surfaceInventoryReviewed: true,
          },
          evidenceSummary: {
            records: 6,
            manualReportsWithoutArtifacts: 2,
            unresolvedLocalRefs: 0,
            missingSurfaceEvidence: 0,
            rawProviderArtifactRefs: 0,
            firestoreForbiddenArtifactRefs: 0,
            riskFlags: ["manual_report_without_artifact"],
          },
          publicPresence: {
            canonicalPath: "/organizers/afterfly/",
            claimTargetPath: "clubs/afterfly",
            publishStatus: "published",
            indexStatus: "indexed",
            appVisibility: "hidden",
            projectionStatus: "ready",
          },
          adminDecision: {
            allowedDecisions: ["approve_public", "hold", "suppress"],
            defaultAppVisibility: "hidden",
            currentDecision: {
              decision: "approve_public",
              publishStatus: "published",
              indexStatus: "indexed",
              decidedAt: "2026-06-18",
              appVisibility: "hidden",
            },
          },
          nextActions: ["review_publication_packet"],
        },
      },
    },
  };
}

function operationResponse({
  runs,
  workItems,
  organizerDraftLinks = [],
}: {
  runs: unknown[];
  workItems: unknown[];
  organizerDraftLinks?: unknown[];
}) {
  return {
    schemaVersion: 1,
    generatedAt: "2026-07-24T12:02:00.000Z",
    workflowId: "supply-intake",
    executionMode: "shadow",
    source: "firestore",
    capabilities: {
      requestRuns: false,
      networkFetches: false,
      modelCalls: false,
      publicWrites: false,
      ruleDeployment: false,
    },
    summary: {
      loadedRunCount: runs.length,
      workItemCount: workItems.length,
      humanReviewCount: workItems.length,
      stages: {
        incoming: workItems.length,
        verify: 0,
        resolve: 0,
        ready: 0,
      },
    },
    runs,
    workItems,
    organizerDraftLinks,
    nextRunCursor: null,
    nextWorkItemCursor: null,
  };
}


function unavailable(documentId: string) {
  return {documentId, reason: "invalid_record" as const,
    issues: [{path: "/normalizedPayload/intake/packet/publicPresence",
      code: "required"}], issuesTruncated: false};
}
