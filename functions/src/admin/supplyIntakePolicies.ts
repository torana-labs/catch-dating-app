/* eslint-disable max-len */
import path from "node:path";
import {pathToFileURL} from "node:url";
import * as admin from "firebase-admin";
import {CallableRequest, onCall} from "firebase-functions/v2/https";
import {appCheckCallableOptions} from "../shared/callableOptions";
import type {AdminListSupplyIntakePoliciesCallableResponse} from "../shared/generated/adminListSupplyIntakePoliciesCallableResponse";
import {validateAdminListSupplyIntakePoliciesCallablePayload} from "../shared/generated/validators/adminListSupplyIntakePoliciesInput";
import {validateCallableWithAjv} from "../shared/validation";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {requireAdminRole} from "./adminAuth";
import {decisionIdForPolicyGap} from "./organizerPolicyGap";

// The Supply Intake capabilities that stay off until the owner records a
// decision, what each would let Catch do, and where it is switched on. A
// recorded acceptance changes nothing by itself: the policy file must then
// cite it, in a reviewed change.

const reviewRoles = ["admin", "adminOwner", "support"] as const;

type Response = AdminListSupplyIntakePoliciesCallableResponse;
type Policy = Response["policies"][number];

interface PolicyConfig {
  gapId: string;
  enabled: boolean;
  decisionId: string | null;
  limits: Array<{label: string; value: number}>;
}

interface PackagedPolicies {
  loadSupplyAcquisitionPolicy: () => Promise<{
    provider: {enabled: boolean; policyGapId: string; decisionId: string | null};
    pageFetch: {enabled: boolean; policyGapId: string; decisionId: string | null;
      maxRequestsPerIntake: number; maxRequestsPerMonth: number};
  }>;
  loadResearchAgentPolicy: () => Promise<{agent?: Record<string, unknown>; [key: string]: unknown}>;
  loadSupplyModelPolicy: () => Promise<{provider?: Record<string, unknown>; [key: string]: unknown}>;
}

const policyText: Record<string, {label: string; enables: string; configPath: string}> = {
  on_demand_page_fetch_policy: {
    label: "Read the pages a nomination names",
    enables: "When someone nominates an organizer, Catch fetches the public pages they gave (a Luma calendar, an " +
      "Instagram profile) to build the listing and find upcoming events. Without it a nominated listing has no " +
      "events and every link is left for research.",
    configPath: "operations/src/workflows/supply-intake/config/acquisition_policy.json (pageFetch)",
  },
  recurring_event_crawl_policy: {
    label: "Check listed organizers for new events on a schedule",
    enables: "A provider re-reads listed organizers' calendars on a schedule so their pages stay current.",
    configPath: "operations/src/workflows/supply-intake/config/acquisition_policy.json (provider)",
  },
  agent_research_policy: {
    label: "Research gaps with the agent",
    enables: "A bounded Claude agent fills listing gaps (official site, socials, other calendars), citing the page " +
      "and the quoted text for every fact, within the monthly spend ceiling.",
    configPath: "operations/src/workflows/supply-intake/config/agent_policy.json",
  },
  llm_extraction_fallback_policy: {
    label: "Read pages no adapter understands",
    enables: "A model extracts organizer and event facts from a page when no deterministic adapter can.",
    configPath: "operations/src/workflows/supply-intake/config/model_policy.json",
  },
};

interface Deps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit?: typeof defaultCheckRateLimit;
  loadConfigs?: () => Promise<PolicyConfig[]>;
}

const defaultDeps: Deps = {
  firestore: () => admin.firestore(),
  checkRateLimit: defaultCheckRateLimit,
};

/** Each Supply Intake capability that needs the owner's decision, with its decision and whether it is on. */
export async function adminListSupplyIntakePoliciesHandler(
  request: CallableRequest<unknown>,
  deps: Deps = defaultDeps
): Promise<Response> {
  const adminContext = requireAdminRole(request, reviewRoles);
  validateCallableWithAjv(request, validateAdminListSupplyIntakePoliciesCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    adminContext.uid,
    "adminListSupplyIntakePolicies",
    {maxRequests: 60, windowMs: 60 * 1000}
  );
  const configs = await (deps.loadConfigs ?? loadConfigs)();
  const decisions = await Promise.all(configs.map((config) =>
    db.collection("organizerPolicyGapReviewDecisions").doc(decisionIdForPolicyGap(config.gapId)).get()));
  const policies: Policy[] = configs.map((config, index) => {
    const text = policyText[config.gapId];
    const decision = decisions[index].exists ? decisions[index].data() ?? {} : null;
    const decisionId = decisionIdForPolicyGap(config.gapId);
    return {
      gapId: config.gapId,
      label: text?.label ?? config.gapId,
      enables: text?.enables ?? "",
      configPath: text?.configPath ?? "",
      decisionId,
      decision: decision ? {
        decision: String(decision.decision) as NonNullable<Policy["decision"]>["decision"],
        decisionStatus: String(decision.decisionStatus) as NonNullable<Policy["decision"]>["decisionStatus"],
        note: typeof decision.note === "string" ? decision.note.slice(0, 1000) : "",
        reviewedAt: timestampIso(decision.reviewedAt),
      } : null,
      enabled: config.enabled,
      configCitesDecision: config.decisionId === decisionId,
      limits: config.limits,
    };
  });
  return {policies};
}

export const adminListSupplyIntakePolicies = onCall(appCheckCallableOptions,
  (request) => adminListSupplyIntakePoliciesHandler(request));

async function loadConfigs(): Promise<PolicyConfig[]> {
  const root = path.resolve(__dirname, "..", "operations", "src", "workflows", "supply-intake");
  const [acquisition, agent, model] = await Promise.all(["acquisition.mjs", "research-agent.mjs",
    "model-fallback.mjs"].map((file) => import(pathToFileURL(path.join(root, file)).href)));
  const runtime = {...acquisition, ...agent, ...model} as PackagedPolicies;
  const [acquisitionPolicy, agentPolicy, modelPolicy] = await Promise.all([runtime.loadSupplyAcquisitionPolicy(),
    runtime.loadResearchAgentPolicy(), runtime.loadSupplyModelPolicy()]);
  const switchOf = (value: unknown) => {
    const record = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
    return {gapId: String(record.policyGapId), enabled: record.enabled === true,
      decisionId: typeof record.decisionId === "string" ? record.decisionId : null};
  };
  return [
    {...switchOf(acquisitionPolicy.pageFetch), limits: [
      {label: "Pages per nomination", value: acquisitionPolicy.pageFetch.maxRequestsPerIntake},
      {label: "Pages per month", value: acquisitionPolicy.pageFetch.maxRequestsPerMonth}]},
    {...switchOf(acquisitionPolicy.provider), limits: []},
    {...switchOf(agentPolicy.agent ?? agentPolicy), limits: []},
    {...switchOf(modelPolicy.provider ?? modelPolicy), limits: []},
  ];
}

function timestampIso(value: unknown): string | null {
  const stamp = value as {toDate?: () => Date; _seconds?: number} | undefined;
  if (stamp?.toDate) return stamp.toDate().toISOString();
  if (typeof stamp?._seconds === "number") return new Date(stamp._seconds * 1000).toISOString();
  return null;
}
