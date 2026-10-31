#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";
import {fileURLToPath, pathToFileURL} from "node:url";
import {readFirebaseProjectAliases} from "../lib/firebase_project.mjs";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolDir, "../..");
const requireFromFunctions = createRequire(
  path.join(repoRoot, "functions/package.json")
);

if (isMain()) {
  await main();
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    printHelp();
    return;
  }

  const admin = requireFromFunctions("firebase-admin");
  const envs = resolveEnvSpecs(args);
  const results = [];

  for (const env of envs) {
    if (args.apply && env.name === "prod" && !args.allowProd) {
      throw new Error("Refusing to apply prod changes without --allow-prod.");
    }
    const app = admin.initializeApp(
      {projectId: env.projectId, storageBucket: env.storageBucket},
      `hygiene-media-${env.name}-${Date.now()}`
    );
    try {
      const plan = await buildMediaHygienePlan({
        admin,
        firestore: app.firestore(),
        bucket: app.storage().bucket(),
        env,
      });
      const applyResult = args.apply ?
        await applyMediaHygienePlan({
          admin,
          firestore: app.firestore(),
          bucket: app.storage().bucket(),
          plan,
        }) :
        null;
      results.push({...plan.summary, applyResult});
    } finally {
      await app.delete();
    }
  }

  if (args.json) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    printResults(results, {applied: args.apply});
  }

  if (!args.apply) {
    console.log("\nDry run only. Re-run with --apply to migrate/delete.");
  }
}

export async function buildMediaHygienePlan({
  admin,
  firestore,
  bucket,
  env,
}) {
  const [organizersSnap, eventsSnap, claimsSnap, legacyFiles] = await Promise.all([
    firestore.collection("clubs").get(),
    firestore.collection("events").get(),
    firestore.collection("organizerHostClaims").get(),
    listLegacyOrganizerFiles(bucket),
  ]);

  const organizers = new Map(
    organizersSnap.docs.map((doc) => [doc.id, {id: doc.id, ref: doc.ref, data: doc.data()}])
  );
  const ownerOrganizerIds = new Map();
  for (const organizer of organizers.values()) {
    const ownerUid = ownerUidForOrganizer(organizer.data);
    if (!ownerUid) continue;
    const organizerIds = ownerOrganizerIds.get(ownerUid) ?? [];
    organizerIds.push(organizer.id);
    ownerOrganizerIds.set(ownerUid, organizerIds);
  }

  const references = [];
  for (const organizer of organizers.values()) {
    for (const field of ["imageUrl", "profileImageUrl"]) {
      const value = organizer.data[field];
      if (typeof value !== "string" || value.length === 0) continue;
      references.push(referenceForUrl({
        collection: "clubs",
        docId: organizer.id,
        docPath: organizer.ref.path,
        field,
        url: value,
        objectPath: storagePathFromUrl(value, bucket.name),
        ownerUid: ownerUidForOrganizer(organizer.data),
      }));
    }
  }

  for (const eventDoc of eventsSnap.docs) {
    const event = eventDoc.data();
    const value = event.photoUrl;
    if (typeof value !== "string" || value.length === 0) continue;
    const organizerId = typeof event.organizerId === "string" ? event.organizerId : null;
    const organizer = organizerId ? organizers.get(organizerId) : null;
    references.push(referenceForUrl({
      collection: "events",
      docId: eventDoc.id,
      docPath: eventDoc.ref.path,
      field: "photoUrl",
      url: value,
      objectPath: storagePathFromUrl(value, bucket.name),
      ownerUid: organizer ? ownerUidForOrganizer(organizer.data) : null,
      organizerId,
    }));
  }

  const legacyReferences = references.filter((ref) => ref.state === "legacy");
  const legacyObjectNames = new Set(legacyFiles.map((file) => file.name));
  const referencedLegacyObjects = new Set(
    legacyReferences
      .map((ref) => ref.objectPath)
      .filter((objectPath) => typeof objectPath === "string")
  );
  const unreferencedLegacyObjects = legacyFiles
    .map((file) => file.name)
    .filter((objectPath) => !referencedLegacyObjects.has(objectPath));

  const mediaRepairs = legacyReferences.map((ref) => ({
    ...ref,
    sourceExists: legacyObjectNames.has(ref.objectPath),
    destinationPath: ref.ownerUid && legacyObjectNames.has(ref.objectPath) ?
      hostedDestinationForReference(ref) :
      null,
  }));

  const claims = new Map(claimsSnap.docs.map((doc) => [doc.id, doc.data()]));
  const claimRepairs = [];
  const claimWarnings = [];
  for (const [ownerUid, organizerIds] of ownerOrganizerIds) {
    if (organizerIds.length !== 1) {
      const current = claims.get(ownerUid);
      claimWarnings.push({
        uid: ownerUid,
        currentClaimOrganizerId: current?.organizerId ?? null,
        organizers: organizerIds.map((organizerId) => organizerSummary(organizers.get(organizerId))),
        message: "Owner has multiple clubs; not auto-repairing singleton claim.",
      });
      continue;
    }
    const organizerId = organizerIds[0];
    const current = claims.get(ownerUid);
    if (!current || current.uid !== ownerUid || current.organizerId !== organizerId) {
      claimRepairs.push({
        uid: ownerUid,
        expectedOrganizerId: organizerId,
        currentOrganizerId: current?.organizerId ?? null,
        action: current ? "update" : "create",
      });
    }
  }
  const staleClaims = claimsSnap.docs
    .filter((doc) => {
      const data = doc.data();
      return typeof data.organizerId === "string" && !organizers.has(data.organizerId);
    })
    .map((doc) => ({
      uid: doc.id,
      organizerId: doc.data().organizerId,
      action: "delete",
    }));

  return {
    env,
    mediaRepairs,
    unreferencedLegacyObjects,
    claimRepairs,
    staleClaims,
    summary: {
      env: env.name,
      projectId: env.projectId,
      storageBucket: bucket.name,
      organizersScanned: organizersSnap.size,
      eventsScanned: eventsSnap.size,
      organizerHostClaimsScanned: claimsSnap.size,
      mediaReferences: summarizeReferences(references),
      legacyMediaReferences: mediaRepairs,
      unreferencedLegacyObjects,
      claimRepairs,
      staleClaims,
      claimWarnings,
    },
  };
}

export async function applyMediaHygienePlan({
  admin,
  firestore,
  bucket,
  plan,
}) {
  let copiedObjects = 0;
  let updatedDocuments = 0;
  let nulledMissingReferences = 0;
  let deletedLegacyObjects = 0;
  let claimWrites = 0;
  let staleClaimsDeleted = 0;

  for (const repair of plan.mediaRepairs) {
    const ref = firestore.doc(repair.docPath);
    if (repair.sourceExists && repair.destinationPath && repair.ownerUid) {
      const token = crypto.randomUUID();
      const source = bucket.file(repair.objectPath);
      const destination = bucket.file(repair.destinationPath);
      await source.copy(destination);
      await destination.setMetadata({
        metadata: {firebaseStorageDownloadTokens: token},
      });
      await ref.update({
        [repair.field]: downloadUrlForObject({
          bucketName: bucket.name,
          objectPath: repair.destinationPath,
          token,
        }),
      });
      copiedObjects += 1;
      updatedDocuments += 1;
    } else {
      await ref.update({[repair.field]: null});
      nulledMissingReferences += 1;
      updatedDocuments += 1;
    }
  }

  const sourceObjectsToDelete = new Set([
    ...plan.mediaRepairs
      .filter((repair) => repair.sourceExists)
      .map((repair) => repair.objectPath),
    ...plan.unreferencedLegacyObjects,
  ]);
  for (const objectPath of sourceObjectsToDelete) {
    await bucket.file(objectPath).delete({ignoreNotFound: true});
    deletedLegacyObjects += 1;
  }

  for (let i = 0; i < plan.claimRepairs.length; i += 450) {
    const batch = firestore.batch();
    for (const repair of plan.claimRepairs.slice(i, i + 450)) {
      const data = {
        uid: repair.uid,
        organizerId: repair.expectedOrganizerId,
      };
      if (repair.action === "create") {
        data.createdAt = admin.firestore.FieldValue.serverTimestamp();
      }
      batch.set(firestore.collection("organizerHostClaims").doc(repair.uid), data, {
        merge: true,
      });
      claimWrites += 1;
    }
    await batch.commit();
  }

  for (let i = 0; i < plan.staleClaims.length; i += 450) {
    const batch = firestore.batch();
    for (const claim of plan.staleClaims.slice(i, i + 450)) {
      batch.delete(firestore.collection("organizerHostClaims").doc(claim.uid));
      staleClaimsDeleted += 1;
    }
    await batch.commit();
  }

  return {
    copiedObjects,
    updatedDocuments,
    nulledMissingReferences,
    deletedLegacyObjects,
    claimWrites,
    staleClaimsDeleted,
  };
}

async function listLegacyOrganizerFiles(bucket) {
  const [files] = await bucket.getFiles({prefix: "clubs/"});
  return files.filter((file) => !file.name.endsWith("/"));
}

function referenceForUrl({
  collection,
  docId,
  docPath,
  field,
  url,
  objectPath,
  ownerUid,
  organizerId = null,
}) {
  let state = "external";
  if (objectPath?.startsWith("clubs/")) state = "legacy";
  else if (objectPath?.startsWith("users/") &&
      objectPath.includes("/hostedMedia/")) {
    state = "hosted";
  } else if (objectPath) {
    state = "other-storage";
  }
  return {
    collection,
    docId,
    docPath,
    field,
    state,
    objectPath,
    ownerUid,
    organizerId,
    url,
  };
}

function summarizeReferences(references) {
  const summary = {
    total: references.length,
    hosted: 0,
    legacy: 0,
    external: 0,
    otherStorage: 0,
  };
  for (const ref of references) {
    if (ref.state === "hosted") summary.hosted += 1;
    else if (ref.state === "legacy") summary.legacy += 1;
    else if (ref.state === "other-storage") summary.otherStorage += 1;
    else summary.external += 1;
  }
  return summary;
}

function storagePathFromUrl(value, bucketName) {
  if (typeof value !== "string" || value.length === 0) return null;
  if (value.startsWith(`gs://${bucketName}/`)) {
    return value.slice(`gs://${bucketName}/`.length);
  }
  try {
    const url = new URL(value);
    if (url.hostname === "firebasestorage.googleapis.com") {
      const marker = `/v0/b/${bucketName}/o/`;
      const markerIndex = url.pathname.indexOf(marker);
      if (markerIndex === -1) return null;
      const encodedPath = url.pathname.slice(markerIndex + marker.length);
      return decodeURIComponent(encodedPath);
    }
    if (url.hostname === "storage.googleapis.com") {
      const prefix = `/${bucketName}/`;
      if (!url.pathname.startsWith(prefix)) return null;
      return decodeURIComponent(url.pathname.slice(prefix.length));
    }
  } catch (_) {
    return null;
  }
  return null;
}

function hostedDestinationForReference(ref) {
  const original = ref.objectPath.split("/").pop() ?? "media.jpg";
  const extension = path.extname(original) || ".jpg";
  const base = safeToken(path.basename(original, extension));
  if (ref.collection === "clubs") {
    const kind = ref.field === "profileImageUrl" ? "profile" : "cover";
    return `users/${ref.ownerUid}/hostedMedia/club_${safeToken(ref.docId)}_` +
      `${kind}_legacy_${base}_${shortHash(ref.objectPath)}${extension}`;
  }
  const organizerId = ref.organizerId ?? "unknown-club";
  return `users/${ref.ownerUid}/hostedMedia/event_${safeToken(organizerId)}_` +
    `${safeToken(ref.docId)}_legacy_${base}_${shortHash(ref.objectPath)}` +
    extension;
}

function downloadUrlForObject({bucketName, objectPath, token}) {
  return "https://firebasestorage.googleapis.com/v0/b/" +
    `${bucketName}/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`;
}

function ownerUidForOrganizer(organizer) {
  if (typeof organizer.ownerUserId === "string" && organizer.ownerUserId.length > 0) {
    return organizer.ownerUserId;
  }
  if (typeof organizer.hostUserId === "string" && organizer.hostUserId.length > 0) {
    return organizer.hostUserId;
  }
  if (Array.isArray(organizer.hostUserIds) &&
      typeof organizer.hostUserIds[0] === "string") {
    return organizer.hostUserIds[0];
  }
  return null;
}

function organizerSummary(organizer) {
  return {
    id: organizer?.id ?? null,
    name: typeof organizer?.data?.name === "string" ? organizer.data.name : null,
    status: typeof organizer?.data?.status === "string" ? organizer.data.status : null,
    archived: organizer?.data?.archived === true,
    ownerUserId: ownerUidForOrganizer(organizer?.data ?? {}),
    hostUserId: typeof organizer?.data?.hostUserId === "string" ?
      organizer.data.hostUserId :
      null,
    hostUserIds: Array.isArray(organizer?.data?.hostUserIds) ?
      organizer.data.hostUserIds.filter((uid) => typeof uid === "string") :
      [],
  };
}

function safeToken(value) {
  const token = String(value).replaceAll(/[^A-Za-z0-9_-]+/g, "_");
  return token.length > 0 ? token : "media";
}

function shortHash(value) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 10);
}

function parseArgs(argv) {
  const parsed = {
    envs: [],
    all: false,
    apply: false,
    allowProd: false,
    json: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--all") parsed.all = true;
    else if (arg === "--apply") parsed.apply = true;
    else if (arg === "--allow-prod") parsed.allowProd = true;
    else if (arg === "--json") parsed.json = true;
    else if (arg === "--env") parsed.envs.push(requireValue(argv, ++i, arg));
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (!parsed.all && parsed.envs.length === 0) parsed.envs.push("dev");
  return parsed;
}

function requireValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function resolveEnvSpecs(args) {
  const projects = readFirebaseProjectAliases();
  const envNames = args.all ? ["dev", "staging", "prod"] : args.envs;
  return envNames.map((name) => {
    const projectId = projects[name];
    if (!projectId) {
      throw new Error(`No Firebase project alias found for env: ${name}`);
    }
    return {
      name,
      projectId,
      storageBucket: storageBucketForEnv(name, projectId),
    };
  });
}

function storageBucketForEnv(env, projectId) {
  const optionsPath = path.join(repoRoot, `lib/firebase_options_${env}.dart`);
  if (fs.existsSync(optionsPath)) {
    const contents = fs.readFileSync(optionsPath, "utf8");
    const match = /storageBucket:\s*'([^']+)'/.exec(contents);
    if (match) return match[1];
  }
  return `${projectId}.firebasestorage.app`;
}

function printHelp() {
  console.log(`Usage: node tool/data/hygiene_media_paths.mjs [options]

Audits and repairs legacy club/event Storage media paths.

Current canonical club/event media path:
  users/{uid}/hostedMedia/{fileName}

Retired legacy paths:
  clubs/{organizerId}/{fileName}
  clubs/{organizerId}/events/{eventId}/{fileName}

Options:
  --env <dev|staging|prod>  Audit one environment. Repeatable.
  --all                     Audit dev, staging, and prod.
  --apply                   Copy referenced legacy objects, update docs, and
                            delete retired legacy objects. Default is dry-run.
  --allow-prod              Required with --apply when prod is included.
  --json                    Print machine-readable summaries.
  -h, --help                Show this help.
`);
}

function printResults(results, {applied}) {
  for (const result of results) {
    console.log(`\n${result.env} (${result.projectId})`);
    console.log(`Bucket: ${result.storageBucket}`);
    console.log(
      `Media refs: ${result.mediaReferences.total} total, ` +
      `${result.mediaReferences.hosted} hosted, ` +
      `${result.mediaReferences.legacy} legacy, ` +
      `${result.mediaReferences.external} external`
    );
    console.log(`Legacy Storage objects: ${result.unreferencedLegacyObjects.length}`);
    console.log(`Claim repairs: ${result.claimRepairs.length}`);
    console.log(`Stale claims: ${result.staleClaims.length}`);
    if (applied) {
      console.log(`Applied: ${JSON.stringify(result.applyResult)}`);
    }
  }
}

function isMain() {
  return process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href;
}
