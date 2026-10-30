import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPlan,
  planFolderMoves,
  planPathMoves,
  renameArbKeys,
  renameDartCode,
  renameWord,
  transformFile,
  verifyRenameDiff,
  withoutRepeatedEntries,
} from "./rename_to_organizer.mjs";

const arb = JSON.stringify({
  clubsDetailTitle: "Club",
  "@clubsDetailTitle": {description: "Title."},
  hostsOrganizerTypeClub: "Club",
});

function fixture(extra = {}) {
  const sources = {
    "lib/l10n/app_en.arb": arb,
    "lib/clubs/club_card.dart": [
      "import 'package:catch_dating_app/contexts/organizers/domain/club.dart';",
      "",
      "/// Shows a [Club] by `clubId`; one run club per card.",
      "class ClubCard {",
      "  ClubCard(this.club);",
      "  final Club club;",
      "  String get label => 'club ${club.name} $clubId';",
      "  bool get isClub => club.organizerType == OrganizerType.club;",
      "  final runClub = 1;",
      "}",
      "",
    ].join("\n"),
    "lib/contexts/organizers/domain/club.dart": "class Club { final String clubId = ''; String get _clubId => clubId; }\n",
    "lib/platform/schema_contracts/generated/schemas/create_club_request.dart":
      "class CreateClubRequest { final String clubId = ''; final ClubHostDefaults? hostDefaults = null; }\n",
    "lib/contexts/organizers/domain/club_host_defaults.dart": "class ClubHostDefaults {}\n",
    "lib/routing/providers.dart": "final clubsProvider = 1; void createClub() {}\n",
    "widgetbook/assets/fixtures/club_hero_portrait.jpg": "",
    "design/sync/registry.json":
      "{\"symbol\": \"ClubCard\", \"provider\": \"clubsProvider\", \"callable\": \"createClub\", \"file\": \"lib/clubs/club_card.dart\"}\n",
    "test/ui_captures/fixtures/club_fixtures.dart": "final captureClub = Club();\n",
    "tool/copy/fixtures/club_sample.dart": "final captureClub = Club();\n",
    "lib/routing/route_contract.dart": "enum Routes {\n  hostClubsScreen('/host/organizers'),\n  homeScreen('/');\n  const Routes(this.path);\n  final String path;\n}\n",
    "test/ui_captures/catalog/routes.dart": "final ids = ['hostClubsScreen', 'clubId', 'homeScreen'];\n",
    "design/screens/screens.json": "{\"route\": \"hostClubsScreen\", \"param\": \"clubId\"}\n",
    "widgetbook/pubspec.yaml": "name: widgetbook_workspace\n",
    "widgetbook/lib/clubs/club_cases.dart": "final cases = 1;\n",
    "widgetbook/test/cases_test.dart": "import 'package:widgetbook_workspace/clubs/club_cases.dart';\n",
    "design/screens/catch.screens.json": "{\"controller\": \"watchClub\", \"roles\": [\"Club.primaryClubPhotoUrl\"], \"values\": [\"runClub\"]}\n",
    "design/website/components.json": "{\"source\": \"packages/web-ui/src/ClubCard.tsx\", \"exportName\": \"ClubCard\"}\n",
    "design/components/registry_aliases.json": "{\n  \"aliases\": [\"ClubCard\"],\n  \"symbol\": \"ClubCard\"\n}\n",
    "test/organizers/club_card_test.dart": "testWidgets('ClubCard shows the club name', (tester) async {});\n",
    "lib/contexts/organizers/data/club_watch.dart": "Stream<Club> watchClub() => const Stream.empty();\nenum LaunchAccessEventType { runClub }\n",
    "tool/check_names.mjs": "const keys = ['clubsDetailTitle', 'hostsOrganizerTypeClub']; const path = '/lib/clubs/';\n",
    "contracts/callable_responses/create_club_post_response.schema.json": "{\"title\": \"CreateClubPostResponse\"}\n",
    "lib/contexts/organizers/data/club_post_response.dart": "final class CreateClubPostResponse {}\n",
    "tool/contracts/generate_schema_contracts.mjs": "const dartType = \"ClubHostDefaults\";\n",
    ...extra,
  };
  const files = Object.keys(sources);
  return {files, sources, plan: buildPlan({files, read: (file) => sources[file]})};
}

test("planPathMoves renames Dart files and folders, not assets or generated contracts", () => {
  const {moves, collisions} = planPathMoves([
    "lib/clubs/club_card.dart",
    "lib/clubs/club_card.g.dart",
    "lib/platform/schema_contracts/generated/schemas/create_club_request.dart",
    "widgetbook/assets/fixtures/club_hero_portrait.jpg",
    "tool/design/club_names.dart",
  ]);
  assert.deepEqual([...moves], [
    ["lib/clubs/club_card.dart", "lib/organizers/organizer_card.dart"],
    ["lib/clubs/club_card.g.dart", "lib/organizers/organizer_card.g.dart"],
  ]);
  assert.deepEqual(collisions, []);
});

test("renameWord makes a club organizer the organizer", () => {
  assert.equal(renameWord("HostClubOrganizerSectionList"), "HostOrganizerSectionList");
  assert.equal(renameWord("host_club_organizer_section_list"), "host_organizer_section_list");
  assert.equal(renameWord("clubOrganizerIds"), "organizerIds");
  assert.equal(renameWord("clubsClubDetailTitle"), "organizersOrganizerDetailTitle");
});

test("planPathMoves reports a rename onto an existing file", () => {
  const {collisions} = planPathMoves(["lib/clubs/clubs.dart", "lib/organizers/organizers.dart"]);
  assert.deepEqual(collisions, ["lib/clubs/clubs.dart -> lib/organizers/organizers.dart (exists)"]);
});

test("planFolderMoves lists only folders whose every file moves with them", () => {
  const files = ["lib/clubs/a_club.dart", "lib/clubs/b.dart", "lib/hosts/club_x/c.dart", "lib/hosts/club_x/logo.png"];
  const {moves} = planPathMoves(files);
  assert.deepEqual(planFolderMoves(files, moves), [["lib/clubs/", "lib/organizers/"]]);
});

test("buildPlan keeps contract-declared names and the club subtype, and renames app types contracts import", () => {
  const {plan} = fixture();
  assert.equal(plan.mapping.get("Club"), "Organizer");
  assert.equal(plan.mapping.get("ClubHostDefaults"), "OrganizerHostDefaults");
  assert.equal(plan.mapping.get("clubsDetailTitle"), "organizersDetailTitle");
  assert.equal(plan.mapping.has("clubId"), false);
  assert.equal(plan.mapping.has("_clubId"), false);
  assert.equal(plan.mapping.has("CreateClubRequest"), false);
  assert.equal(plan.mapping.has("runClub"), false);
  assert.equal(plan.mapping.has("hostsOrganizerTypeClub"), false);
  assert.deepEqual([...plan.symbolNames.keys()].sort(), [
    "Club", "ClubCard", "ClubHostDefaults", "clubsDetailTitle", "clubsProvider", "hostClubsScreen",
  ]);
});

test("buildPlan renames a Dart type a contract title shares, but not that title in text", () => {
  const {plan, sources} = fixture();
  assert.equal(plan.mapping.get("CreateClubPostResponse"), "CreateOrganizerPostResponse");
  assert.equal(plan.symbolNames.has("CreateClubPostResponse"), false);
  const generator = "tool/contracts/generate_schema_contracts.mjs";
  assert.equal(transformFile({file: generator, source: sources[generator], plan}), sources[generator]);
});

test("renameDartCode renames code and code references, never strings, prose or the subtype", () => {
  const {plan, sources} = fixture();
  assert.equal(renameDartCode(sources["lib/clubs/club_card.dart"], plan.mapping), [
    "import 'package:catch_dating_app/contexts/organizers/domain/club.dart';",
    "",
    "/// Shows an [Organizer] by `clubId`; one run club per card.",
    "class OrganizerCard {",
    "  OrganizerCard(this.organizer);",
    "  final Organizer organizer;",
    "  String get label => 'club ${organizer.name} $clubId';",
    "  bool get isOrganizer => organizer.organizerType == OrganizerType.club;",
    "  final runClub = 1;",
    "}",
    "",
  ].join("\n"));
  assert.equal(
    renameDartCode("enum OrganizerType { club, venue }\nconst x = OrganizerType.club;\n", new Map([["club", "organizer"]])),
    "enum OrganizerType { club, venue }\nconst x = OrganizerType.club;\n",
  );
});

test("transformFile renames app fixtures but not the tools' synthetic fixtures", () => {
  const {plan, sources} = fixture();
  const app = "test/ui_captures/fixtures/club_fixtures.dart";
  const tool = "tool/copy/fixtures/club_sample.dart";
  assert.equal(transformFile({file: app, source: sources[app], plan}), "final captureOrganizer = Organizer();\n");
  assert.equal(transformFile({file: tool, source: sources[tool], plan}), sources[tool]);
  assert.equal(plan.moves.get(app), "test/ui_captures/fixtures/organizer_fixtures.dart");
});

test("route names follow their Routes constants where they are quoted", () => {
  const {plan, sources} = fixture();
  assert.deepEqual([...plan.routeIds], [["hostClubsScreen", "hostOrganizersScreen"]]);
  const catalog = "test/ui_captures/catalog/routes.dart";
  assert.equal(transformFile({file: catalog, source: sources[catalog], plan}),
    "final ids = ['hostOrganizersScreen', 'clubId', 'homeScreen'];\n");
  const screens = "design/screens/screens.json";
  assert.equal(transformFile({file: screens, source: sources[screens], plan}),
    "{\"route\": \"hostOrganizersScreen\", \"param\": \"clubId\"}\n");
});

test("package URIs of other Dart packages follow their moved files", () => {
  const {plan, sources} = fixture();
  assert.equal(plan.packageRoots.get("widgetbook_workspace"), "widgetbook/lib/");
  const file = "widgetbook/test/cases_test.dart";
  assert.equal(transformFile({file, source: sources[file], plan}),
    "import 'package:widgetbook_workspace/organizers/organizer_cases.dart';\n");
});

test("code registries rename Dart members but not stored values, web names or aliases", () => {
  const {plan, sources} = fixture();
  const screens = "design/screens/catch.screens.json";
  assert.equal(transformFile({file: screens, source: sources[screens], plan}),
    "{\"controller\": \"watchOrganizer\", \"roles\": [\"Organizer.primaryClubPhotoUrl\"], \"values\": [\"runClub\"]}\n");
  const web = "design/website/components.json";
  assert.equal(transformFile({file: web, source: sources[web], plan}), sources[web]);
  const aliases = "design/components/registry_aliases.json";
  assert.equal(transformFile({file: aliases, source: sources[aliases], plan}),
    "{\n  \"aliases\": [\"ClubCard\"],\n  \"symbol\": \"OrganizerCard\"\n}\n");
});

test("a test's strings rename the symbols they describe, not their prose", () => {
  const {plan, sources} = fixture();
  const file = "test/organizers/club_card_test.dart";
  assert.equal(transformFile({file, source: sources[file], plan}),
    "testWidgets('OrganizerCard shows the club name', (tester) async {});\n");
});

test("renameArbKeys renames keys and placeholders but not messages or the subtype label", () => {
  assert.equal(
    renameArbKeys('{"clubsJoin": "Join {clubName}", "@clubsJoin": {"placeholders": {"clubName": {}}}, "hostsOrganizerTypeClub": "Club"}'),
    '{"organizersJoin": "Join {organizerName}", "@organizersJoin": {"placeholders": {"organizerName": {}}}, "hostsOrganizerTypeClub": "Club"}',
  );
});

test("transformFile moves directives and paths, and renames only symbol names in registries", () => {
  const {plan, sources} = fixture();
  const card = transformFile({file: "lib/clubs/club_card.dart", source: sources["lib/clubs/club_card.dart"], plan});
  assert.match(card, /^import 'package:catch_dating_app\/contexts\/organizers\/domain\/organizer\.dart';/u);
  assert.equal(
    transformFile({file: "design/sync/registry.json", source: sources["design/sync/registry.json"], plan}),
    "{\"symbol\": \"OrganizerCard\", \"provider\": \"organizersProvider\", \"callable\": \"createClub\", \"file\": \"lib/organizers/organizer_card.dart\"}\n",
  );
  assert.equal(
    transformFile({file: "tool/check_names.mjs", source: sources["tool/check_names.mjs"], plan}),
    "const keys = ['organizersDetailTitle', 'hostsOrganizerTypeClub']; const path = '/lib/organizers/';\n",
  );
});

test("verifyRenameDiff accepts the codemod's output with re-sorted directives and flags anything else", () => {
  const {plan, sources} = fixture({
    "lib/clubs/club_list.dart": "import 'package:b/b.dart';\nimport 'package:a/a.dart';\n\nfinal Club x = Club();\n",
  });
  const expected = (file) => transformFile({file, source: sources[file], plan});
  const output = new Map([
    ["lib/organizers/organizer_list.dart", "import 'package:a/a.dart';\nimport 'package:b/b.dart';\n\nfinal Organizer x = Organizer();\n"],
    ["lib/organizers/organizer_card.dart", expected("lib/clubs/club_card.dart")],
    ["lib/contexts/organizers/domain/organizer.dart", expected("lib/contexts/organizers/domain/club.dart")],
    ["lib/contexts/organizers/domain/organizer_host_defaults.dart", expected("lib/contexts/organizers/domain/club_host_defaults.dart")],
    ["lib/contexts/organizers/data/organizer_post_response.dart", expected("lib/contexts/organizers/data/club_post_response.dart")],
    ["test/ui_captures/fixtures/organizer_fixtures.dart", expected("test/ui_captures/fixtures/club_fixtures.dart")],
    ["widgetbook/lib/organizers/organizer_cases.dart", expected("widgetbook/lib/clubs/club_cases.dart")],
    ["test/organizers/organizer_card_test.dart", expected("test/organizers/club_card_test.dart")],
    ["lib/contexts/organizers/data/organizer_watch.dart", expected("lib/contexts/organizers/data/club_watch.dart")],
  ]);
  const changes = [...plan.moves].flatMap(([from, to]) => [{status: "D", file: from}, {status: "A", file: to}]);
  const read = (side, file) => side === "old" ? sources[file] : output.get(file);
  assert.deepEqual(verifyRenameDiff({changes, plan, read}), []);

  output.set("lib/organizers/organizer_list.dart", "final Organizer x = Organizer(); // edited\n");
  assert.deepEqual(verifyRenameDiff({changes, plan, read}), [
    "lib/organizers/organizer_list.dart differs from the codemod's output",
  ]);
  assert.deepEqual(verifyRenameDiff({changes: changes.slice(2), plan, read}).at(-1),
    `planned move did not happen: ${[...plan.moves][0][0]} -> ${[...plan.moves][0][1]}`);
});

test("withoutRepeatedEntries drops a context map entry the rename made a duplicate", () => {
  assert.equal(withoutRepeatedEntries([
    "  \"legacy\": [",
    "    {\"path\": \"lib/organizers/\", \"context\": \"organizers\"},",
    "    {\"path\": \"lib/organizers/\", \"context\": \"organizers\"},",
    "    {\"path\": \"lib/routing/\", \"layer\": \"app\"}",
  ].join("\n")), [
    "  \"legacy\": [",
    "    {\"path\": \"lib/organizers/\", \"context\": \"organizers\"},",
    "    {\"path\": \"lib/routing/\", \"layer\": \"app\"}",
  ].join("\n"));
});
