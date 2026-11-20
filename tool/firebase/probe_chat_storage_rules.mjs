#!/usr/bin/env node
import {Buffer} from "node:buffer";
import {pathToFileURL} from "node:url";
import {createFunctionsRequire} from "../lib/repo_paths.mjs";
import {readFirebaseProjectAliases} from "../lib/firebase_project.mjs";
import {
  parseFirebaseWebConfig,
  targetForEnvironment,
} from "./storage_rules_firestore_iam.mjs";
import fs from "node:fs";
import {
  exchangeAppCheckDebugToken as sharedExchangeAppCheckDebugToken,
  exchangeCustomToken as sharedExchangeCustomToken,
} from "../../packages/command-client/src/tokens.mjs";

export const canaryObjectName = "storage_canary_1.png";
const canaryPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);

export class CanaryStageError extends Error {
  constructor(stage, message) {
    super(`${stage}: ${message}`);
    this.name = "CanaryStageError";
    this.stage = stage;
  }
}

export function parseArgs(argv, env = process.env) {
  const args = {
    allowProd: false,
    appId: env.FIREBASE_STORAGE_CANARY_APP_ID ?? null,
    apply: false,
    env: "dev",
    help: false,
    json: false,
    matchId: env.CATCH_STORAGE_CANARY_MATCH_ID ?? null,
    uid: env.CATCH_STORAGE_CANARY_UID ?? null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--allow-prod") args.allowProd = true;
    else if (arg === "--app-id") args.appId = requireValue(argv, ++i, arg);
    else if (arg === "--apply") args.apply = true;
    else if (arg === "--env") args.env = requireValue(argv, ++i, arg);
    else if (arg === "--json") args.json = true;
    else if (arg === "--match-id") args.matchId = requireValue(argv, ++i, arg);
    else if (arg === "--uid") args.uid = requireValue(argv, ++i, arg);
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!["dev", "prod"].includes(args.env)) {
    throw new Error(`Unsupported Firebase environment: ${args.env}`);
  }
  if (args.apply && args.env === "prod" && !args.allowProd) {
    throw new Error("The production canary requires --allow-prod.");
  }
  if (!args.help && (!args.uid || !args.matchId)) {
    throw new Error(
      "Provide --uid and --match-id (or CATCH_STORAGE_CANARY_UID and " +
      "CATCH_STORAGE_CANARY_MATCH_ID)."
    );
  }
  return args;
}

export function buildMultipartUpload({objectPath, uploaderUid, boundary}) {
  const metadata = JSON.stringify({
    name: objectPath,
    contentType: "image/png",
    metadata: {uploaderUid},
  });
  const prefix = Buffer.from(
    `--${boundary}\r\n` +
      "Content-Type: application/json; charset=utf-8\r\n\r\n" +
      `${metadata}\r\n--${boundary}\r\n` +
      "Content-Type: image/png\r\n\r\n"
  );
  const suffix = Buffer.from(`\r\n--${boundary}--`);
  return Buffer.concat([prefix, canaryPng, suffix]);
}

export async function probeStorage({
  fetchImpl,
  bucket,
  objectPath,
  uid,
  idToken,
  appId,
  appCheckToken,
}) {
  const boundary = "catch-storage-canary-boundary";
  const authHeaders = {
    Authorization: `Firebase ${idToken}`,
    ...(appId ? {"X-Firebase-GMPID": appId} : {}),
    ...(appCheckToken ? {"X-Firebase-AppCheck": appCheckToken} : {}),
  };
  const uploadUrl =
    `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}` +
    `/o?name=${encodeURIComponent(objectPath)}`;
  const deleteUrl =
    `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}` +
    `/o/${encodeURIComponent(objectPath)}`;

  const upload = await fetchImpl(uploadUrl, {
    method: "POST",
    headers: {
      ...authHeaders,
      "Content-Type": `multipart/related; boundary=${boundary}`,
      "X-Goog-Upload-Protocol": "multipart",
    },
    body: buildMultipartUpload({objectPath, uploaderUid: uid, boundary}),
  });
  if (!upload.ok) {
    throw new CanaryStageError(
      "upload",
      await safeResponseMessage(upload)
    );
  }

  const deletion = await fetchImpl(deleteUrl, {
    method: "DELETE",
    headers: authHeaders,
  });
  if (!deletion.ok) {
    throw new CanaryStageError(
      "delete",
      await safeResponseMessage(deletion)
    );
  }
  return {uploaded: true, deleted: true};
}

export function redact(value, secrets) {
  let result = String(value);
  for (const secret of secrets.filter(Boolean)) {
    result = result.split(secret).join("[redacted]");
  }
  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  const aliases = readFirebaseProjectAliases();
  const target = targetForEnvironment({env: args.env, aliases});
  const webConfig = readWebConfig(args.env);
  const appId = args.appId ?? webConfig.appId;
  const objectPath =
    `matches/${args.matchId}/images/${canaryObjectName}`;
  const plan = {
    environment: args.env,
    projectId: target.projectId,
    bucket: webConfig.storageBucket,
    appId,
    matchId: args.matchId,
    uid: args.uid,
    objectPath,
  };

  if (!args.apply) {
    if (args.json) console.log(JSON.stringify({...plan, mode: "dry-run"}, null, 2));
    else {
      console.log("Chat Storage rules canary (dry-run)");
      console.log(`Project: ${target.projectId}`);
      console.log(`Object:  ${objectPath}`);
      console.log("Re-run with --apply to upload and immediately delete it.");
    }
    return;
  }

  const appCheckDebugToken =
    process.env.FIREBASE_STORAGE_CANARY_APPCHECK_DEBUG_TOKEN ?? null;
  const suppliedIdToken = process.env.FIREBASE_STORAGE_CANARY_ID_TOKEN ?? null;
  let idToken = suppliedIdToken;
  let appCheckToken = null;
  const secrets = [appCheckDebugToken, suppliedIdToken];
  let adminApp;

  try {
    const requireFromFunctions = createFunctionsRequire();
    const admin = requireFromFunctions("firebase-admin");
    adminApp = admin.initializeApp(
      {
        credential: admin.credential.applicationDefault(),
        projectId: target.projectId,
        serviceAccountId: `${target.projectId}@appspot.gserviceaccount.com`,
      },
      `chat-storage-canary-${args.env}-${Date.now()}`
    );
    await assertActiveParticipant({
      app: adminApp,
      matchId: args.matchId,
      uid: args.uid,
    });

    if (!idToken) {
      const customToken = await adminApp.auth().createCustomToken(args.uid);
      secrets.push(customToken);
      idToken = await exchangeCustomToken({
        fetchImpl: fetch,
        apiKey: webConfig.apiKey,
        customToken,
      });
      secrets.push(idToken);
    }
    if (appCheckDebugToken) {
      appCheckToken = await exchangeAppCheckDebugToken({
        fetchImpl: fetch,
        apiKey: webConfig.apiKey,
        appId,
        projectNumber: webConfig.projectNumber,
        debugToken: appCheckDebugToken,
      });
      secrets.push(appCheckToken);
    }

    const result = await probeStorage({
      fetchImpl: fetch,
      bucket: webConfig.storageBucket,
      objectPath,
      uid: args.uid,
      idToken,
      appId,
      appCheckToken,
    });
    if (args.json) console.log(JSON.stringify({...plan, ...result}, null, 2));
    else console.log(`PASS     ${args.env}: upload and delete both succeeded.`);
  } catch (error) {
    throw new Error(redact(error?.message ?? error, secrets));
  } finally {
    await adminApp?.delete();
  }
}

async function assertActiveParticipant({app, matchId, uid}) {
  const snap = await app.firestore().collection("matches").doc(matchId).get();
  if (!snap.exists) {
    throw new CanaryStageError("preflight", `Match ${matchId} does not exist.`);
  }
  const data = snap.data() ?? {};
  const participants = new Set([
    data.user1Id,
    data.user2Id,
    ...(Array.isArray(data.participantIds) ? data.participantIds : []),
  ]);
  if (data.status !== "active" || !participants.has(uid)) {
    throw new CanaryStageError(
      "preflight",
      "Canary identity is not an active participant in the selected match."
    );
  }
}

// The exchanges live in packages/command-client; these keep this probe's
// CanaryStageError (stage "auth" or "app-check") for every caller.
const canaryFailure = (stage, message) => new CanaryStageError(stage, message);

export function exchangeCustomToken(options) {
  return sharedExchangeCustomToken({...options, fail: canaryFailure});
}

export function exchangeAppCheckDebugToken(options) {
  return sharedExchangeAppCheckDebugToken({...options, fail: canaryFailure});
}

export function readWebConfig(env) {
  return parseFirebaseWebConfig(
    fs.readFileSync(
      new URL(
        `../../firebase/${env}/web/firebase-messaging-sw.js`,
        import.meta.url
      ),
      "utf8"
    )
  );
}

async function safeResponseMessage(response) {
  return responseMessage(response, await readJson(response));
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function responseMessage(response, body) {
  return body?.error?.message || body?.error || `HTTP ${response.status}`;
}

function requireValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function printHelp() {
  console.log(`Run one authenticated chat-image Storage rules canary.

Usage:
  node tool/firebase/probe_chat_storage_rules.mjs \\
    --env <dev|prod> --uid <uid> --match-id <match> [options]

Options:
  --apply                       Upload and immediately delete the fixture.
  --allow-prod                  Required with --apply for prod.
  --app-id <Firebase app id>    App Check app id; defaults to the web config.
  --json                        Emit machine-readable output.
  -h, --help                    Show this help.

Optional secrets are read only from environment variables:
  FIREBASE_STORAGE_CANARY_ID_TOKEN
  FIREBASE_STORAGE_CANARY_APPCHECK_DEBUG_TOKEN
  FIREBASE_STORAGE_CANARY_APP_ID

Without an ID token, the tool mints a short-lived custom token through the
Firebase Admin SDK. It never prints credentials. The selected uid must already
be an active participant in the selected match.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error?.message ?? String(error));
    process.exitCode = 1;
  });
}
