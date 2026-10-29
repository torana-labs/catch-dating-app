#!/usr/bin/env node
import path from "node:path";
import {createRequire} from "node:module";
import {isDeepStrictEqual} from "node:util";
import {fileURLToPath, pathToFileURL} from "node:url";
import {
  assertValidSchemaPayload,
  validateProfilePhoto,
  validatePublicProfileDocument,
} from "../contracts/generated/schema_contract_validators.mjs";
import {profilePhotoPolicy} from "../contracts/generated/schema_contract_registry.mjs";
import {
  isFirebaseProductionTarget,
  resolveFirebaseProjectId,
} from "../lib/firebase_project.mjs";

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
  if (args.apply && isProductionTarget(args) && !args.allowProd) {
    throw new Error(
      "Refusing to backfill prod without --allow-prod. " +
        "Run a dry run first, then rerun with --apply --allow-prod."
    );
  }
  if (args.emulatorHost) {
    process.env.FIRESTORE_EMULATOR_HOST = args.emulatorHost;
  }

  const projectId = resolveProjectId(args);
  const admin = requireFromFunctions("firebase-admin");
  admin.initializeApp({projectId});
  const projection = loadProfileProjection();
  const plan = await buildProfilePhotoBackfillPlan(admin.firestore(), {
    timestampFromMillis: admin.firestore.Timestamp.fromMillis,
    projection,
  });

  if (args.json) {
    console.log(JSON.stringify(plan.summary, null, 2));
  } else {
    printSummary(plan.summary);
  }

  if (!args.apply) {
    console.log("\nDry run only. Re-run with --apply to write repairs.");
    return;
  }

  await applyProfilePhotoBackfillPlan(admin.firestore(), plan);
  console.log("\nApplied profile photo backfill repairs.");
}

export async function buildProfilePhotoBackfillPlan(
  firestore,
  {
    timestampFromMillis,
    projection,
    validatePhoto = validateProfilePhoto,
    validatePublicProfile = validatePublicProfileDocument,
  }
) {
  const [usersSnap, publicProfilesSnap] = await Promise.all([
    firestore.collection("users").get(),
    firestore.collection("publicProfiles").get(),
  ]);
  const publicProfiles = new Map(
    publicProfilesSnap.docs.map((doc) => [doc.id, doc.data()])
  );

  const repairs = [];
  const warnings = [];
  let usersWithLegacyArrays = 0;
  let usersWithGroupedPhotos = 0;
  let usersMissingPhotos = 0;

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const user = userDoc.data();
    const profilePhotos = normalizeProfilePhotosForBackfill(user, {
      uid,
      timestampFromMillis,
    });

    if (profilePhotos.length === 0) {
      usersMissingPhotos += 1;
      continue;
    }
    if (Array.isArray(user.profilePhotos) && user.profilePhotos.length > 0) {
      usersWithGroupedPhotos += 1;
    } else {
      usersWithLegacyArrays += 1;
    }

    const validationErrors = validateProfilePhotos(
      profilePhotos,
      `users/${uid}.profilePhotos`,
      validatePhoto
    );
    if (validationErrors.length > 0) {
      warnings.push(...validationErrors);
      continue;
    }

    const userPatch = profilePhotoPatch(profilePhotos);
    if (!photoFieldsEqual(user, userPatch)) {
      repairs.push({
        op: "update",
        path: `users/${uid}`,
        uid,
        reason: "profilePhotosBackfill",
        fields: userPatch,
      });
    }

    if (user.profileComplete !== true || user.deleted === true) continue;
    const currentPublic = publicProfiles.get(uid);
    const projectedUser = {...user, ...userPatch};
    let expectedPublic;
    try {
      expectedPublic = projection.publicProfileFromUserProfileDoc(projectedUser);
      assertValidSchemaPayload(
        validatePublicProfile,
        schemaSerializableFirestoreData(expectedPublic),
        `publicProfiles/${uid}`
      );
    } catch (error) {
      warnings.push(
        `publicProfiles/${uid} could not be projected after photo ` +
          `backfill: ${error.message}`
      );
      continue;
    }
    if (!currentPublic || !firestoreDataEqual(currentPublic, expectedPublic)) {
      repairs.push({
        op: "set",
        path: `publicProfiles/${uid}`,
        uid,
        reason: currentPublic ?
          "publicProfilePhotoProjectionStale" :
          "publicProfileMissing",
        expected: expectedPublic,
      });
    }
  }

  return {
    repairs,
    summary: {
      usersScanned: usersSnap.size,
      publicProfilesScanned: publicProfilesSnap.size,
      usersWithLegacyArrays,
      usersWithGroupedPhotos,
      usersMissingPhotos,
      repairsNeeded: repairs.length,
      userRepairsNeeded: repairs.filter((repair) => repair.path.startsWith("users/")).length,
      publicProfileRepairsNeeded: repairs.filter((repair) =>
        repair.path.startsWith("publicProfiles/")
      ).length,
      warnings,
      repairs: repairs.slice(0, 100),
    },
  };
}

export async function applyProfilePhotoBackfillPlan(firestore, plan) {
  for (let i = 0; i < plan.repairs.length; i += 450) {
    const batch = firestore.batch();
    for (const repair of plan.repairs.slice(i, i + 450)) {
      const ref = firestore.doc(repair.path);
      if (repair.op === "set") {
        batch.set(ref, repair.expected);
      } else {
        batch.update(ref, repair.fields);
      }
    }
    await batch.commit();
  }
}

export function normalizeProfilePhotosForBackfill(
  profile,
  {uid, timestampFromMillis}
) {
  const existing = Array.isArray(profile.profilePhotos) ?
    profile.profilePhotos :
    [];
  const existingPhotos = normalizeStoredProfilePhotos(existing);
  if (existingPhotos.length > 0) return existingPhotos;

  const photoUrls = stringArray(profile.photoUrls);
  const thumbnailUrls = stringArray(profile.photoThumbnailUrls);
  const promptsByIndex = new Map(
    photoPromptArray(profile.photoPrompts).map((prompt) => [
      prompt.photoIndex,
      prompt,
    ])
  );
  const epoch = timestampFromMillis(0);
  return photoUrls.map((url, index) => {
    const storagePath = storagePathFromDownloadUrl(url) ??
      `users/${uid}/photos/legacy_${index}.jpg`;
    const thumbnailUrl = thumbnailUrls[index] ?? url;
    return {
      id: profilePhotoIdForStoragePath(storagePath, index),
      url,
      thumbnailUrl,
      storagePath,
      thumbnailStoragePath: storagePathFromDownloadUrl(thumbnailUrl) ??
        thumbnailStoragePathForStoragePath(storagePath),
      prompt: promptsByIndex.get(index) ?? null,
      moderation: null,
      position: index,
      createdAt: epoch,
      updatedAt: epoch,
    };
  });
}

function normalizeStoredProfilePhotos(photos) {
  return photos
    .filter((photo) => photo && typeof photo === "object")
    .map((photo) => ({
      ...photo,
      id: stringValue(photo.id),
      url: stringValue(photo.url),
      thumbnailUrl: stringValue(photo.thumbnailUrl) || stringValue(photo.url),
      storagePath: stringValue(photo.storagePath),
      thumbnailStoragePath: stringValue(photo.thumbnailStoragePath),
      position: Number.isInteger(photo.position) ? photo.position : 0,
    }))
    .filter((photo) =>
      photo.id &&
      photo.url &&
      photo.thumbnailUrl &&
      photo.storagePath &&
      photo.thumbnailStoragePath
    )
    .sort((a, b) => a.position - b.position)
    .slice(0, profilePhotoPolicy.maxPhotos);
}

function profilePhotoPatch(profilePhotos) {
  return {
    profilePhotos,
  };
}

function photoFieldsEqual(current, patch) {
  return isDeepStrictEqual(current.profilePhotos ?? [], patch.profilePhotos);
}

function firestoreDataEqual(left, right) {
  return isDeepStrictEqual(
    schemaSerializableFirestoreData(left),
    schemaSerializableFirestoreData(right)
  );
}

function validateProfilePhotos(profilePhotos, pathPrefix, validator) {
  const errors = [];
  for (const [index, photo] of profilePhotos.entries()) {
    if (!validator(schemaSerializableFirestoreData(photo))) {
      errors.push(`${pathPrefix}[${index}] failed schema validation.`);
    }
  }
  return errors;
}

function stringArray(value) {
  return Array.isArray(value) ?
    value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim()) :
    [];
}

function photoPromptArray(value) {
  return Array.isArray(value) ?
    value.filter((item) =>
      item &&
      typeof item === "object" &&
      Number.isInteger(item.photoIndex)
    ) :
    [];
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function storagePathFromDownloadUrl(value) {
  try {
    const url = new URL(value);
    const segments = url.pathname.split("/").filter(Boolean);
    const objectMarkerIndex = segments.indexOf("o");
    if (objectMarkerIndex < 0 || objectMarkerIndex + 1 >= segments.length) {
      return null;
    }
    return decodeURIComponent(segments[objectMarkerIndex + 1]);
  } catch {
    return null;
  }
}

function thumbnailStoragePathForStoragePath(storagePath) {
  const parts = storagePath.split("/");
  if (parts.length >= 4 && parts[0] === "users" && parts[2] === "photos") {
    const sourceName = stripExtension(parts[parts.length - 1]);
    return `users/${parts[1]}/photoThumbnails/${sourceName}.jpg`;
  }
  return `${storagePath}.thumbnail.jpg`;
}

function profilePhotoIdForStoragePath(storagePath, position) {
  const fileName = stripExtension(storagePath.split("/").pop() ?? "");
  const normalized = fileName
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return normalized || `photo_${position}`;
}

function stripExtension(fileName) {
  const dot = fileName.lastIndexOf(".");
  return dot <= 0 ? fileName : fileName.slice(0, dot);
}

function schemaSerializableFirestoreData(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (isFirestoreTimestamp(value)) return schemaSerializableTimestamp(value);
  if (Array.isArray(value)) {
    return value.map((item) => schemaSerializableFirestoreData(item));
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, item]) => [key, schemaSerializableFirestoreData(item)])
        .filter(([, item]) => item !== undefined)
    );
  }
  return value;
}

function isFirestoreTimestamp(value) {
  return value &&
    typeof value === "object" &&
    typeof value.toDate === "function" &&
    typeof value.toMillis === "function";
}

function schemaSerializableTimestamp(timestamp) {
  if (
    Number.isInteger(timestamp.seconds) &&
    Number.isInteger(timestamp.nanoseconds)
  ) {
    return {_seconds: timestamp.seconds, _nanoseconds: timestamp.nanoseconds};
  }
  const millis = timestamp.toMillis();
  return {
    _seconds: Math.floor(millis / 1000),
    _nanoseconds: (millis % 1000) * 1000000,
  };
}

function loadProfileProjection() {
  try {
    return requireFromFunctions("./lib/shared/profileProjection.js");
  } catch (error) {
    throw new Error(
      "Could not load functions/lib/shared/profileProjection.js. " +
        "Event `npm --prefix functions run build` before this tool. " +
        `Original error: ${error.message}`
    );
  }
}

function parseArgs(argv) {
  const parsed = {
    env: null,
    project: null,
    emulatorHost: null,
    apply: false,
    allowProd: false,
    json: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--apply") parsed.apply = true;
    else if (arg === "--allow-prod") parsed.allowProd = true;
    else if (arg === "--json") parsed.json = true;
    else if (arg === "--emulator") parsed.emulatorHost = "127.0.0.1:8080";
    else if (arg === "--emulator-host") {
      parsed.emulatorHost = requireValue(argv, ++i, arg);
    } else if (arg === "--env") {
      parsed.env = requireValue(argv, ++i, arg);
    } else if (arg === "--project") {
      parsed.project = requireValue(argv, ++i, arg);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return parsed;
}

function requireValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function resolveProjectId(args) {
  if (args.project || args.env) return resolveFirebaseProjectId(args);
  if (process.env.GCLOUD_PROJECT) return process.env.GCLOUD_PROJECT;
  if (process.env.GOOGLE_CLOUD_PROJECT) return process.env.GOOGLE_CLOUD_PROJECT;
  return resolveFirebaseProjectId(args);
}

function isProductionTarget(args) {
  const projectId = resolveProjectId(args);
  return isFirebaseProductionTarget({...args, projectId});
}

function printSummary(summary) {
  console.log("Profile photo backfill summary");
  console.log(`- Users scanned: ${summary.usersScanned}`);
  console.log(`- Public profiles scanned: ${summary.publicProfilesScanned}`);
  console.log(`- Legacy photo-array users: ${summary.usersWithLegacyArrays}`);
  console.log(`- Grouped photo users: ${summary.usersWithGroupedPhotos}`);
  console.log(`- Users without photos: ${summary.usersMissingPhotos}`);
  console.log(`- Repairs needed: ${summary.repairsNeeded}`);
  console.log(`- Warnings: ${summary.warnings.length}`);
}

function printHelp() {
  console.log(`Usage: node tool/data/backfill_profile_photos.mjs [options]

Options:
  --env dev|staging|prod     Select Firebase project alias.
  --project <projectId>      Override Firebase project id.
  --emulator                 Use FIRESTORE_EMULATOR_HOST=127.0.0.1:8080.
  --emulator-host <host>     Use a custom Firestore emulator host.
  --json                     Print JSON summary.
  --apply                    Write the computed repairs.
  --allow-prod               Required with --apply for prod targets.
  -h, --help                 Show this help.
`);
}

function isMain() {
  return process.argv[1] &&
    pathToFileURL(process.argv[1]).href === import.meta.url;
}
