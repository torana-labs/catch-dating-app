import {onCall, CallableRequest, HttpsError} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {FirestoreOperationsRepository} from
  "../operations/firestoreRepository";
import {OperationRun, OperationWorkItem} from "../operations/models";
import {
  OperationRunRepository,
  OperationWorkItemRepository,
} from "../operations/repositories";
import {canonicalMarkets} from "../locations/marketConfig";
import {requireAdminRole} from "../platform/adminAuth";

const eventIntakeRoles = ["admin", "adminOwner", "support"] as const;
const supplyIntakeWorkflowId = "supply-intake";
const launchMarketSlugs = new Set(
  canonicalMarkets
    .filter((market) => market.launchStatus === "launched")
    .map((market) => market.slug)
);

type EventIntakeOperationsRepository =
  OperationRunRepository & OperationWorkItemRepository;

interface EventIntakeDashboardDeps {
  firestore: () => FirebaseFirestore.Firestore;
  repository?: EventIntakeOperationsRepository;
  now?: () => Date;
  loadOrganizerCeilings?: (
    db: FirebaseFirestore.Firestore,
    organizerIds: string[]
  ) => Promise<Map<string, OrganizerCeiling>>;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

interface OrganizerCeiling {
  appVisibility: "discoverable" | "hidden" | null;
}

const defaultDeps: EventIntakeDashboardDeps = {
  firestore: () => admin.firestore(),
  now: () => new Date(),
  checkRateLimit: defaultCheckRateLimit,
};

export interface AdminGetEventIntakeDashboardResponse {
  bridge: Record<string, unknown>;
}

/**
 * Projects Event Intake directly from completed Supply Intake runs and work
 * items. There is no mutable dashboard document or repository artifact in this
 * read path.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {EventIntakeDashboardDeps} deps Injectable dependencies.
 * @return {Promise<AdminGetEventIntakeDashboardResponse>} Event bridge.
 */
export async function adminGetEventIntakeDashboardHandler(
  request: CallableRequest<unknown>,
  deps: EventIntakeDashboardDeps = defaultDeps
): Promise<AdminGetEventIntakeDashboardResponse> {
  const adminContext = requireAdminRole(request, eventIntakeRoles);
  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    adminContext.uid,
    "adminGetEventIntakeDashboard",
    {maxRequests: 60, windowMs: 60 * 1000}
  );

  const repository = deps.repository ??
    new FirestoreOperationsRepository(db);
  const runsPage = await repository.listRuns({
    workflowId: supplyIntakeWorkflowId,
    status: "completed",
    limit: 200,
  });
  const runs = latestEventRunPerLaunchMarket(runsPage.items);
  const workItems = (
    await Promise.all(runs.map((run) =>
      loadRunWorkItems(repository, run.runId)))
  ).flat();
  const generatedAt = runs[0]?.updatedAt ??
    (deps.now?.() ?? new Date()).toISOString();
  const projectedBridge =
    projectOperationsBridge({runs, workItems, generatedAt});
  const organizerIds = eventOrganizerIds(projectedBridge);
  const organizerCeilings = deps.loadOrganizerCeilings ?
    await deps.loadOrganizerCeilings(db, organizerIds) :
    await loadOrganizerCeilings(db, organizerIds);
  return {
    bridge: attachOrganizerCeilings(projectedBridge, organizerCeilings),
  };
}

function latestEventRunPerLaunchMarket(runs: OperationRun[]): OperationRun[] {
  const latest = new Map<string, OperationRun>();
  for (const run of runs) {
    const market = nonEmptyString(run.scope.market);
    if (
      run.mode !== "shadow" ||
      run.status !== "completed" ||
      run.scope.intakeScope === "organizer" ||
      !market ||
      !launchMarketSlugs.has(market) ||
      latest.has(market)
    ) {
      continue;
    }
    latest.set(market, run);
  }
  return [...latest.values()].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt) ||
    right.runId.localeCompare(left.runId)
  );
}

async function loadRunWorkItems(
  repository: EventIntakeOperationsRepository,
  runId: string
): Promise<OperationWorkItem[]> {
  const workItems = new Map<string, OperationWorkItem>();
  const cursors = new Set<string>();
  let cursor: string | null = null;
  do {
    const page = await repository.listWorkItems({
      workflowId: supplyIntakeWorkflowId,
      runId,
      limit: 200,
      cursor,
    });
    for (const item of page.items) {
      if (
        item.workflowId !== supplyIntakeWorkflowId ||
        item.runId !== runId
      ) {
        throw new HttpsError(
          "failed-precondition",
          `Event Intake work item ${item.workItemId} has an invalid run join.`
        );
      }
      workItems.set(item.workItemId, item);
    }
    cursor = page.nextCursor;
    if (cursor && cursors.has(cursor)) {
      throw new HttpsError(
        "failed-precondition",
        `Event Intake pagination stalled for run ${runId}.`
      );
    }
    if (cursor) cursors.add(cursor);
  } while (cursor);
  return [...workItems.values()];
}

function projectOperationsBridge({
  runs,
  workItems,
  generatedAt,
}: {
  runs: OperationRun[];
  workItems: OperationWorkItem[];
  generatedAt: string;
}): Record<string, unknown> {
  const sourceProfiles = new Map<string, Record<string, unknown>>();
  const sourceResults = new Map<string, Record<string, unknown>>();
  const eventCandidates = new Map<string, Record<string, unknown>>();
  for (const item of workItems) {
    const intake = recordValue(item.normalizedPayload.intake);
    if (!intake) continue;
    const recordType = nonEmptyString(intake.recordType);
    if (recordType === "event_source_profile") {
      addProjection(sourceProfiles, intake.profile, item, "source profile");
    } else if (recordType === "event_source_result") {
      addProjection(sourceResults, intake.result, item, "source result");
    } else if (
      recordType === "event_candidate" ||
      recordType === "orphan_event_candidate"
    ) {
      addProjection(
        eventCandidates,
        {
          ...(recordValue(intake.candidate) ?? {}),
          expiresAt: item.expiresAt,
          operationRunId: item.runId,
          observedAt: item.evidenceRefs[0]?.observedAt ?? item.createdAt,
        },
        item,
        "event candidate"
      );
    }
  }
  const profiles = [...sourceProfiles.values()].sort(compareById);
  const results = [...sourceResults.values()].sort(compareById);
  const candidates = [...eventCandidates.values()].sort(
    (left, right) =>
      String(left.startDate ?? "").localeCompare(
        String(right.startDate ?? "")
      ) ||
      String(left.title ?? "").localeCompare(String(right.title ?? "")) ||
      String(left.id).localeCompare(String(right.id))
  );
  const generatedDate = generatedAt.slice(0, 10);
  return {
    schemaVersion: 1,
    program: "catch-event-intake",
    generatedAt,
    bridgeSource: runs.length > 0 ? "operations" : "empty",
    city: {
      id: "launch-markets",
      label: "Launch markets",
      timezone: "Asia/Kolkata",
    },
    weekStart: generatedDate,
    summary: {
      status: runs.length > 0 ? "ready" : "empty",
      sourceProfiles: profiles.length,
      queryTemplates: 0,
      sourceResults: results.length,
      sourceResultsNeedingReview: results.filter((result) =>
        !["approved", "rejected"].includes(String(result.status))).length,
      eventCandidates: candidates.length,
      approvedCandidates: candidates.filter((candidate) =>
        candidate.reviewState === "approved").length,
      candidatesNeedingReview: candidates.filter((candidate) =>
        !["approved", "rejected"].includes(
          String(candidate.reviewState)
        )).length,
      orphanCandidates: candidates.filter((candidate) =>
        candidate.publicationEligibility === "blocked_orphan").length,
      recommendationSets: 0,
      contentDrafts: 0,
      exportReadyDrafts: 0,
    },
    guardrails: [
      "Event Intake is projected from immutable completed Supply Intake runs.",
      "This view is read-only; it does not publish an event.",
    ],
    sourceProfiles: profiles,
    queryTemplates: [],
    runPlan: {
      id: runs.length > 0 ?
        `supply-intake:${runs.map((run) => run.runId).join(",")}` :
        "supply-intake:empty",
      cityId: "launch-markets",
      weekStart: generatedDate,
      status: runs.length > 0 ? "ready" : "not_configured",
      generatedAt,
      schedule: {
        cadence: "per_source_policy",
        publishDay: "continuous",
        lookaheadDays: 7,
      },
      budgets: {
        maxQueries: 0,
        maxSourceResults: results.length,
        maxCandidatePool: candidates.length,
      },
      automationPolicy: {
        searchProvider: "operations",
        networkFetchesEnabled: false,
        instagramScrapingEnabled: false,
        requiresHumanApprovalBeforePublish: true,
      },
      queryIds: [],
      sourceProfileIds: profiles.map((profile) => String(profile.id)),
    },
    sourceResults: results,
    eventCandidates: candidates,
    dedupeGroups: [],
    auditTrail: [],
    commands: {},
  };
}

function eventOrganizerIds(
  bridge: Record<string, unknown>
): string[] {
  return [...new Set(asArray(bridge.eventCandidates).flatMap((value) => {
    const candidate = recordValue(value);
    const attribution = recordValue(candidate?.attribution);
    const match = recordValue(attribution?.match);
    const organizerId = nonEmptyString(match?.matchedEntityId);
    return organizerId ? [organizerId] : [];
  }))].sort();
}

async function loadOrganizerCeilings(
  db: FirebaseFirestore.Firestore,
  organizerIds: string[]
): Promise<Map<string, OrganizerCeiling>> {
  if (organizerIds.length === 0) return new Map();
  const refs = organizerIds.map((organizerId) =>
    db.collection("organizers").doc(organizerId));
  const snapshots = await db.getAll(...refs);
  return new Map(snapshots.map((snapshot, index) => {
    const data = snapshot.exists ? snapshot.data() ?? {} : {};
    const appVisibility = data.appVisibility === "discoverable" ||
      data.appVisibility === "hidden" ?
      data.appVisibility :
      null;
    return [organizerIds[index], {appVisibility}];
  }));
}

export function attachOrganizerCeilings(
  bridge: Record<string, unknown>,
  ceilings: Map<string, OrganizerCeiling>
): Record<string, unknown> {
  return {
    ...bridge,
    eventCandidates: asArray(bridge.eventCandidates).map((value) => {
      const candidate = recordValue(value) ?? {};
      const attribution = recordValue(candidate.attribution);
      const match = recordValue(attribution?.match);
      const organizerId = nonEmptyString(match?.matchedEntityId);
      const appVisibility = organizerId ?
        ceilings.get(organizerId)?.appVisibility ?? null :
        null;
      return {
        ...candidate,
        organizerCeiling: {
          organizerId,
          appVisibility,
          canAppDiscover: appVisibility === "discoverable",
          reason: !organizerId ?
            "Attribute a canonical organizer before app visibility can " +
              "be reviewed." :
            appVisibility === "discoverable" ?
              "The attributed organizer permits app discovery." :
              appVisibility === "hidden" ?
                "The attributed organizer is hidden in the app." :
                "The attributed organizer visibility could not be verified.",
        },
      };
    }),
  };
}

function addProjection(
  target: Map<string, Record<string, unknown>>,
  value: unknown,
  item: OperationWorkItem,
  label: string
): void {
  const record = recordValue(value);
  const id = nonEmptyString(record?.id);
  if (!record || !id) {
    throw new HttpsError(
      "failed-precondition",
      `Event work item ${item.workItemId} has an invalid ${label} projection.`
    );
  }
  target.set(id, record);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function recordValue(
  value: unknown
): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ?
    value as Record<string, unknown> :
    null;
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function compareById(
  left: Record<string, unknown>,
  right: Record<string, unknown>
): number {
  return String(left.id).localeCompare(String(right.id));
}

export const adminGetEventIntakeDashboard = onCall(
  appCheckCallableOptions,
  (request) => adminGetEventIntakeDashboardHandler(request)
);
