import fs from "node:fs";
import {fromRepo} from "../lib/repo_paths.mjs";
import {assertProdWriteAllowed} from "../lib/firebase_project.mjs";
import {parseFirebaseWebConfig} from "./storage_rules_firestore_iam.mjs";
import {fileURLToPath} from "node:url";
import path from "node:path";
import {createFunctionsRequire} from "../lib/repo_paths.mjs";
import {readFormOrigins, reconcileFormOrigins} from "./form_domain_origins.mjs";
import {hostingDomainTarget, readHostingDomain, provisionHostingDomain} from "./form_domain_hosting.mjs";

const actions = new Set(["status", "reserve", "verify", "provision", "prepare-origins", "activate", "revoke", "remove-origins"]);
const values = new Map([["--env", "environment"], ["--hostname", "hostname"],
  ["--action", "action"], ["--organizer-id", "organizerId"], ["--form-id", "formId"],
  ["--generation", "generation"], ["--requested-by-manager", "managerUid"], ["--site-key", "siteKey"]]);
const docId = (value) => typeof value === "string" && value.length > 0 && value.length <= 128 &&
  !/[\s/]/u.test(value) && value !== "." && value !== "..";

export function parseDomainOperatorArgs(argv) {
  const result = {action: "status", apply: false, allowProd: false};
  const seen = new Set();
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    if (seen.has(flag)) throw new Error(`Repeated argument: ${flag}`);
    seen.add(flag);
    if (flag === "--apply") result.apply = true;
    else if (flag === "--allow-prod") result.allowProd = true;
    else if (values.has(flag)) {
      const value = argv[++index];
      if (!value || value.startsWith("--")) throw new Error(`A value is required for ${flag}.`);
      result[values.get(flag)] = value;
    } else throw new Error(`Unknown argument: ${flag}`);
  }
  if (!["dev", "staging", "prod"].includes(result.environment) || !actions.has(result.action) || !result.hostname) {
    throw new Error("Use an explicit --env dev|staging|prod, --hostname and supported --action.");
  }
  if (result.action === "status" && result.apply) throw new Error("Status cannot apply changes.");
  if (result.generation !== undefined) {
    if (!/^[1-9][0-9]*$/u.test(result.generation) || !Number.isSafeInteger(Number(result.generation))) {
      throw new Error("Generation must be a positive safe integer.");
    }
    result.generation = Number(result.generation);
  }
  if (result.action !== "status") {
    if (![result.organizerId, result.formId, result.managerUid].every(docId)) {
      throw new Error("Write plans require exact organizer/form IDs and --requested-by-manager UID.");
    }
    if (result.action !== "reserve" && result.generation === undefined) throw new Error("Use the current --generation from status.");
    if (result.action === "reserve" && result.generation !== undefined) throw new Error("Reserve creates a new generation; do not supply one.");
  }
  if (["prepare-origins", "activate", "remove-origins"].includes(result.action) && !result.siteKey) {
    throw new Error("Use the deployed website's public --site-key for origin preparation and activation.");
  }
  assertProdWriteAllowed({env: result.environment, apply: result.apply, allowProd: result.allowProd,
    action: "change a custom form domain"});
  return result;
}

/** Resolve only the checked-in marketing site, never an ambient/default project.
 * The public web app identifiers are deployment inputs, not live acceptance.
 */
export function configuredDomainTarget(args, {readFile = fs.readFileSync} = {}) {
  const rc = JSON.parse(readFile(fromRepo(".firebaserc"), "utf8"));
  const projectId = rc.projects?.[args.environment];
  const config = parseFirebaseWebConfig(readFile(fromRepo("firebase", args.environment,
    "web", "firebase-messaging-sw.js"), "utf8"));
  const sites = rc.targets?.[projectId]?.hosting?.marketing;
  if (config.projectId !== projectId || !Array.isArray(sites) || sites.length !== 1) {
    throw new Error("Configure exactly one marketing Hosting site for this environment before onboarding.");
  }
  const hosting = hostingDomainTarget({projectId, projectNumber: config.projectNumber,
    siteId: sites[0], hostname: args.hostname});
  assertProdWriteAllowed({env: args.environment, projectId, apply: args.apply,
    allowProd: args.allowProd, action: "change a custom form domain"});
  return {...hosting, appId: config.appId, bucket: config.storageBucket,
    siteKey: args.siteKey, expectedCname: `${hosting.siteId}.web.app`};
}

/** The API binds both the numeric project identity and the marketing site.
 * This does not assert which website build is currently deployed there.
 */
export async function verifyDomainProviderTarget(input, {request}) {
  const target = hostingDomainTarget(input);
  const get = async (url) => {
    let response;
    try {
      response = await request({method: "GET", url, responseType: "json",
        timeout: 30_000, maxRedirects: 0, retry: false});
    } catch {throw new Error("Cannot verify the configured Firebase project/site.");}
    if (response?.status !== 200 || !response.data || typeof response.data !== "object") {
      throw new Error("Invalid Firebase project/site metadata.");
    }
    return response.data;
  };
  const project = await get(`https://cloudresourcemanager.googleapis.com/v3/projects/${target.projectId}`);
  if (project.name !== `projects/${target.projectNumber}` || project.projectId !== target.projectId || project.state !== "ACTIVE") {
    throw new Error("Configured Firebase project identity is not active or does not match.");
  }
  const site = await get(`https://firebasehosting.googleapis.com/v1beta1/${target.parent}`);
  if (![target.parent, `projects/${target.projectId}/sites/${target.siteId}`].includes(site.name) ||
      site.defaultUrl !== `https://${target.siteId}.web.app`) {
    throw new Error("Configured marketing Hosting site does not match.");
  }
  return {projectId: target.projectId, projectNumber: target.projectNumber, siteId: target.siteId};
}


/** All provider and registry writes are explicit. The manager UID records whose
 * current authority the operator acts on behalf of; ADC authenticates the
 * operator separately and is never inferred from that UID. Form domains live in
 * the shared customDomains registry (#1110) as `target.kind: "form"` records
 * on the Firebase Hosting provider.
 */
export async function runDomainOperator(args, {target, db, registry, policy,
  request, now = Date.now, assertManager}) {
  if (policy.parseServedHostname(target.hostname)?.hostname !== target.hostname) {
    throw new Error("Reserved or invalid custom form hostname.");
  }
  assertProdWriteAllowed({env: args.environment, projectId: target.projectId,
    apply: args.apply, allowProd: args.allowProd, action: "change a custom form domain"});
  await verifyDomainProviderTarget(target, {request});
  const readRecord = async () => {
    const snap = await db.collection("customDomains").doc(target.hostname).get();
    const value = policy.parseCustomDomain(snap.data());
    if (snap.exists && !value) throw new Error("Invalid domain registry record.");
    return value;
  };
  const actor = {kind: "operator", uid: args.managerUid, authority: assertManager};
  const record = await readRecord();
  const hosting = await readHostingDomain(target, {request, now});
  const summary = {action: args.action, apply: args.apply, projectId: target.projectId,
    siteId: target.siteId, hostname: target.hostname, registry: record, hosting};
  const originSummary = ({state: _state, ...assessment}) => assessment;
  if (args.action === "status") {
    return {...summary, ...(args.siteKey ? {origins: originSummary(await readFormOrigins(target, {request}))} : {}),
      nextAction: record ? "Follow registry status and Hosting requiredDnsUpdates; activation requires current proof." : "reserve"};
  }
  if (args.action === "reserve") {
    // A dry run performs the same current ownership/publication checks without
    // creating a reservation or claiming a generated challenge as real.
    await assertManager({db, organizerId: args.organizerId, actorUid: args.managerUid});
    const form = await db.collection("organizerForms").doc(args.formId).get();
    if (!form.exists || form.get("status") !== "published" || form.get("organizerId") !== args.organizerId) {
      throw new Error("A published form owned by this organizer is required.");
    }
    if (record && policy.holdsHostname(record, now())) {
      throw new Error("Hostname is already reserved; use status and its generation.");
    }
    const screening = policy.screenHostname(policy.parseServedHostname(target.hostname));
    if (screening.verdict === "reject") throw new Error("Hostname is blocklisted.");
    if (!args.apply) return {...summary, screening, nextAction: "reserve-with-apply"};
    const reserved = await registry.reserveCustomDomain(db, {hostname: target.hostname,
      provider: "firebaseHosting", expectedCname: target.expectedCname, actor,
      target: {kind: "form", organizerId: args.organizerId, formId: args.formId}}, now());
    return {...summary, registry: reserved, nextAction: "publish-dns-then-verify"};
  }
  if (!record || record.target?.kind !== "form" || record.target.organizerId !== args.organizerId ||
      record.target.formId !== args.formId || record.generation !== args.generation ||
      record.provider !== "firebaseHosting" || record.expectedCname !== target.expectedCname) {
    throw new Error("Requested organizer/form/generation/site does not match the reservation.");
  }
  const cleanup = args.action === "remove-origins";
  const statuses = cleanup ? ["removed"] : args.action === "revoke" ?
    ["pendingDns", "verified", "provisioning", "active", "lapsed", "suspended", "failed", "removed"] :
    args.action === "verify" ? ["pendingDns"] : args.action === "provision" ?
      ["verified", "provisioning"] : ["provisioning", "active"];
  const assertBinding = () => registry.assertFormCustomDomainBinding(db, record,
    args.managerUid, statuses, assertManager);
  await assertBinding();
  if (args.action === "revoke") {
    // Revocation removes the record in the shared registry: routing stops in
    // that commit and a new reservation needs a new generation and challenge.
    if (args.apply) await registry.removeCustomDomain(db, {fence: record, actor,
      reason: "Operator revoked the form domain"}, now());
    return {...summary, registry: await readRecord(), nextAction: args.apply ? "remove-origins" : "revoke-with-apply"};
  }
  if (cleanup) {
    const origins = await reconcileFormOrigins(target, {request, apply: args.apply, remove: true, assertBinding});
    return {...summary, origins: originSummary(origins), nextAction: "review-residual-trust-and-client-dns"};
  }
  const probe = await registry.probeCustomDomain(target.hostname);
  if (!policy.hasCurrentDomainOwnership(record, probe, now())) {
    throw new Error("Current TXT challenge and exact CNAME proof are required.");
  }
  if (args.action === "verify") {
    if (policy.isLeaseExpired(record, now())) throw new Error("The pending reservation has expired; reserve again.");
    if (args.apply) await registry.verifyCustomDomain(db, {fence: record, probe, actor}, now());
    return {...summary, registry: await readRecord(), nextAction: args.apply ? "provision" : "verify-with-apply"};
  }
  await assertBinding();
  if (args.action === "provision") {
    const result = await provisionHostingDomain(target, {request, now, apply: args.apply, assertBinding});
    await assertBinding();
    // The registry records the exact Hosting resource it now waits on.
    if (args.apply) await registry.markCustomDomainProvisioning(db, {fence: record, actor,
      providerHostnameId: registry.firebaseHostingProviderHostnameId(target.siteId, target.hostname)}, now());
    return {...summary, hosting: result, registry: await readRecord(),
      nextAction: "follow-hosting-dns-and-read-status"};
  }
  if (args.action === "prepare-origins") {
    if (!hosting.ready) throw new Error("Hosting and certificate must be ready before preparing origins.");
    const origins = await reconcileFormOrigins(target, {request, apply: args.apply, assertBinding});
    return {...summary, origins: originSummary(origins), nextAction: "activate"};
  }
  const origins = await readFormOrigins(target, {request});
  const freshHosting = await readHostingDomain(target, {request, now});
  const freshProbe = await registry.probeCustomDomain(target.hostname);
  if (!origins.ready || !freshHosting.ready || !policy.hasCurrentDomainOwnership(record, freshProbe, now())) {
    throw new Error("Current Hosting, DNS, Auth, App Check and upload origins must all be ready.");
  }
  await assertBinding();
  if (args.apply) await registry.activateFormCustomDomain(db, {expected: record,
    probe: freshProbe, certificate: {projectId: target.projectId, siteId: target.siteId,
      hostname: target.hostname, observedAtMillis: freshHosting.observedAt,
      expiresAtMillis: freshHosting.certificateExpiresAt}, actorUid: args.managerUid,
    trustedProjectId: target.projectId}, now, assertManager);
  return {...summary, hosting: freshHosting, origins: originSummary(origins),
    registry: await readRecord(), nextAction: args.apply ? "browser-acceptance" : "activate-with-apply"};
}

export async function domainOperatorMain(argv = process.argv.slice(2)) {
  const args = parseDomainOperatorArgs(argv);
  const target = configuredDomainTarget(args);
  if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    throw new Error("Unset emulator variables before using the live domain operator.");
  }
  const require = createFunctionsRequire();
  const {GoogleAuth} = require("google-auth-library");
  const {initializeApp, applicationDefault, deleteApp} = require("firebase-admin/app");
  const {getFirestore} = require("firebase-admin/firestore");
  const registry = require("./lib/customDomains/domainRegistry.js");
  const policy = require("./lib/customDomains/domainPolicy.js");
  const {requireOrganizerManager} = require("./lib/shared/organizerManagerAuthority.js");
  const auth = new GoogleAuth({projectId: target.projectId,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"]});
  const client = await auth.getClient();
  const app = initializeApp({projectId: target.projectId, credential: applicationDefault()}, "form-domain-operator");
  try {
    const result = await runDomainOperator(args, {target, db: getFirestore(app), registry, policy,
      request: (config) => client.request(config), assertManager: requireOrganizerManager});
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } finally {await deleteApp(app);}
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  domainOperatorMain().catch((error) => {
    // SDK errors can contain credential-bearing request configs. Never dump them.
    process.stderr.write(`Custom form-domain operation failed: ${error instanceof Error &&
      !error.config && !error.response ? error.message : "provider operation failed; re-read status"}\n`);
    process.exitCode = 1;
  });
}
