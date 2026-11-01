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
    ["lib/platform/analytics/app_analytics.dart", ["static const organizerId = 'organizer_id';"]],
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

test("organizer nomenclature gate rejects club in wire names but keeps the subtype and snake_case code keys", () => {
  const root = fixtureRoot();
  write(root, "contracts/firestore/events.schema.json", JSON.stringify({
    title: "EventDocument",
    properties: {
      organizerId: {type: "string"},
      clubName: {type: "string"},
      organizerType: {enum: ["club", "venue"]},
      club_id: {type: "string"},
    },
  }));
  write(root, "functions/src/events/clubEvents.ts", [
    "export const runClub = true;",
    "export const type = \"club\";",
    "export const row = {club_id: 1};",
    "export function loadClub() {}",
  ].join("\n"));
  write(root, "functions/src/events/organizerEvents.ts", "export const label = \"Run clubs\";");

  const findings = checkOrganizerNomenclature({root}).findings
    .filter((item) => item.rule === "clubInWireNames");

  assert.deepEqual(findings.map((item) => `${item.path}: ${item.detail}`).sort(), [
    "contracts/firestore/events.schema.json: The contract declares clubName; say organizer.",
    "contracts/firestore/events.schema.json: The contract declares club_id; say organizer.",
    "functions/src/events/clubEvents.ts: The file name says club; it is functions/src/events/organizerEvents.ts.",
    "functions/src/events/clubEvents.ts: loadClub names club in code; say organizer.",
  ]);
});

test("organizer nomenclature gate rejects club in the warehouse except the column migration", () => {
  const root = fixtureRoot();
  write(root, "analytics/sql/ddl/events.sql", "CREATE TABLE t (club_id STRING)\nCLUSTER BY club_id");
  write(root, "analytics/sql/marts/refresh.sql", "SELECT organizer_id FROM `%s.%s.clubs_raw_latest`");
  write(root, "tool/analytics/deploy.sh", [
    "rename_to_organizer t \"RENAME COLUMN club_id TO organizer_id, RENAME COLUMN club_name TO organizer_name\"",
    "rename_to_organizer u \"RENAME COLUMN club_id TO organizer_name\"",
  ].join("\n"));
  write(root, "contracts/bigquery/event.schema.json", JSON.stringify({properties: {organizer_id: {}}}));
  write(root, "extensions/bq-host-clubs.env", "COLLECTION_PATH=organizers");
  write(root, "firebase.json", JSON.stringify({extensions: {
    "bq-host-clubs": "firebase/firestore-bigquery-export@0.3.2",
    "bq-host-organizers": "firebase/firestore-bigquery-export@0.3.2",
  }}));
  write(root, "functions/src/analytics/writer.ts", [
    "export const row = {club_id: id, organizer_name: name};",
    "export const fixture = {organizerId: \"club-1\", name: \"Saket Run Club\"};",
  ].join("\n"));

  const findings = checkOrganizerNomenclature({root}).findings
    .filter((item) => item.rule === "clubInWarehouseNames");

  assert.deepEqual(findings.map((item) => `${item.path}: ${item.detail.split(" ")[0]}`).sort(), [
    "analytics/sql/ddl/events.sql: club_id",
    "analytics/sql/marts/refresh.sql: clubs_raw_latest",
    "extensions/bq-host-clubs.env: bq-host-clubs.env",
    "firebase.json: bq-host-clubs",
    "functions/src/analytics/writer.ts: club_id",
    "tool/analytics/deploy.sh: club_id",
  ]);
});

function fixtureRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "organizer-gate-"));
}

function write(root, relativePath, content) {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), {recursive: true});
  fs.writeFileSync(filePath, `${content}\n`);
}
