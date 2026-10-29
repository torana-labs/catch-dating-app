#!/usr/bin/env node

import fs from "node:fs";
import {createHash} from "node:crypto";
import path from "node:path";
import {fileURLToPath} from "node:url";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// Every non-secret param declared in Functions source must appear here:
// firebase-tools ignores `default:` values in non-interactive mode, so an
// unmaterialized param fails the whole Delivery lane. The colocated coverage
// scanner fails closed when source declarations drift from this list.
export const materializedNonSecretParams = [
  "CATCH_HOST_OPERATOR_ALERTS_ENABLED",
  "CATCH_HOST_OPERATOR_ALERTS_SINCE",
  "ALGOLIA_APPLICATION_ID",
  "RAZORPAY_PUBLIC_KEY_ID",
  "FORM_RAZORPAY_PARTNER_CONFIG_VERSION",
  "RAZORPAY_PLATFORM_PAYMENT_CONFIG_VERSION",
  "META_WHATSAPP_APP_ID",
  "META_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID",
  "META_WHATSAPP_GRAPH_VERSION",
  "META_WHATSAPP_ENABLED",
  "CATCH_WHATSAPP_WEBHOOK_ENABLED",
  "CATCH_WHATSAPP_RECEIPT_CONSUMERS_ENABLED",
  "CATCH_WHATSAPP_REPLIES_ENABLED",
  "CATCH_WHATSAPP_ATOMIC_STOP_INGRESS_READY",
  "CATCH_WHATSAPP_REPLY_ACTOR_UID",
  "CATCH_WHATSAPP_REPLY_RECIPIENT_UID",
  "CATCH_WHATSAPP_REPLY_RECIPIENT_E164",
  "CATCH_WHATSAPP_REPLY_CREDENTIAL_VERSION",
  "CATCH_WHATSAPP_REPLY_GRAPH_VERSION",
  "CATCH_WHATSAPP_REPLY_EVIDENCE_SHA256",
  "CATCH_WHATSAPP_WABA_ID",
  "CATCH_WHATSAPP_PHONE_NUMBER_ID",
  "CATCH_INSTAGRAM_CLAIMS_ENABLED",
  "CATCH_INSTAGRAM_ACCOUNT_ID",
  "CATCH_INSTAGRAM_HANDLE",
  "CATCH_INSTAGRAM_GRAPH_VERSION",
  "SUPPLY_MESSAGE_NOMINATIONS_ENABLED",
  "EVENT_ASSISTANCE_RCS_ENABLED",
  "EVENT_ASSISTANCE_RCS_WEBHOOK_ENABLED",
  "EVENT_ASSISTANCE_SMS_REPORTS_ENABLED",
  "FORM_DOMAIN_CNAME_TARGET",
  "FLIGHT_WEBHOOK_BASE_URL",
  "FLIGHT_PROVIDER_CONFIG_VERSION",
  "FLIGHT_PROVIDER_POLICY",
  "EVENT_ASSISTANCE_GUEST_KEY_VERSION",
  "EVENT_ASSISTANCE_RCS_WEBHOOK_KEY_VERSION",
];

function option(name) {
  const offset = process.argv.indexOf(name);
  assert(offset >= 0 && process.argv[offset + 1], `${name} is required`);
  return process.argv[offset + 1];
}

function normalizedBooleanParam(environment, name) {
  const value = environment[name]?.trim().toLowerCase() || "false";
  assert(value === "true" || value === "false",
    `${name} must be true or false`);
  return value;
}

function normalizedProviderParams(environment = process.env, projectId) {
  const algoliaApplicationId = environment.ALGOLIA_APPLICATION_ID?.trim() ?? "";
  const razorpayPublicKeyId = environment.RAZORPAY_PUBLIC_KEY_ID?.trim() ?? "";
  assert(/^[A-Za-z0-9]{10}$/.test(algoliaApplicationId),
    "ALGOLIA_APPLICATION_ID must be a 10-character application identifier");
  assert(/^rzp_(test|live)_[A-Za-z0-9]+$/.test(razorpayPublicKeyId),
    "RAZORPAY_PUBLIC_KEY_ID must be a Razorpay test or live public key id");
  const formPartnerVersion = environment.FORM_RAZORPAY_PARTNER_CONFIG_VERSION
    ?.trim() || "";
  const secretPrefix = `projects/${projectId}/secrets/`;
  assert(!formPartnerVersion || (formPartnerVersion.startsWith(secretPrefix) &&
    /^[A-Za-z0-9_-]{1,255}\/versions\/[1-9][0-9]*$/.test(
      formPartnerVersion.slice(secretPrefix.length))),
  "FORM_RAZORPAY_PARTNER_CONFIG_VERSION must pin a secret in this project");
  const platformVersion = environment.RAZORPAY_PLATFORM_PAYMENT_CONFIG_VERSION
    ?.trim() || "";
  assert(!platformVersion || (platformVersion.startsWith(secretPrefix) &&
    /^[A-Za-z0-9_-]{1,255}\/versions\/[1-9][0-9]*$/.test(
      platformVersion.slice(secretPrefix.length))),
  "RAZORPAY_PLATFORM_PAYMENT_CONFIG_VERSION must pin a secret in this project");
  const enabled = normalizedBooleanParam(environment, "META_WHATSAPP_ENABLED");

  const appId = environment.META_WHATSAPP_APP_ID?.trim() ?? "";
  const configId = environment.META_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID
    ?.trim() ?? "";
  const graphVersion = environment.META_WHATSAPP_GRAPH_VERSION?.trim() ||
    "v23.0";
  assert(/^v[1-9][0-9]*\.[0-9]+$/.test(graphVersion),
    "META_WHATSAPP_GRAPH_VERSION must look like v23.0");
  assert(!appId || /^[A-Za-z0-9_-]+$/.test(appId),
    "META_WHATSAPP_APP_ID contains unsupported characters");
  assert(!configId || /^[A-Za-z0-9_-]+$/.test(configId),
    "META_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID contains unsupported characters");
  if (enabled === "true") {
    assert(appId && configId,
      "real Meta app and embedded-signup config ids are required when enabled");
  }

  const catchConsumersEnabled = normalizedBooleanParam(
    environment, "CATCH_WHATSAPP_RECEIPT_CONSUMERS_ENABLED");
  const catchRepliesEnabled = normalizedBooleanParam(
    environment, "CATCH_WHATSAPP_REPLIES_ENABLED");
  const catchAtomicIngressReady = normalizedBooleanParam(
    environment, "CATCH_WHATSAPP_ATOMIC_STOP_INGRESS_READY");
  // These are configuration checks, not historical STOP attestation or sending
  // authority. The runtime still requires current Auth/App Check, independently
  // reviewed readiness, verified recipient consent and an atomic one-shot claim.
  const catchReplyScope = Object.fromEntries([
    "CATCH_WHATSAPP_REPLY_ACTOR_UID",
    "CATCH_WHATSAPP_REPLY_RECIPIENT_UID",
    "CATCH_WHATSAPP_REPLY_RECIPIENT_E164",
    "CATCH_WHATSAPP_REPLY_CREDENTIAL_VERSION",
    "CATCH_WHATSAPP_REPLY_GRAPH_VERSION",
    "CATCH_WHATSAPP_REPLY_EVIDENCE_SHA256",
  ].map((name) => [name, environment[name]?.trim() ?? ""]));
  const hasReplyScope = Object.values(catchReplyScope).some(Boolean);
  if (hasReplyScope || catchRepliesEnabled === "true") {
    assert(Object.values(catchReplyScope).every(Boolean),
      "Catch reply scope must be complete or entirely unconfigured");
    for (const name of ["CATCH_WHATSAPP_REPLY_ACTOR_UID",
      "CATCH_WHATSAPP_REPLY_RECIPIENT_UID"]) {
      assert(/^[A-Za-z0-9_-]{1,128}$/.test(catchReplyScope[name]),
        `${name} must be a controlled Firebase UID`);
    }
    assert(/^\+[1-9][0-9]{6,14}$/.test(
      catchReplyScope.CATCH_WHATSAPP_REPLY_RECIPIENT_E164),
    "CATCH_WHATSAPP_REPLY_RECIPIENT_E164 must be an E.164 endpoint");
    const credentialPrefix = secretPrefix +
      "CATCH_WHATSAPP_ACCESS_TOKEN/versions/";
    const credential = catchReplyScope.CATCH_WHATSAPP_REPLY_CREDENTIAL_VERSION;
    assert(credential.startsWith(credentialPrefix) &&
      /^[1-9][0-9]*$/.test(credential.slice(credentialPrefix.length)),
    "CATCH_WHATSAPP_REPLY_CREDENTIAL_VERSION must pin a numeric " +
      "CATCH_WHATSAPP_ACCESS_TOKEN version in this project");
    assert(/^v[1-9][0-9]*\.[0-9]+$/.test(
      catchReplyScope.CATCH_WHATSAPP_REPLY_GRAPH_VERSION),
    "CATCH_WHATSAPP_REPLY_GRAPH_VERSION must be an explicit Graph version");
    assert(/^[a-f0-9]{64}$/.test(
      catchReplyScope.CATCH_WHATSAPP_REPLY_EVIDENCE_SHA256),
    "CATCH_WHATSAPP_REPLY_EVIDENCE_SHA256 must be a lowercase SHA-256 digest");
  }
  const catchWabaId = environment.CATCH_WHATSAPP_WABA_ID?.trim() ?? "";
  const catchPhoneNumberId = environment.CATCH_WHATSAPP_PHONE_NUMBER_ID
    ?.trim() ?? "";
  assert(!catchWabaId || /^[0-9]{1,32}$/.test(catchWabaId),
    "CATCH_WHATSAPP_WABA_ID must be a numeric Meta account id");
  assert(!catchPhoneNumberId || /^[0-9]{1,32}$/.test(catchPhoneNumberId),
    "CATCH_WHATSAPP_PHONE_NUMBER_ID must be a numeric Meta phone number id");
  assert(Boolean(catchWabaId) === Boolean(catchPhoneNumberId),
    "Catch WABA and phone number ids must be configured together");
  // The receiver is credential-activated: configured account ids (with the
  // runtime's app secret and verify token) are the only ingress switch.
  const catchWebhookConfigured = Boolean(catchWabaId && catchPhoneNumberId);
  if (hasReplyScope) {
    assert(catchWebhookConfigured,
      "Catch WABA and phone number ids are required for reply scope");
  }
  if (catchAtomicIngressReady === "true") {
    assert(catchWebhookConfigured,
      "Catch atomic STOP ingress requires configured webhook account ids");
  }
  if (catchConsumersEnabled === "true") {
    assert(catchWebhookConfigured && catchAtomicIngressReady === "true",
      "CATCH_WHATSAPP_RECEIPT_CONSUMERS_ENABLED requires configured atomic ingress");
  }
  if (catchRepliesEnabled === "true") {
    assert(catchWebhookConfigured && catchAtomicIngressReady === "true" &&
      catchConsumersEnabled === "true",
    "CATCH_WHATSAPP_REPLIES_ENABLED requires configured atomic ingress and consumers");
  }

  const eventAssistance = {
    EVENT_ASSISTANCE_RCS_ENABLED: normalizedBooleanParam(
      environment, "EVENT_ASSISTANCE_RCS_ENABLED"),
    EVENT_ASSISTANCE_RCS_WEBHOOK_ENABLED: normalizedBooleanParam(
      environment, "EVENT_ASSISTANCE_RCS_WEBHOOK_ENABLED"),
    EVENT_ASSISTANCE_SMS_REPORTS_ENABLED: normalizedBooleanParam(
      environment, "EVENT_ASSISTANCE_SMS_REPORTS_ENABLED"),
  };
  const formDomainTarget = environment.FORM_DOMAIN_CNAME_TARGET?.trim() ?? "";
  assert(!formDomainTarget ||
    /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])$/.test(formDomainTarget),
  "FORM_DOMAIN_CNAME_TARGET must be a DNS hostname");

  const flightWebhookBaseUrl =
    environment.FLIGHT_WEBHOOK_BASE_URL?.trim() ?? "";
  assert(!flightWebhookBaseUrl || /^https:\/\/[^\s/?#]+/.test(
    flightWebhookBaseUrl),
  "FLIGHT_WEBHOOK_BASE_URL must be an https URL when configured");

  const flightConfigVersion = environment.FLIGHT_PROVIDER_CONFIG_VERSION?.trim() || "";
  assert(!flightConfigVersion || (flightConfigVersion.startsWith(secretPrefix) &&
    /^[A-Za-z0-9_-]{1,255}\/versions\/[1-9][0-9]*$/.test(
      flightConfigVersion.slice(secretPrefix.length))),
  "FLIGHT_PROVIDER_CONFIG_VERSION must pin a secret in this project");

  // Inactive preparation only: a later reviewed rollout must explicitly
  // admit policy materialization. Credentials alone never enable polling.
  assert(!environment.FLIGHT_PROVIDER_POLICY?.trim(),
    "FLIGHT_PROVIDER_POLICY must remain unconfigured in this milestone");

  // Instagram claim verification. The method stays hidden until the owner
  // sets the account and turns it on; the secrets stay in Secret Manager.
  const instagramClaimsEnabled = normalizedBooleanParam(
    environment, "CATCH_INSTAGRAM_CLAIMS_ENABLED");
  const instagramAccountId = environment.CATCH_INSTAGRAM_ACCOUNT_ID?.trim() ?? "";
  const instagramHandle = environment.CATCH_INSTAGRAM_HANDLE?.trim()
    .replace(/^@/, "").toLowerCase() ?? "";
  const instagramGraphVersion =
    environment.CATCH_INSTAGRAM_GRAPH_VERSION?.trim() || "v26.0";
  assert(!instagramAccountId || /^[0-9]{1,32}$/.test(instagramAccountId),
    "CATCH_INSTAGRAM_ACCOUNT_ID must be a numeric Instagram account id");
  assert(!instagramHandle || /^[a-z0-9._]{1,30}$/.test(instagramHandle),
    "CATCH_INSTAGRAM_HANDLE must be an Instagram username");
  assert(/^v[1-9][0-9]*\.[0-9]+$/.test(instagramGraphVersion),
    "CATCH_INSTAGRAM_GRAPH_VERSION must look like v26.0");
  assert(instagramClaimsEnabled === "false" ||
    (instagramAccountId && instagramHandle),
  "CATCH_INSTAGRAM_CLAIMS_ENABLED requires the Instagram account id and handle");

  // Message nominations read stored WhatsApp receipts, so they need the
  // receipt consumers on as well.
  const messageNominationsEnabled = normalizedBooleanParam(
    environment, "SUPPLY_MESSAGE_NOMINATIONS_ENABLED");
  assert(messageNominationsEnabled === "false" || catchConsumersEnabled === "true",
    "SUPPLY_MESSAGE_NOMINATIONS_ENABLED requires CATCH_WHATSAPP_RECEIPT_CONSUMERS_ENABLED");

  const assistanceReferences = {};
  for (const [name, secret] of [["EVENT_ASSISTANCE_GUEST_KEY_VERSION", "EVENT_ASSISTANCE_GUEST_KEYS"],
    ["EVENT_ASSISTANCE_RCS_WEBHOOK_KEY_VERSION", "EVENT_ASSISTANCE_RCS_WEBHOOK_KEYS"]]) {
    const reference = environment[name]?.trim() || "";
    const prefix = `projects/${projectId}/secrets/${secret}/versions/`;
    assert(!reference || reference.startsWith(prefix) && /^[1-9][0-9]*$/.test(reference.slice(prefix.length)),
      `${name} must pin its expected secret in this project`);
    assistanceReferences[name] = reference || " ";
  }
  assert(normalizedBooleanParam(environment, "CATCH_HOST_OPERATOR_ALERTS_ENABLED") === "false" &&
    !environment.CATCH_HOST_OPERATOR_ALERTS_SINCE?.trim(),
  "Host operator alerts require a separately reviewed runtime activation");
  const params = {
    CATCH_HOST_OPERATOR_ALERTS_ENABLED: "false",
    CATCH_HOST_OPERATOR_ALERTS_SINCE: " ",
    // Distinct names coexist with the SecretParams in immutable older packages.
    ALGOLIA_APPLICATION_ID: algoliaApplicationId,
    RAZORPAY_PUBLIC_KEY_ID: razorpayPublicKeyId,
    FORM_RAZORPAY_PARTNER_CONFIG_VERSION: formPartnerVersion || " ",
    RAZORPAY_PLATFORM_PAYMENT_CONFIG_VERSION: platformVersion || " ",
    // Quoted whitespace satisfies legacy Firebase parameter discovery while
    // remaining unconfigured under the source-owned trim checks.
    META_WHATSAPP_APP_ID: appId || " ",
    META_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID: configId || " ",
    META_WHATSAPP_GRAPH_VERSION: graphVersion,
    META_WHATSAPP_ENABLED: enabled,
    // Derived, never read from the environment: Functions packages built
    // before the receiver became credential-activated still declare it.
    // Remove once no such package can be promoted (CAT-186).
    CATCH_WHATSAPP_WEBHOOK_ENABLED: catchWebhookConfigured ? "true" : "false",
    CATCH_WHATSAPP_RECEIPT_CONSUMERS_ENABLED: catchConsumersEnabled,
    CATCH_WHATSAPP_REPLIES_ENABLED: catchRepliesEnabled,
    CATCH_WHATSAPP_ATOMIC_STOP_INGRESS_READY: catchAtomicIngressReady,
    CATCH_WHATSAPP_REPLY_ACTOR_UID:
      catchReplyScope.CATCH_WHATSAPP_REPLY_ACTOR_UID || " ",
    CATCH_WHATSAPP_REPLY_RECIPIENT_UID:
      catchReplyScope.CATCH_WHATSAPP_REPLY_RECIPIENT_UID || " ",
    CATCH_WHATSAPP_REPLY_RECIPIENT_E164:
      catchReplyScope.CATCH_WHATSAPP_REPLY_RECIPIENT_E164 || " ",
    CATCH_WHATSAPP_REPLY_CREDENTIAL_VERSION:
      catchReplyScope.CATCH_WHATSAPP_REPLY_CREDENTIAL_VERSION || " ",
    CATCH_WHATSAPP_REPLY_GRAPH_VERSION:
      catchReplyScope.CATCH_WHATSAPP_REPLY_GRAPH_VERSION || " ",
    CATCH_WHATSAPP_REPLY_EVIDENCE_SHA256:
      catchReplyScope.CATCH_WHATSAPP_REPLY_EVIDENCE_SHA256 || " ",
    CATCH_WHATSAPP_WABA_ID: catchWabaId || " ",
    CATCH_WHATSAPP_PHONE_NUMBER_ID: catchPhoneNumberId || " ",
    CATCH_INSTAGRAM_CLAIMS_ENABLED: instagramClaimsEnabled,
    CATCH_INSTAGRAM_ACCOUNT_ID: instagramAccountId || " ",
    CATCH_INSTAGRAM_HANDLE: instagramHandle || " ",
    CATCH_INSTAGRAM_GRAPH_VERSION: instagramGraphVersion,
    SUPPLY_MESSAGE_NOMINATIONS_ENABLED: messageNominationsEnabled,
    ...eventAssistance,
    // Blank preserves a fail-closed callable until hosting is provisioned.
    FORM_DOMAIN_CNAME_TARGET: formDomainTarget || " ",
    // Empty lets the function derive the URL from GCLOUD_PROJECT.
    FLIGHT_WEBHOOK_BASE_URL: flightWebhookBaseUrl || " ",
    FLIGHT_PROVIDER_CONFIG_VERSION: flightConfigVersion || " ",
    FLIGHT_PROVIDER_POLICY: " ",
    ...assistanceReferences,
  };
  assert(
    Object.keys(params).join(",") === materializedNonSecretParams.join(","),
    "materialized params drifted from materializedNonSecretParams");
  return params;
}

const referenceNames = Object.freeze([
  "FORM_RAZORPAY_PARTNER_CONFIG_VERSION", "RAZORPAY_PLATFORM_PAYMENT_CONFIG_VERSION",
  "FLIGHT_PROVIDER_CONFIG_VERSION", "CATCH_WHATSAPP_REPLY_CREDENTIAL_VERSION",
  "EVENT_ASSISTANCE_GUEST_KEY_VERSION", "EVENT_ASSISTANCE_RCS_WEBHOOK_KEY_VERSION",
]);
const activationNames = Object.freeze([
  "CATCH_WHATSAPP_REPLIES_ENABLED", "EVENT_ASSISTANCE_RCS_WEBHOOK_ENABLED", "FLIGHT_PROVIDER_POLICY",
]);
function paramsContents(params) {
  return Object.entries(params).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join("\n") + "\n";
}

export function functionsParamsProvenance({projectId, sourceSha, environment = process.env}) {
  assert(/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/u.test(projectId), "invalid Firebase project id");
  assert(/^[a-f0-9]{40}$/u.test(sourceSha ?? ""), "an exact source SHA is required for provenance");
  const params = normalizedProviderParams(environment, projectId);
  // No arbitrary environment entries or parameter values can enter this receipt.
  return {version: 1, projectId, sourceSha,
    paramsSha256: createHash("sha256").update(paramsContents(params)).digest("hex"),
    names: materializedNonSecretParams.map((name) => ({name,
      source: name === "FLIGHT_PROVIDER_POLICY" ? "source-disabled" :
        name !== "CATCH_WHATSAPP_WEBHOOK_ENABLED" && environment[name]?.trim() ?
          "deployment-environment" : "source-default"})),
    references: Object.fromEntries(referenceNames.map((name) => [name, params[name].trim() || null])),
    activation: Object.fromEntries(activationNames.map((name) => [name, name === "FLIGHT_PROVIDER_POLICY" ? Boolean(params[name].trim()) : params[name] === "true"])),
  };
}

function writePrivateOutput(outputPath, contents) {
  const descriptor = fs.openSync(outputPath,
    fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_TRUNC | fs.constants.O_NOFOLLOW, 0o600);
  try { fs.fchmodSync(descriptor, 0o600); fs.writeFileSync(descriptor, contents, "utf8"); }
  finally { fs.closeSync(descriptor); }
}

export function prepareFunctionsParamsForDeploy({
  functionsDir,
  projectId,
  environment = process.env,
  expectedProvenance,
  sourceSha,
}) {
  assert(/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId),
    "invalid Firebase project id");
  const resolvedFunctionsDir = fs.realpathSync(functionsDir);
  assert(fs.statSync(resolvedFunctionsDir).isDirectory(),
    "Functions deploy path must be a directory");
  assert(fs.existsSync(path.join(resolvedFunctionsDir, "package.json")),
    "Functions deploy path must contain package.json");
  assert(environment.CATCH_DEPLOY_CONFIG_SHA256 === undefined,
    "CATCH_DEPLOY_CONFIG_SHA256 is reserved for verified materialization");
  const params = normalizedProviderParams(environment, projectId);
  const outputPath = path.join(resolvedFunctionsDir, `.env.${projectId}`);
  const contents = paramsContents(params);
  if (expectedProvenance !== undefined) {
    const actual = functionsParamsProvenance({projectId, sourceSha, environment});
    assert(JSON.stringify(actual) === JSON.stringify(expectedProvenance),
      "Deployment parameter provenance changed after readiness; repeat preflight");
  }
  const verifiedContents = expectedProvenance !== undefined ?
    contents + `CATCH_DEPLOY_CONFIG_SHA256=${JSON.stringify(expectedProvenance.paramsSha256)}\n` : contents;
  writePrivateOutput(outputPath, verifiedContents);
  return {outputPath, enabled: params.META_WHATSAPP_ENABLED === "true"};
}

function runCli() {
  if (process.argv.includes("--provenance-only")) {
    const receipt = functionsParamsProvenance({projectId: option("--project"), sourceSha: option("--source-sha")});
    writePrivateOutput(path.resolve(option("--output")), JSON.stringify(receipt, null, 2) + "\n");
    console.log("Wrote names/reference-only Functions parameter provenance.");
    return;
  }
  let expectedProvenance;
  if (process.argv.includes("--provenance")) {
    try { expectedProvenance = JSON.parse(fs.readFileSync(option("--provenance"), "utf8")); }
    catch { throw new Error("Invalid Functions parameter provenance file."); }
  }
  const result = prepareFunctionsParamsForDeploy({
    functionsDir: path.resolve(option("--functions-dir")), projectId: option("--project"),
    ...(process.argv.includes("--provenance") ? {expectedProvenance, sourceSha: option("--source-sha")} : {}),
  });
  console.log(`Materialized non-secret Functions params; Meta enabled: ${result.enabled}.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) runCli();
