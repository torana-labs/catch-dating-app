#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {fromRepo} from "./lib/repo_paths.mjs";

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
  return {ok: findings.length === 0, findings};
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
