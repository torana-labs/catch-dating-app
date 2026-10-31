#!/usr/bin/env node
import fs from "node:fs";
import {execFileSync} from "node:child_process";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {fromRepo} from "./lib/repo_paths.mjs";
import {clubNameFindings} from "./architecture/rename_to_organizer.mjs";
import {wireNameFindings} from "./architecture/rename_wire_to_organizer.mjs";

const taxonomy = [
  "club",
  "community",
  "individual",
  "eventProducer",
  "venue",
  "brand",
];

const requiredMarkers = [
  ["lib/contexts/organizers/data/organizers_repository.dart", "_collectionPath = 'organizers'"],
  ["lib/contexts/organizers/data/organizers_repository.dart", "createOrganizer"],
  ["lib/contexts/organizers/data/organizer_membership_repository.dart", "organizerFollows"],
  ["lib/contexts/organizers/data/organizer_posts_repository.dart", "createOrganizerPost"],
  ["lib/contexts/organizers/data/organizers_repository.dart", "startOrganizerConversation"],
  ["lib/contexts/profiles/data/image_upload_repository.dart", "organizers/"],
  ["lib/routing/route_contract.dart", "/host/organizer"],
  ["website/src/firebase.ts", "requestOrganizerClaim"],
  ["website/src/firebase.ts", "createPublicOrganizerReview"],
  ["admin/src/shared/api/adminApi.ts", "adminGetOrganizerDetails"],
  ["admin/src/shared/api/adminApi.ts", "adminListOrganizerDetails"],
  ["admin/src/shared/api/adminApi.ts", "adminUpdateOrganizerDetails"],
  ["functions/src/index.ts", "createOrganizer"],
  ["functions/src/index.ts", "followOrganizer"],
  ["functions/src/index.ts", "startOrganizerConversation"],
  ["functions/src/index.ts", "adminGetOrganizerDetails"],
  ["functions/src/index.ts", "adminGetOrganizerClaimRequestDetails"],
  ["functions/src/index.ts", "adminListOrganizerClaimRequests"],
  ["functions/src/index.ts", "adminSetOrganizerIndexStatus"],
  ["lib/platform/analytics/app_analytics.dart", "static const organizerId = 'organizer_id';"],
  ["tool/data/migrate_clubs_to_organizers.mjs", "--confirm-migration"],
  ["docs/migrations/clubs_to_organizers.md", "organizerType"],
];

const forbiddenSourceMarkers = [
  ["website/src", "requestClubClaim"],
  ["website/src", "createPublicClubReview"],
  ["website/src", "listPublicClubReviews"],
  ["admin/src", "Cloud Firestore clubs/{id}"],
  ["admin/src", "Enter a clubs/{id}"],
  ["lib/contexts/organizers/data", "collection('clubs')"],
  ["lib/contexts/organizers/data", "organizer_projection_fallback"],
  ["lib/contexts/organizers/data/organizers_repository.dart", "_legacyCollectionPath"],
  ["lib/contexts/organizers/data/organizers_repository.dart", "WithLegacyProjection"],
  ["lib/contexts/organizers/data", "FirebaseFunctions.instance.httpsCallable('createClub')"],
  ["lib/contexts/profiles/data", "'clubs/$"],
  ["lib/contexts/discovery/data/explore_recommendations_repository.dart", "Your club"],
  ["lib/contexts/discovery/data/explore_recommendations_repository.dart", "From your clubs"],
  ["lib/organizers/presentation/detail/organizer_membership_controller.dart", "join a club"],
  ["lib/organizers/presentation/detail/organizer_membership_controller.dart", "leave a club"],
  ["lib/organizers/presentation/detail/organizer_membership_controller.dart", "update club notifications"],
  ["functions/src/index.ts", "createPublicClubReview"],
  ["functions/src/index.ts", "listPublicClubReviews"],
  ["functions/src/index.ts", "adminGetClubClaimRequestDetails"],
  ["functions/src/index.ts", "adminListClubClaimRequests"],
  ["functions/src/index.ts", "adminSetClubIndexStatus"],
  ["functions/src/index.ts", "adminGetClubDetails"],
  ["functions/src/index.ts", "adminListClubDetails"],
  ["functions/src/index.ts", "adminUpdateClubDetails"],
];

const forbiddenClientAuthorityPatterns = [
  {
    roots: ["lib", "website/src", "admin/src"],
    pattern: /collection\s*\(\s*["']clubs["']\s*\)/gu,
    detail: "Production clients must not read or write the legacy clubs collection.",
  },
  {
    roots: ["lib"],
    pattern: /httpsCallable\s*\(\s*["'](?:createClub|updateClub|archiveClub|deleteClub|createClubPost|joinClub|leaveClub|setClubNotificationPreference|requestClubClaim|startClubHostConversation|adminGetClubDetails|adminListClubDetails|adminUpdateClubDetails)["']\s*\)/gu,
    detail: "Flutter production code must call the organizer-named callable.",
  },
  {
    roots: ["website/src", "admin/src"],
    pattern: /httpsCallable(?:<[^>]+>)?\s*\(\s*(?:functions\s*,\s*)?["'](?:createClub|updateClub|archiveClub|deleteClub|createClubPost|joinClub|leaveClub|setClubNotificationPreference|requestClubClaim|startClubHostConversation|createPublicClubReview|listPublicClubReviews|adminGetClubDetails|adminListClubDetails|adminUpdateClubDetails)["']\s*\)/gu,
    detail: "React production code must call the organizer-named callable.",
  },
];

// Flutter code names say organizer. What tool/architecture/
// rename_to_organizer.mjs would still rename is a finding; it keeps the club
// subtype and the names the generated schema contracts declare.
const flutterNameRoots = ["lib", "test", "integration_test", "apps", "widgetbook", "packages", "tool"];
const skippedDirectories = new Set(["node_modules", ".dart_tool", "build", ".git"]);

const allowedClubCopyKeys = new Set([
  "hostsOrganizerTypeClub",
  "launchAccessLaunchAccessApplicationScreenBodyUsefulIfYouAlready",
  "organizersOrganizerHeroAppBarTitleOrganizerDetailCollapsedTitle",
  "organizersOrganizerHeroAppBarTextOrganizerDetailExpandedTitle",
]);

export function checkOrganizerNomenclature({root = fromRepo()} = {}) {
  const findings = [];
  checkTaxonomy(root, findings);
  checkMigrationState(root, findings);
  for (const [relativePath, marker] of requiredMarkers) {
    const source = read(root, relativePath, findings);
    if (source != null && !source.includes(marker)) {
      findings.push({
        rule: "missingCanonicalMarker",
        path: relativePath,
        detail: `Missing canonical organizer marker: ${marker}`,
      });
    }
  }
  for (const [relativePath, marker] of forbiddenSourceMarkers) {
    for (const filePath of sourceFiles(path.join(root, relativePath))) {
      const source = fs.readFileSync(filePath, "utf8");
      if (!source.includes(marker)) continue;
      findings.push({
        rule: "legacyAuthorityMarker",
        path: relative(root, filePath),
        detail: `Legacy authority marker is not allowed here: ${marker}`,
      });
    }
  }
  checkClientAuthorityPatterns(root, findings);
  checkProductCopy(root, findings);
  checkFlutterNames(root, findings);
  checkWireNames(root, findings);
  checkWarehouseNames(root, findings);
  return {ok: findings.length === 0, findings};
}

function checkFlutterNames(root, findings) {
  const files = flutterNameRoots.flatMap((dir) => flutterNameFiles(root, dir));
  const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
  for (const finding of clubNameFindings({files, read})) {
    findings.push({rule: "clubInFlutterNames", ...finding});
  }
}

// Contract, TypeScript and rules names say organizer too. What
// tool/architecture/rename_wire_to_organizer.mjs would still rename is a
// finding; it keeps the club subtype and the warehouse columns.
const wireNameRoots = ["contracts", "functions", "website", "admin", "packages", "operations", "tool"];
const wireNameFile = /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs|json|css)$/u;

function checkWireNames(root, findings) {
  // Tracked files only: build outputs (functions/lib, .next) are not sources.
  const files = trackedFiles(root)?.filter((file) => wireNameRoots.some((dir) => file.startsWith(`${dir}/`)) &&
    wireNameFile.test(file)) ?? wireNameRoots.flatMap((dir) => walkFiles(root, dir, (file) => wireNameFile.test(file)));
  const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
  for (const finding of wireNameFindings({files, read})) {
    findings.push({rule: "clubInWireNames", ...finding});
  }
}

// The BigQuery warehouse says organizer: its contracts, DDL, refresh SQL,
// tooling and docs, the export instances that feed it, and the snake_case
// columns its Functions writers and readers name. The organizer column
// migration names the columns it renames, and nothing else may.
const warehouseRoots = ["analytics/", "tool/analytics/", "contracts/bigquery/", "extensions/"];
const warehouseColumnRoots = ["functions/src/analytics/"];
const warehouseMigration = /RENAME COLUMN club_(id|name) TO organizer_\1/gu;
const clubWord = /[\w-]*club[\w-]*/giu;
const snakeClubWord = /\b[a-z0-9]*(?:club_|_club)[a-z0-9_]*\b/gu;

function checkWarehouseNames(root, findings) {
  const report = (file, word) => findings.push({rule: "clubInWarehouseNames", path: file,
    detail: `${word} names club in the warehouse; say organizer.`});
  const roots = [...warehouseRoots, ...warehouseColumnRoots];
  const files = trackedFiles(root)?.filter((file) => roots.some((dir) => file.startsWith(dir))) ??
    roots.flatMap((dir) => walkFiles(root, dir.slice(0, -1), () => true));
  for (const file of files) {
    const source = fs.readFileSync(path.join(root, file), "utf8");
    if (warehouseRoots.some((dir) => file.startsWith(dir))) {
      if (/club/iu.test(file)) report(file, path.posix.basename(file));
      for (const word of new Set(source.replace(warehouseMigration, "").match(clubWord))) report(file, word);
    } else {
      for (const word of new Set(source.match(snakeClubWord))) report(file, word);
    }
  }
  const firebaseJson = path.join(root, "firebase.json");
  if (!fs.existsSync(firebaseJson)) return;
  for (const instance of Object.keys(JSON.parse(fs.readFileSync(firebaseJson, "utf8")).extensions ?? {})) {
    if (/club/iu.test(instance)) report("firebase.json", instance);
  }
}

function trackedFiles(root) {
  try {
    return execFileSync("git", ["ls-files", "-z"], {cwd: root, encoding: "utf8", maxBuffer: 1 << 28,
      stdio: ["ignore", "pipe", "ignore"]}).split("\0").filter((file) => file !== "" && fs.existsSync(path.join(root, file)));
  } catch {
    return null;
  }
}

function walkFiles(root, relativeDir, keep) {
  const target = path.join(root, relativeDir);
  if (!fs.existsSync(target)) return [];
  const files = [];
  for (const entry of fs.readdirSync(target, {withFileTypes: true})) {
    const relativePath = `${relativeDir}/${entry.name}`;
    if (entry.isDirectory()) {
      if (!skippedDirectories.has(entry.name)) files.push(...walkFiles(root, relativePath, keep));
    } else if (keep(relativePath)) {
      files.push(relativePath);
    }
  }
  return files;
}

function flutterNameFiles(root, relativeDir) {
  const target = path.join(root, relativeDir);
  if (!fs.existsSync(target)) return [];
  const files = [];
  for (const entry of fs.readdirSync(target, {withFileTypes: true})) {
    const relativePath = `${relativeDir}/${entry.name}`;
    if (entry.isDirectory()) {
      if (!skippedDirectories.has(entry.name)) files.push(...flutterNameFiles(root, relativePath));
    } else if (entry.name.endsWith(".dart") || relativePath === "lib/l10n/app_en.arb") {
      files.push(relativePath);
    }
  }
  return files;
}

function checkClientAuthorityPatterns(root, findings) {
  for (const {roots, pattern, detail} of forbiddenClientAuthorityPatterns) {
    for (const relativeRoot of roots) {
      for (const filePath of sourceFiles(path.join(root, relativeRoot))) {
        const source = fs.readFileSync(filePath, "utf8");
        pattern.lastIndex = 0;
        if (!pattern.test(source)) continue;
        findings.push({
          rule: "legacyClientAuthorityPattern",
          path: relative(root, filePath),
          detail,
        });
      }
    }
  }
}

function checkTaxonomy(root, findings) {
  const relativePath = "contracts/firestore/organizers.schema.json";
  const source = read(root, relativePath, findings);
  if (source == null) return;
  try {
    const schema = JSON.parse(source);
    let values = schema.properties?.organizerType?.enum;
    const typeRef = schema.properties?.organizerType?.$ref;
    if (values == null && typeof typeRef === "string") {
      const [referencedFile, pointer] = typeRef.split("#");
      const referenced = JSON.parse(fs.readFileSync(
        path.resolve(root, "contracts/firestore", referencedFile),
        "utf8"
      ));
      values = pointer.split("/").filter(Boolean).reduce(
        (value, segment) => value?.[segment],
        referenced
      )?.enum;
    }
    if (JSON.stringify(values) !== JSON.stringify(taxonomy)) {
      findings.push({
        rule: "organizerTaxonomyDrift",
        path: relativePath,
        detail: `Expected organizerType enum: ${taxonomy.join(", ")}`,
      });
    }
    if (!(schema.required ?? []).includes("organizerType")) {
      findings.push({
        rule: "organizerTypeOptional",
        path: relativePath,
        detail: "organizerType must be required on canonical organizers.",
      });
    }
  } catch (error) {
    findings.push({
      rule: "invalidJson",
      path: relativePath,
      detail: error.message,
    });
  }
}

function checkMigrationState(root, findings) {
  const relativePath = "contracts/migrations/clubs_to_organizers.json";
  const source = read(root, relativePath, findings);
  if (source == null) return;
  try {
    const migration = JSON.parse(source);
    if (migration.selectedFutureName !== "organizers") {
      findings.push({
        rule: "migrationAuthorityDrift",
        path: relativePath,
        detail: "selectedFutureName must remain organizers.",
      });
    }
    if (migration.currentPhase !== "retire_legacy") {
      findings.push({
        rule: "legacyRetirementIncomplete",
        path: relativePath,
        detail: "Legacy retirement must be marked complete after cleanup approval.",
      });
    }
  } catch (error) {
    findings.push({rule: "invalidJson", path: relativePath, detail: error.message});
  }
}

function checkProductCopy(root, findings) {
  const relativePath = "lib/l10n/app_en.arb";
  const source = read(root, relativePath, findings);
  if (source == null) return;
  try {
    const messages = JSON.parse(source);
    for (const [key, value] of Object.entries(messages)) {
      if (key.startsWith("@") || allowedClubCopyKeys.has(key)) continue;
      if (typeof value !== "string" || !/\bclubs?\b/iu.test(value)) continue;
      findings.push({
        rule: "genericClubProductCopy",
        path: relativePath,
        detail: `${key} must use organizer language or be explicitly allowlisted.`,
      });
    }
  } catch (error) {
    findings.push({rule: "invalidJson", path: relativePath, detail: error.message});
  }
}

function read(root, relativePath, findings) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    findings.push({rule: "missingFile", path: relativePath, detail: "Missing file."});
    return null;
  }
  return fs.readFileSync(filePath, "utf8");
}

function sourceFiles(target) {
  if (!fs.existsSync(target)) return [];
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];
  const files = [];
  for (const entry of fs.readdirSync(target, {withFileTypes: true})) {
    const filePath = path.join(target, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(filePath));
    else if (/\.(?:dart|ts|tsx)$/u.test(entry.name) &&
        !/\.test\.(?:ts|tsx)$/u.test(entry.name)) files.push(filePath);
  }
  return files;
}

function relative(root, filePath) {
  return path.relative(root, filePath).split(path.sep).join("/");
}

function runCli() {
  const result = checkOrganizerNomenclature();
  if (!result.ok) {
    console.error("Organizer nomenclature check failed:");
    for (const finding of result.findings) {
      console.error(`- ${finding.path}: ${finding.detail}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log("Organizer nomenclature check passed.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) runCli();
