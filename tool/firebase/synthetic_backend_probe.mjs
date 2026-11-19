#!/usr/bin/env node
/**
 * Post-deploy synthetic smoke: signs in as a dedicated synthetic Host and
 * reads what the Host app reads, so a deployed backend that cannot serve
 * main's clients fails loudly (NOT_FOUND, PERMISSION_DENIED, a missing
 * composite index, or a response outside main's callable contract).
 *
 *   node tool/firebase/synthetic_backend_probe.mjs --env dev
 *   node tool/firebase/synthetic_backend_probe.mjs --env dev --apply
 *   node tool/firebase/synthetic_backend_probe.mjs --env prod --apply \
 *     --allow-prod
 *
 * Firestore steps are reads through security rules. Callable steps are
 * manager-only reads whose sole write is the caller's `rateLimits` counter,
 * so production runs them only with --allow-prod-callables. The identity and
 * organizer must be marked `synthetic` or the probe stops before signing in.
 */

import process from "node:process";
import {pathToFileURL} from "node:url";

import {readFirebaseProjectAliases} from "../lib/firebase_project.mjs";
import {createFunctionsRequire} from "../lib/repo_paths.mjs";
import {
  exchangeAppCheckDebugToken,
  exchangeCustomToken,
  readWebConfig,
  redact,
} from "./probe_chat_storage_rules.mjs";
import {callableUrl} from "../../packages/command-client/src/transport.mjs";

const functionsRegion = "asia-south1";
const directoryPage = 30;

export class SyntheticProbeError extends Error {
  constructor(message, exitCode = 1) {
    super(message);
    this.name = "SyntheticProbeError";
    this.exitCode = exitCode;
  }
}

function requireValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) {
    throw new SyntheticProbeError(`${flag} requires a value.`, 64);
  }
  return value;
}

export function parseArgs(argv, env = process.env) {
  const args = {
    allowProd: false,
    allowProdCallables: false,
    apply: false,
    environment: null,
    help: false,
    json: false,
    organizerId: env.CATCH_SYNTHETIC_PROBE_ORGANIZER_ID ?? null,
    uid: env.CATCH_SYNTHETIC_PROBE_UID ?? null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--env") args.environment = requireValue(argv, ++index, arg);
    else if (arg === "--uid") args.uid = requireValue(argv, ++index, arg);
    else if (arg === "--organizer-id") {
      args.organizerId = requireValue(argv, ++index, arg);
    } else if (arg === "--apply") args.apply = true;
    else if (arg === "--allow-prod") args.allowProd = true;
    else if (arg === "--allow-prod-callables") args.allowProdCallables = true;
    else if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new SyntheticProbeError(`Unknown argument: ${arg}`, 64);
  }
  if (args.help) return args;
  if (!["dev", "prod"].includes(args.environment)) {
    throw new SyntheticProbeError("--env <dev|prod> is required.", 64);
  }
  if (!args.uid || !args.organizerId) {
    throw new SyntheticProbeError(
      "Provide --uid and --organizer-id (or CATCH_SYNTHETIC_PROBE_UID and " +
        "CATCH_SYNTHETIC_PROBE_ORGANIZER_ID).",
      64,
    );
  }
  if (args.environment === "prod" && args.apply && !args.allowProd) {
    throw new SyntheticProbeError("A production probe requires --allow-prod.", 64);
  }
  if (args.allowProdCallables && args.environment !== "prod") {
    throw new SyntheticProbeError(
      "--allow-prod-callables only applies to --env prod.",
      64,
    );
  }
  return args;
}

/**
 * The Host app's own reads for one organizer. Queries mirror the Flutter
 * repositories (filters, ordering, limits) so a missing composite index
 * fails here as FAILED_PRECONDITION, as it would on a device.
 */
export function buildSyntheticProbePlan({
  environment,
  uid,
  organizerId,
  now,
  allowProdCallables = false,
}) {
  const firestore = [
    {id: "own-user-profile", kind: "get", path: `users/${uid}`},
    {id: "selected-organizer", kind: "get", path: `organizers/${organizerId}`},
    {
      id: "owned-organizers",
      kind: "query",
      query: {
        from: [{collectionId: "organizers"}],
        where: orFilter([
          fieldEquals("hostUserId", {stringValue: uid}),
          fieldEquals("ownerUserId", {stringValue: uid}),
        ]),
        limit: directoryPage,
      },
    },
    {
      id: "hosted-organizers",
      kind: "query",
      query: {
        from: [{collectionId: "organizers"}],
        where: orFilter([
          fieldEquals("hostUserId", {stringValue: uid}),
          {
            fieldFilter: {
              field: {fieldPath: "hostUserIds"},
              op: "ARRAY_CONTAINS",
              value: {stringValue: uid},
            },
          },
        ]),
        limit: directoryPage,
      },
    },
    {
      id: "active-organizer-events",
      kind: "query",
      query: {
        from: [{collectionId: "events"}],
        where: {
          compositeFilter: {
            op: "AND",
            filters: [
              fieldEquals("publicationState", {stringValue: "published"}),
              fieldEquals("organizerId", {stringValue: organizerId}),
              fieldEquals("status", {stringValue: "active"}),
              {
                fieldFilter: {
                  field: {fieldPath: "endTime"},
                  op: "GREATER_THAN",
                  value: {timestampValue: now.toISOString()},
                },
              },
            ],
          },
        },
        orderBy: [
          {field: {fieldPath: "endTime"}, direction: "ASCENDING"},
          {field: {fieldPath: "__name__"}, direction: "ASCENDING"},
        ],
        limit: directoryPage,
      },
    },
  ];
  const callables = environment !== "prod" || allowProdCallables ? [
    {
      // The Host app reads its form list from Firestore now; the template
      // catalog is the forms surface it still reads through a Function.
      id: "organizer-form-templates",
      name: "listOrganizerFormTemplates",
      payload: {organizerId},
      responseValidator: "validateListOrganizerFormTemplatesCallableResponse",
    },
  ] : [];
  return {firestore, callables};
}

function fieldEquals(fieldPath, value) {
  return {fieldFilter: {field: {fieldPath}, op: "EQUAL", value}};
}

function orFilter(filters) {
  return {compositeFilter: {op: "OR", filters}};
}

/** Fails closed unless both fixture documents are synthetic and linked. */
export function assertSyntheticFixture({uid, organizerId, user, organizer}) {
  if (!user || user.synthetic !== true) {
    throw new SyntheticProbeError(
      `users/${uid} is not a synthetic identity; refusing to sign in as it.`,
    );
  }
  if (!organizer || organizer.synthetic !== true) {
    throw new SyntheticProbeError(
      `organizers/${organizerId} is not a synthetic organizer.`,
    );
  }
  const managers = new Set([
    organizer.ownerUserId,
    organizer.hostUserId,
    ...(Array.isArray(organizer.hostUserIds) ? organizer.hostUserIds : []),
  ]);
  if (!managers.has(uid)) {
    throw new SyntheticProbeError(
      `users/${uid} does not manage organizers/${organizerId}.`,
    );
  }
}

function authHeaders({idToken, appCheckToken}) {
  return {
    "content-type": "application/json",
    authorization: `Bearer ${idToken}`,
    ...(appCheckToken ? {"x-firebase-appcheck": appCheckToken} : {}),
  };
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function firstError(body) {
  const value = Array.isArray(body) ?
    body.find((entry) => entry?.error)?.error :
    body?.error;
  return value ?? null;
}

export async function probeFirestoreStep({
  fetchImpl,
  projectId,
  step,
  idToken,
  appCheckToken,
}) {
  const base = `https://firestore.googleapis.com/v1/projects/${projectId}` +
    "/databases/(default)/documents";
  const response = step.kind === "get" ?
    await fetchImpl(`${base}/${step.path}`, {
      method: "GET",
      headers: authHeaders({idToken, appCheckToken}),
    }) :
    await fetchImpl(`${base}:runQuery`, {
      method: "POST",
      headers: authHeaders({idToken, appCheckToken}),
      body: JSON.stringify({structuredQuery: step.query}),
    });
  const body = await readJson(response);
  const error = firstError(body);
  if (!response.ok || error) {
    return {
      id: step.id,
      ok: false,
      detail: `${error?.status ?? `HTTP ${response.status}`}: ` +
        `${error?.message ?? "Firestore read failed"}`,
    };
  }
  const count = step.kind === "get" ? 1 :
    (Array.isArray(body) ? body.filter((entry) => entry?.document).length : 0);
  return {id: step.id, ok: true, detail: `${count} document(s) readable`};
}

export async function probeCallableStep({
  fetchImpl,
  projectId,
  step,
  idToken,
  appCheckToken,
  validators,
}) {
  const response = await fetchImpl(
    callableUrl({projectId, region: functionsRegion, name: step.name}),
    {
      method: "POST",
      redirect: "manual",
      headers: authHeaders({idToken, appCheckToken}),
      body: JSON.stringify({data: step.payload}),
    },
  );
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ?
    await readJson(response) : null;
  if (!body) {
    return {
      id: step.id,
      ok: false,
      detail: `${step.name} did not answer as a Firebase callable ` +
        `(HTTP ${response.status}); it is likely not deployed.`,
    };
  }
  if (body.error || !("result" in body)) {
    return {
      id: step.id,
      ok: false,
      detail: `${step.name} ${body.error?.status ?? "missing result"}: ` +
        `${body.error?.message ?? ""}`.trim(),
    };
  }
  const validate = validators[step.responseValidator];
  if (validate && !validate(body.result)) {
    const issue = validate.errors?.[0];
    return {
      id: step.id,
      ok: false,
      detail: `${step.name} response is outside main's contract: ` +
        `${issue?.instancePath || "/"} ${issue?.message ?? ""}`.trim(),
    };
  }
  return {id: step.id, ok: true, detail: `${step.name} answered within contract`};
}

/** Runs every step; one failure does not hide the others. */
export async function runSyntheticProbe({
  plan,
  projectId,
  idToken,
  appCheckToken = null,
  fetchImpl = fetch,
  validators = {},
}) {
  const results = [];
  for (const step of plan.firestore) {
    results.push(await probeFirestoreStep({
      fetchImpl, projectId, step, idToken, appCheckToken,
    }));
  }
  for (const step of plan.callables) {
    results.push(await probeCallableStep({
      fetchImpl, projectId, step, idToken, appCheckToken, validators,
    }));
  }
  return {ok: results.every((result) => result.ok), results};
}

export function formatProbeReport({environment, projectId, report}) {
  return [
    `${report.ok ? "PASS" : "FAIL"} synthetic backend probe for ` +
      `${environment}: ${projectId}`,
    ...report.results.map((result) =>
      `  ${result.ok ? "ok  " : "FAIL"} ${result.id}: ${result.detail}`),
  ].join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  const projectId = readFirebaseProjectAliases()[args.environment];
  if (!projectId) {
    throw new SyntheticProbeError(`Missing Firebase alias ${args.environment}.`);
  }
  const plan = buildSyntheticProbePlan({
    environment: args.environment,
    uid: args.uid,
    organizerId: args.organizerId,
    now: new Date(),
    allowProdCallables: args.allowProdCallables,
  });
  if (!args.apply) {
    const steps = [...plan.firestore, ...plan.callables].map((step) => step.id);
    console.log(args.json ?
      JSON.stringify({mode: "dry-run", projectId, steps}, null, 2) :
      `Synthetic backend probe (dry-run) for ${projectId}: ` +
        `${steps.join(", ")}.\nRe-run with --apply to sign in and read.`);
    return;
  }

  const webConfig = readWebConfig(args.environment);
  const appCheckDebugToken = process.env.CATCH_SYNTHETIC_PROBE_APPCHECK_DEBUG_TOKEN ??
    null;
  const secrets = [appCheckDebugToken];
  let adminApp;
  try {
    const admin = createFunctionsRequire()("firebase-admin");
    adminApp = admin.initializeApp(
      {
        credential: admin.credential.applicationDefault(),
        projectId,
        serviceAccountId: `${projectId}@appspot.gserviceaccount.com`,
      },
      `synthetic-backend-probe-${args.environment}-${Date.now()}`,
    );
    const db = adminApp.firestore();
    const [user, organizer] = await Promise.all([
      db.collection("users").doc(args.uid).get(),
      db.collection("organizers").doc(args.organizerId).get(),
    ]);
    assertSyntheticFixture({
      uid: args.uid,
      organizerId: args.organizerId,
      user: user.data(),
      organizer: organizer.data(),
    });

    const customToken = await adminApp.auth().createCustomToken(args.uid);
    secrets.push(customToken);
    const idToken = await exchangeCustomToken({
      fetchImpl: fetch,
      apiKey: webConfig.apiKey,
      customToken,
    });
    secrets.push(idToken);
    const appCheckToken = appCheckDebugToken ?
      await exchangeAppCheckDebugToken({
        fetchImpl: fetch,
        apiKey: webConfig.apiKey,
        appId: webConfig.appId,
        projectNumber: webConfig.projectNumber,
        debugToken: appCheckDebugToken,
      }) : null;
    secrets.push(appCheckToken);

    const report = await runSyntheticProbe({
      plan,
      projectId,
      idToken,
      appCheckToken,
      validators: plan.callables.length > 0 ?
        await import("../contracts/generated/schema_contract_validators.mjs") :
        {},
    });
    console.log(args.json ?
      JSON.stringify({projectId, ...report}, null, 2) :
      formatProbeReport({environment: args.environment, projectId, report}));
    if (!report.ok) process.exitCode = 1;
  } catch (error) {
    throw new SyntheticProbeError(
      redact(error?.message ?? error, secrets),
      error?.exitCode ?? 1,
    );
  } finally {
    await adminApp?.delete();
  }
}

function printHelp() {
  console.log(`Usage: node tool/firebase/synthetic_backend_probe.mjs --env <dev|prod> [options]

Options:
  --uid <uid>                 Synthetic Host identity (users/{uid}.synthetic).
  --organizer-id <id>         Synthetic organizer the identity manages.
  --apply                     Sign in and read; the default is a dry run.
  --allow-prod                Required for --env prod with --apply.
  --allow-prod-callables      Also run callable reads in prod. Each writes the
                              synthetic caller's rateLimits counter.
  --json                      Emit machine-readable output.
  -h, --help                  Show this help.

Secrets are read only from the environment and never printed:
  CATCH_SYNTHETIC_PROBE_APPCHECK_DEBUG_TOKEN  App Check debug token registered
                                              for the environment's web app.
Admin credentials come from Application Default Credentials and are used only
to verify the fixture and mint a short-lived custom token.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error?.message ?? String(error));
    process.exitCode = error?.exitCode ?? 1;
  });
}
