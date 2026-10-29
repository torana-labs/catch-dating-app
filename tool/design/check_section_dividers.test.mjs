import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  scanSectionDividers,
  scanSourceForSectionDividers,
} from "./check_section_dividers.mjs";

test("flags caller-owned internalDividerColor on divided sections", () => {
  const findings = scanSourceForSectionDividers({
    relativePath: "lib/safety/presentation/settings_screen.dart",
    source: [
      "Widget build(BuildContext context) {",
      "  final t = CatchTokens.of(context);",
      "  return CatchSection.divided(",
      "    title: 'Account',",
      "    dividerIndent: CatchFieldRow.textLaneInset,",
      "    internalDividerColor: t.line.withValues(alpha: CatchOpacity.fieldRowDivider),",
      "    children: const [],",
      "  );",
      "}",
    ].join("\n"),
  });

  assert.equal(findings.length, 1);
  assert.equal(findings[0].level, "high");
  assert.match(findings[0].reason, /internalDividerColor/u);
});

test("flags raw dividers using old row divider opacities", () => {
  const findings = scanSourceForSectionDividers({
    relativePath: "lib/dashboard/presentation/widgets/activity_section.dart",
    source: [
      "Widget build(BuildContext context) {",
      "  final t = CatchTokens.of(context);",
      "  return Divider(",
      "    height: 1,",
      "    color: t.line.withValues(alpha: CatchOpacity.subtleBorder),",
      "  );",
      "}",
    ].join("\n"),
  });

  assert.equal(findings.length, 1);
  assert.equal(findings[0].level, "high");
  assert.match(findings[0].reason, /CatchDivider/u);
});

test("keeps raw Divider inventory visible in presentation files", () => {
  const findings = scanSourceForSectionDividers({
    relativePath: "lib/example/presentation/example_screen.dart",
    source: "Widget build(BuildContext context) => Divider(height: 1, color: t.line);",
  });

  assert.equal(findings.length, 1);
  assert.equal(findings[0].level, "medium");
});

test("classifies loading skeleton dividers as low visual geometry", () => {
  const findings = scanSourceForSectionDividers({
    relativePath:
      "lib/events/presentation/widgets/event_detail_loading_skeleton.dart",
    source:
      "Widget build(BuildContext context) => VerticalDivider(color: t.line, width: 1);",
  });

  assert.equal(findings.length, 1);
  assert.equal(findings[0].level, "low");
  assert.match(findings[0].reason, /loading skeleton/u);
});

test("retired ticket owner and shared ticket files do not exempt raw dividers", () => {
  for (const relativePath of [
    "lib/contexts/events/parts/event_ticket_surface.dart",
    "packages/catch_ui/lib/src/components/catch_ticket_divider.dart",
    "packages/catch_ui/lib/src/components/ticket_neighbor.dart",
  ]) {
    const findings = scanSourceForSectionDividers({
      relativePath,
      source: "Widget build(BuildContext context) => Divider();",
    });
    assert.equal(findings.length, 1, relativePath);
    assert.equal(findings[0].level, "medium", relativePath);
  }
});

test("classifies dark hero divider token as low editorial chrome", () => {
  const findings = scanSourceForSectionDividers({
    relativePath: "lib/hosts/presentation/host_operations_screen.dart",
    source: [
      "Widget build(BuildContext context) {",
      "  return Divider(",
      "    height: CatchStroke.hairline,",
      "    color: CatchTokens.editorialLight.withValues(",
      "      alpha: CatchOpacity.darkHeroDivider,",
      "    ),",
      "  );",
      "}",
    ].join("\n"),
  });

  assert.equal(findings.length, 1);
  assert.equal(findings[0].level, "low");
  assert.match(findings[0].reason, /dark editorial hero/u);
});

test("flags thin feature wrappers around CatchSection field rows", () => {
  const findings = scanSourceForSectionDividers({
    relativePath: "lib/user_profile/presentation/widgets/profile_info_section.dart",
    source: [
      "class ProfileInfoSection extends StatelessWidget {",
      "  const ProfileInfoSection({super.key, required this.title, required this.children});",
      "  final String title;",
      "  final List<Widget> children;",
      "  @override",
      "  Widget build(BuildContext context) {",
      "    return CatchSection.fieldRows(",
      "      title: title,",
      "      children: children,",
      "    );",
      "  }",
      "}",
    ].join("\n"),
  });

  assert.equal(findings.length, 1);
  assert.equal(findings[0].level, "high");
  assert.equal(findings[0].rule, "SECTION-WRAPPER-001");
});

test("flags feature row groups that manually assign sibling field dividers", () => {
  const findings = scanSourceForSectionDividers({
    relativePath: "lib/hosts/presentation/host_operations/host_club_team_screen.dart",
    source: [
      "class HostTeamClubRows extends StatelessWidget {",
      "  const HostTeamClubRows({required this.clubs});",
      "  final List<Club> clubs;",
      "  @override",
      "  Widget build(BuildContext context) => Column(children: [",
      "    for (final club in clubs)",
      "      CatchField.nav(",
      "        title: 'Owner',",
      "        divider: club != clubs.first,",
      "      ),",
      "  ]);",
      "}",
    ].join("\n"),
  });

  assert.equal(findings.length, 1);
  assert.equal(findings[0].level, "high");
  assert.equal(findings[0].rule, "SECTION-DIVIDER-002");
  assert.match(findings[0].reason, /CatchSection\.fieldRows/u);
});

test("allows CatchSection field rows to own sibling dividers", () => {
  const findings = scanSourceForSectionDividers({
    relativePath: "lib/hosts/presentation/host_operations/host_club_team_screen.dart",
    source: [
      "CatchSection.fieldRows(",
      "  title: 'Clubs you host',",
      "  children: [",
      "    for (final club in clubs)",
      "      CatchField.nav(title: 'Owner'),",
      "  ],",
      ")",
    ].join("\n"),
  });

  assert.equal(findings.length, 0);
});

test("flags custom CatchField leading content without a declared extent", () => {
  const findings = scanSourceForSectionDividers({
    relativePath: "lib/hosts/events/presentation/widgets/host_events_list.dart",
    source: [
      "CatchField.nav(",
      "  title: 'Saturday Evening Run',",
      "  leading: HostEventLifecycleDateBlock(day: '23'),",
      ")",
    ].join("\n"),
  });

  assert.equal(findings.length, 1);
  assert.equal(findings[0].level, "high");
  assert.equal(findings[0].rule, "FIELD-LEADING-001");
});

test("allows custom CatchField leading content with a declared extent", () => {
  const findings = scanSourceForSectionDividers({
    relativePath: "lib/hosts/events/presentation/widgets/host_events_list.dart",
    source: [
      "CatchField.nav(",
      "  title: 'Saturday Evening Run',",
      "  leading: HostEventLifecycleDateBlock(day: '23'),",
      "  leadingExtent: 48,",
      ")",
    ].join("\n"),
  });

  assert.equal(findings.length, 0);
});

test("scanSectionDividers covers lib, test, and widgetbook sources", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-section-dividers-"));
  writeFile(
    root,
    "lib/dashboard/presentation/widgets/activity_section.dart",
    "Widget build(BuildContext context) => Divider(height: 1, color: t.line);",
  );
  writeFile(
    root,
    "test/core/catch_primitives_test.dart",
    "void main() { final divider = Divider(height: 1, color: t.line); }",
  );
  writeFile(
    root,
    "widgetbook/lib/primitives/contracts/section.dart",
    "Widget useCase() => Divider(height: 1, color: t.line);",
  );

  const result = scanSectionDividers({root});

  assert.equal(result.filesScanned, 3);
  assert.equal(result.counts.medium, 3);
});

function writeFile(root, relativePath, source) {
  const file = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, source);
}
