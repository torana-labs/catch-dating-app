import {CallableRequest} from "firebase-functions/v2/https";
import {
  executeAiRead,
  defaultAiFallbackDeps,
  type AiFallbackDeps,
  type AiReadPolicy,
} from "../commands/aiFallback/runner";
import {
  AI_FALLBACK_MODEL_ID,
  AI_FALLBACK_POLICY,
  readAiFallbackOverride,
} from "../commands/aiFallback/policy";
import {anthropicFederationConfig, tokenSourceFor} from
  "../platform/anthropicIdentity";
import {guestMappingTestRequest} from "../guestImport/mappingFallback";
import type {AdminAiFallbackTestCallCallablePayload} from
  "../shared/generated/adminAiFallbackTestCallCallablePayload";
import type {AdminAiFallbackTestCallCallableResponse} from
  "../shared/generated/adminAiFallbackTestCallCallableResponse";
import {validateAdminAiFallbackTestCallCallablePayload} from
  "../shared/generated/validators/adminAiFallbackTestCallInput";
import {
  callableWithLimits,
  type CallableContext,
  type CallableSpec,
  runCallable,
} from "../platform/callables/callable";
import {adminRoles} from "../platform/callables/policies";
import type {AdminContext} from "../platform/adminAuth";

// The owner's live test of the AI fallback's federated sign-in (#2062),
// before anything is switched on for visitors. One fixed, fictional
// guest-mapping request (three headers and their shapes, no values) goes
// through the same read path visitors will use: the federation token, the
// Anthropic adapter, the per-call ceiling, the durable monthly cap and an
// audit row marked test. It ignores whether the visitor fallback is on, but
// refuses without the federation params. No cache: every test is a real,
// paid call. dryRun stops after the token exchange and spends nothing.
//
// It runs as the default Functions runtime identity, the same identity the
// try-it import callables use, so a passing test proves the identity the
// fallback will call with. Errors name the step and the HTTP status, never
// a token.

export const AI_FALLBACK_TEST_COMMAND_ID = "admin.ai-fallback-test";
/** Paid tests per admin per UTC day, through the ledger's daily counter. */
export const AI_FALLBACK_TEST_DAILY_CALLS = 5;
const TEST_MAX_OUTPUT_TOKENS = 256;
/** One test's ceiling: the reservation is far below this. */
const TEST_MAX_COST_MICROS = 200_000;
const roles = ["admin", "adminOwner"] as const;

type Response = AdminAiFallbackTestCallCallableResponse;
type Step = NonNullable<Response["failedStep"]>;

export interface AiFallbackTestDeps {
  read: () => AiFallbackDeps;
  /** The federation config, or null while either param is blank. */
  federation: () => {federationRuleId: string; organizationId: string} | null;
  /** A short-lived access token for the config. */
  accessToken: (config: {federationRuleId: string;
    organizationId: string}) => Promise<string>;
  nowMillis: () => number;
}

const defaultDeps: AiFallbackTestDeps = {
  read: defaultAiFallbackDeps,
  federation: anthropicFederationConfig,
  accessToken: (config) => tokenSourceFor(config).accessToken(),
  nowMillis: () => Date.now(),
};

/** Which token step failed, from the token source's step-naming error. */
function tokenStep(error: unknown): {step: Step; httpStatus: number | null} {
  const message = error instanceof Error ? error.message : "";
  const status = /status (\d{3})/u.exec(message);
  return {step: message.includes("identity token") ? "token_mint" :
    "token_exchange", httpStatus: status ? Number(status[1]) : null};
}

/** The step a provider failure belongs to, by its code. */
function providerStep(code: string): Step {
  return code === "MODEL_PROVIDER_OUTPUT_INVALID" ||
    code === "MODEL_PROVIDER_RESULT_INVALID" ? "schema" : "messages_call";
}

/**
 * Makes one live test call through the AI fallback's federated sign-in.
 * Policy: roles (STR-10).
 * @param {AiFallbackTestDeps} deps Dependencies.
 * @return {CallableSpec} The callable.
 */
export function adminAiFallbackTestCallSpec(
  deps: AiFallbackTestDeps = defaultDeps):
  CallableSpec<AdminAiFallbackTestCallCallablePayload, AdminContext, Response> {
  return {
    name: "adminAiFallbackTestCall",
    policy: adminRoles(roles),
    input: validateAdminAiFallbackTestCallCallablePayload,
    handle: (context) => adminAiFallbackTestCallWork(context, deps),
  };
}

/** The deployed path of adminAiFallbackTestCall, for tests. */
export function adminAiFallbackTestCallHandler(
  request: CallableRequest<unknown>, deps: AiFallbackTestDeps = defaultDeps):
  Promise<Response> {
  return runCallable(adminAiFallbackTestCallSpec(deps), request);
}

async function adminAiFallbackTestCallWork(
  {data, actor: adminContext}:
    CallableContext<AdminAiFallbackTestCallCallablePayload, AdminContext>,
  deps: AiFallbackTestDeps):
  Promise<Response> {
  const started = deps.nowMillis();
  const base = {ok: false, dryRun: data.dryRun === true,
    modelId: AI_FALLBACK_MODEL_ID, failedStep: null, refusal: null,
    httpStatus: null, inputTokens: 0, outputTokens: 0, costMicros: 0};
  const done = (fields: Partial<Response>): Response =>
    ({...base, ...fields, durationMs: deps.nowMillis() - started});

  const config = deps.federation();
  if (!config) return done({failedStep: "config"});
  let token: string;
  try {
    token = await deps.accessToken(config);
  } catch (error) {
    const {step, httpStatus} = tokenStep(error);
    return done({failedStep: step, httpStatus});
  }
  if (data.dryRun === true) return done({ok: true});

  const read = deps.read();
  const override = await readAiFallbackOverride(read.db);
  const policy: AiReadPolicy = {modelId: AI_FALLBACK_MODEL_ID,
    // The month's cap, lowered (never raised past code bounds) by the
    // stored override, so tests count against the visitors' allowance.
    monthlyCapMicros: Math.min(override?.monthlyCapMicros ??
      AI_FALLBACK_POLICY.monthlyCapMicros,
    AI_FALLBACK_POLICY.monthlyCapMicros),
    perUidDailyReads: AI_FALLBACK_TEST_DAILY_CALLS};
  const fixed = guestMappingTestRequest();
  const outcome = await executeAiRead({uid: adminContext.uid,
    commandId: AI_FALLBACK_TEST_COMMAND_ID, task: fixed.task,
    promptVersion: fixed.promptVersion, prompt: fixed.prompt,
    input: fixed.input, inputSchema: fixed.inputSchema,
    outputSchema: fixed.outputSchema,
    maxOutputTokens: TEST_MAX_OUTPUT_TOKENS,
    maxCostMicros: TEST_MAX_COST_MICROS},
  // The token just exchanged serves this call; nothing else is cached.
  {...read, accessToken: async () => token}, policy,
  {useCache: false, test: true});
  const usage = outcome.usage;
  if (outcome.status === "read") {
    return done({ok: true, modelId: outcome.modelId, ...usage});
  }
  if (outcome.failure) {
    return done({failedStep: providerStep(outcome.failure.code),
      httpStatus: outcome.failure.httpStatus, ...usage});
  }
  return done({failedStep: "budget", refusal: outcome.reason, ...usage});
}

export const adminAiFallbackTestCall = callableWithLimits({timeoutSeconds: 120},
  adminAiFallbackTestCallSpec());
