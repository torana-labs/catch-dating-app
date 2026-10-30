import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {checkOrganizerNomenclature} from "./check_organizer_nomenclature.mjs";

test("organizer nomenclature gate rejects legacy authority and generic copy", () => {
  const root = fixtureRoot();
  write(root, "website/src/firebase.ts", "requestClubClaim");
  write(root, "website/src/legacyApi.ts", `
    collection(db, "clubs");
    httpsCallable(functions, "createPublicClubReview");
  `);
  write(root, "lib/example.dart", "httpsCallable('joinClub')");
  write(root, "lib/contexts/organizers/data/organizers_repository.dart", `
    const _legacyCollectionPath = "clubs";
    watchWithLegacyProjection();
    import "organizer_projection_fallback.dart";
  `);
  write(root, "lib/l10n/app_en.arb", JSON.stringify({copy: "Join club"}));

  const result = checkOrganizerNomenclature({root});

  assert.equal(result.ok, false);
  assert.ok(result.findings.some((item) =>
    item.rule === "legacyAuthorityMarker"));
  assert.ok(result.findings.some((item) =>
    item.rule === "legacyAuthorityMarker" &&
    item.detail.includes("organizer_projection_fallback")));
  assert.ok(result.findings.some((item) =>
    item.rule === "legacyClientAuthorityPattern" &&
    item.path === "website/src/legacyApi.ts"));
  assert.ok(result.findings.some((item) =>
    item.rule === "legacyClientAuthorityPattern" &&
    item.path === "lib/example.dart"));
  assert.ok(result.findings.some((item) =>
    item.rule === "genericClubProductCopy"));
});

test("organizer nomenclature gate passes a canonical fixture", () => {
  const root = fixtureRoot();
  write(root, "contracts/firestore/organizers.schema.json", JSON.stringify({
    required: ["organizerType"],
    properties: {organizerType: {enum: [
      "club", "community", "individual", "eventProducer", "venue", "brand",
    ]}},
  }));
  write(root, "contracts/migrations/clubs_to_organizers.json", JSON.stringify({
    selectedFutureName: "organizers",
    currentPhase: "retire_legacy",
  }));
  for (const [file, markers] of new Map([
    ["lib/contexts/organizers/data/organizers_repository.dart", [
      "_collectionPath = 'organizers'", "createOrganizer",
      "startOrganizerConversation",
    ]],
    ["lib/contexts/organizers/data/organizer_membership_repository.dart", ["organizerFollows"]],
    ["lib/contexts/organizers/data/organizer_posts_repository.dart", ["createOrganizerPost"]],
    ["lib/contexts/profiles/data/image_upload_repository.dart", ["organizers/"]],
    ["lib/routing/route_contract.dart", ["/host/organizer"]],
    ["website/src/firebase.ts", [
      "requestOrganizerClaim", "createPublicOrganizerReview",
    ]],
    ["admin/src/shared/api/adminApi.ts", [
      "adminGetOrganizerDetails", "adminListOrganizerDetails",
      "adminUpdateOrganizerDetails",
    ]],
    ["functions/src/index.ts", [
      "createOrganizer", "followOrganizer", "startOrganizerConversation",
      "adminGetOrganizerDetails", "adminGetOrganizerClaimRequestDetails",
      "adminListOrganizerClaimRequests", "adminSetOrganizerIndexStatus",
    ]],
    ["tool/data/migrate_clubs_to_organizers.mjs", ["--confirm-migration"]],
    ["docs/migrations/clubs_to_organizers.md", ["organizerType"]],
  ])) write(root, file, markers.join("\n"));
  write(root, "lib/l10n/app_en.arb", JSON.stringify({
    generic: "Follow organizer",
    hostsOrganizerTypeClub: "Club",
  }));

  const result = checkOrganizerNomenclature({root});

  assert.deepEqual(result, {ok: true, findings: []});
});

test("organizer nomenclature gate rejects club in Flutter names but keeps the subtype and contract names", () => {
  const root = fixtureRoot();
  write(root, "lib/clubs/club_card.dart", "class ClubCard {}");
  write(root, "lib/organizers/organizer_tile.dart", [
    "class OrganizerTile {",
    "  final clubLabel = 'club';",
    "  bool get isClub => type == OrganizerType.club;",
    "  final runClub = true;",
    "  String get id => request.clubId;",
    "}",
  ].join("\n"));
  write(root, "lib/platform/schema_contracts/generated/schemas/request.g.dart",
    "final class CreateClubRequest { final String clubId = ''; }");
  write(root, "lib/l10n/app_en.arb", JSON.stringify({clubsTitle: "Organizers", hostsOrganizerTypeClub: "Club"}));

  const findings = checkOrganizerNomenclature({root}).findings
    .filter((item) => item.rule === "clubInFlutterNames");

  assert.deepEqual(findings.map((item) => item.path).sort(), [
    "lib/clubs/club_card.dart",
    "lib/clubs/club_card.dart",
    "lib/l10n/app_en.arb",
    "lib/organizers/organizer_tile.dart",
  ]);
  const tile = findings.find((item) => item.path === "lib/organizers/organizer_tile.dart");
  assert.match(tile.detail, /clubLabel, isClub$/u);
  assert.match(findings.find((item) => item.path === "lib/l10n/app_en.arb").detail, /clubsTitle$/u);
});

function fixtureRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "organizer-gate-"));
}

function write(root, relativePath, content) {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), {recursive: true});
  fs.writeFileSync(filePath, `${content}\n`);
}
