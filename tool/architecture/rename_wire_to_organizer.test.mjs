import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPlan,
  contractWireNames,
  mergeTwins,
  renameDartStrings,
  renameJson,
  renamePathString,
  renameRules,
  renameScript,
  renameSpecifier,
  transformFile,
  withoutRepeatedIndexes,
} from "./rename_wire_to_organizer.mjs";

const eventSchema = JSON.stringify({
  "title": "EventDocument",
  "x-firestore-collection": "events",
  "required": ["eventId", "clubId"],
  "properties": {
    "eventId": {"type": "string"},
    "clubId": {"type": "string"},
    "organizerId": {"type": "string"},
    "compatibilityClubId": {"type": "string"},
    "organizerType": {"enum": ["club", "venue"]},
    "notificationType": {"enum": ["clubUpdate", "eventReminder"]},
    "club_id": {"type": "string"},
  },
}, null, 2) + "\n";

function fixture(extra = {}) {
  const sources = {
    "contracts/firestore/events.schema.json": eventSchema,
    "contracts/firestore/club_memberships.schema.json":
      "{\"title\": \"ClubMembershipDocument\", \"x-firestore-collection\": \"clubMemberships\"}\n",
    "functions/src/shared/clubHosts.ts": "export const clubHostIds = [];\n",
    "packages/web-ui/src/components/ClubCover.tsx": "export function ClubCover() { return null; }\n",
    "lib/organizers/organizer.dart": "final key = 'clubId';\n",
    ...extra,
  };
  const files = Object.keys(sources);
  return {sources, plan: buildPlan({files, read: (file) => sources[file]})};
}

test("contracts declare wire names, and the subtype and warehouse columns stay", () => {
  assert.deepEqual(contractWireNames(JSON.parse(eventSchema)).sort(),
    ["clubId", "clubUpdate", "compatibilityClubId"]);
  const {plan} = fixture();
  assert.equal(plan.wire.get("clubId"), "organizerId");
  assert.equal(plan.wire.get("compatibilityClubId"), "canonicalHostId");
  assert.equal(plan.wire.get("clubMemberships"), "organizerMemberships");
  assert.equal(plan.wire.has("club"), false);
  assert.equal(plan.wire.has("club_id"), false);
});

test("club files move, and a move onto an existing file collides", () => {
  const {plan} = fixture({"functions/src/shared/organizerHosts.ts": "export {};\n"});
  assert.equal(plan.moves.get("packages/web-ui/src/components/ClubCover.tsx"),
    "packages/web-ui/src/components/OrganizerCover.tsx");
  assert.equal(plan.moves.get("contracts/firestore/club_memberships.schema.json"),
    "contracts/firestore/organizer_memberships.schema.json");
  assert.equal(plan.moves.has("lib/organizers/organizer.dart"), false);
  assert.deepEqual(plan.collisions,
    ["functions/src/shared/clubHosts.ts -> functions/src/shared/organizerHosts.ts exists"]);
});

test("a club member goes where its organizer twin is present", () => {
  const {plan} = fixture();
  const source = [
    "interface Event {\n  clubId: string;\n  organizerId?: string;\n}",
    "const doc = {clubId: id, organizerId: id, name};",
    "const {clubId, organizerId} = event;",
    "const owner = event.organizerId ?? event.clubId;",
    "",
  ].join("\n");
  assert.equal(mergeTwins({file: "x.ts", source: renameScript({file: "x.ts", source, plan})}), [
    "interface Event {\n  organizerId: string;\n}",
    "const doc = {organizerId: id, name};",
    "const {organizerId} = event;",
    "const owner = event.organizerId;",
    "",
  ].join("\n"));
});

test("identifiers, wire strings and comments rename; copy and the subtype stay", () => {
  const {plan} = fixture();
  const source = [
    "// Reads clubId for the club.",
    "const clubName = doc.get(\"clubId\");",
    "const type = \"club\";",
    "const label = \"Run clubs meet weekly\";",
    "const column = {club_id: 1};",
    "",
  ].join("\n");
  assert.equal(renameScript({file: "x.ts", source, plan}), [
    "// Reads organizerId for the club.",
    "const organizerName = doc.get(\"organizerId\");",
    "const type = \"club\";",
    "const label = \"Run clubs meet weekly\";",
    "const column = {club_id: 1};",
    "",
  ].join("\n"));
});

test("specifiers follow moved files and the generated outputs of renamed sources", () => {
  const moves = new Map([["functions/src/admin/clubDetails.ts", "functions/src/admin/organizerDetails.ts"]]);
  assert.equal(renameSpecifier("./clubDetails", "functions/src/admin/index.ts", moves), "./organizerDetails");
  assert.equal(renameSpecifier("../shared/generated/validators/adminSetClubIndexStatusInput",
    "functions/src/admin/x.ts", moves), "../shared/generated/validators/adminSetOrganizerIndexStatusInput");
  assert.equal(renameSpecifier("firebase-admin", "functions/src/admin/x.ts", moves), "firebase-admin");
});

test("path strings follow moves, including paths relative to a moved file's root", () => {
  const plan = {moves: new Map([["contracts/firestore/club_memberships.schema.json",
    "contracts/firestore/organizer_memberships.schema.json"]])};
  assert.equal(renamePathString("firestore/club_memberships.schema.json", plan),
    "firestore/organizer_memberships.schema.json");
  assert.equal(renamePathString("functions/src/shared/generated/clubMembershipDocument.ts", plan),
    "functions/src/shared/generated/organizerMembershipDocument.ts");
  assert.equal(renamePathString("docs/migrations/clubs_to_organizers.md", plan),
    "docs/migrations/clubs_to_organizers.md");
});

test("merged twins: repeated imports, declarations, plain assignments and operands", () => {
  const source = [
    "import {OrganizerDocument, OrganizerDocument} from \"./types\";",
    "import {x} from \"./x\";",
    "import {x} from \"./x\";",
    "function f() {",
    "  let id = null;",
    "  let id = null;",
    "  id = event.organizerId;",
    "  id = event.organizerId;",
    "  if (ready && id != null && id != null) {}",
    "  return a() && a();",
    "}",
    "",
  ].join("\n");
  assert.equal(mergeTwins({file: "x.ts", source}), [
    "import {OrganizerDocument} from \"./types\";",
    "import {x} from \"./x\";",
    "function f() {",
    "  let id = null;",
    "  id = event.organizerId;",
    "  if (ready && id != null) {}",
    "  return a() && a();",
    "}",
    "",
  ].join("\n"));
});

test("JSON keeps its formatting, drops the club twin and keeps one required entry", () => {
  const {plan} = fixture();
  const out = renameJson(eventSchema, plan);
  const parsed = JSON.parse(out);
  assert.deepEqual(parsed.required, ["eventId", "organizerId"]);
  assert.equal("clubId" in parsed.properties, false);
  assert.ok("canonicalHostId" in parsed.properties);
  assert.deepEqual(parsed.properties.organizerType.enum, ["club", "venue"]);
  assert.deepEqual(parsed.properties.notificationType.enum, ["organizerUpdate", "eventReminder"]);
  assert.ok("club_id" in parsed.properties);
  assert.equal(renameJson("{\"a\": 1,  \"clubId\": \"x\"}\n", plan), "{\"a\": 1,  \"organizerId\": \"x\"}\n");
});

test("indexes that became the same index are one", () => {
  const index = {collectionGroup: "events", fields: [{fieldPath: "organizerId", order: "ASCENDING"}]};
  const source = JSON.stringify({indexes: [index, index], fieldOverrides: []}, null, 2) + "\n";
  assert.deepEqual(JSON.parse(withoutRepeatedIndexes(source)).indexes, [index]);
  const single = JSON.stringify({indexes: [index], fieldOverrides: []}, null, 2) + "\n";
  assert.equal(withoutRepeatedIndexes(single), single);
});

test("rules rename identifiers and wire strings but keep the subtype", () => {
  const {plan} = fixture();
  assert.equal(
    renameRules("function isClubHost(clubId) { return data.get('clubId', '') != '' && type == 'club'; }\n", plan),
    "function isOrganizerHost(organizerId) { return data.get('organizerId', '') != '' && type == 'club'; }\n");
});

test("Dart takes only its strings; identifiers rename with rename_to_organizer", () => {
  const {plan} = fixture();
  assert.equal(renameDartStrings("final clubId = json['clubId'];\n", plan), "final clubId = json['organizerId'];\n");
});

test("the codemods, generated outputs and the migration record are left alone", () => {
  const {plan} = fixture();
  for (const file of ["tool/architecture/rename_wire_to_organizer.mjs", "functions/src/shared/generated/x.ts",
    "docs/migrations/clubs_to_organizers.md", "contracts/migrations/clubs_to_organizers.json"]) {
    assert.equal(transformFile({file, source: "const clubId = 1;\n", plan}), "const clubId = 1;\n", file);
  }
});
