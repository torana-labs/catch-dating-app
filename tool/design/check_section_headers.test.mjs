import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  scanSectionHeaders,
  scanSourceForSectionHeaders,
} from "./check_section_headers.mjs";

test("flags a CatchSection title duplicated by a nested component header", () => {
  const source = [
    "class ReviewsPreviewSection extends StatelessWidget {",
    "  const ReviewsPreviewSection({super.key});",
    "  @override",
    "  Widget build(BuildContext context) {",
    "    return Text('Reviews', style: CatchTextStyles.titleL(context));",
    "  }",
    "}",
    "class EventReviewsSection extends StatelessWidget {",
    "  const EventReviewsSection({super.key});",
    "  @override",
    "  Widget build(BuildContext context) {",
    "    return const ReviewsPreviewSection();",
    "  }",
    "}",
    "class EventDetailSocialSection extends StatelessWidget {",
    "  const EventDetailSocialSection({super.key});",
    "  @override",
    "  Widget build(BuildContext context) {",
    "    return CatchSection.divided(",
    "      title: 'Reviews',",
    "      child: EventReviewsSection(),",
    "    );",
    "  }",
    "}",
  ].join("\n");
  const result = scanSectionHeadersFromFixture(source);

  assert.equal(result.counts.high, 1);
  assert.match(result.findings[0].expression, /EventReviewsSection/u);
});

test("honors explicit showHeader false on nested preview components", () => {
  const source = [
    "class ReviewsPreviewSection extends StatelessWidget {",
    "  const ReviewsPreviewSection({super.key, this.showHeader = true});",
    "  final bool showHeader;",
    "  @override",
    "  Widget build(BuildContext context) {",
    "    return Text('Reviews', style: CatchTextStyles.titleL(context));",
    "  }",
    "}",
    "class EventReviewsSection extends StatelessWidget {",
    "  const EventReviewsSection({super.key});",
    "  @override",
    "  Widget build(BuildContext context) {",
    "    return const ReviewsPreviewSection(showHeader: false);",
    "  }",
    "}",
    "class EventDetailSocialSection extends StatelessWidget {",
    "  const EventDetailSocialSection({super.key});",
    "  @override",
    "  Widget build(BuildContext context) {",
    "    return CatchSection.divided(",
    "      title: 'Reviews',",
    "      child: EventReviewsSection(),",
    "    );",
    "  }",
    "}",
  ].join("\n");
  const result = scanSectionHeadersFromFixture(source);

  assert.equal(result.counts.high, 0);
});

test("flags titled feature-local surface sections for review", () => {
  const findings = scanSourceForSectionHeaders({
    relativePath: "lib/events/presentation/widgets/example_section.dart",
    source: [
      "class WhatToExpectSection extends StatelessWidget {",
      "  const WhatToExpectSection({super.key});",
      "  @override",
      "  Widget build(BuildContext context) {",
      "    return CatchSurface(",
      "      child: Text('What to expect', style: CatchTextStyles.sectionTitle(context)),",
      "    );",
      "  }",
      "}",
    ].join("\n"),
  });

  assert.equal(findings.length, 1);
  assert.equal(findings[0].level, "medium");
  assert.match(findings[0].expression, /WhatToExpectSection/u);
});

test("does not flag contained CatchSection card titles", () => {
  const findings = scanSourceForSectionHeaders({
    relativePath: "lib/events/presentation/widgets/example_section.dart",
    source: [
      "class WhatToExpectSection extends StatelessWidget {",
      "  const WhatToExpectSection({super.key});",
      "  @override",
      "  Widget build(BuildContext context) {",
      "    return CatchSection.contained(",
      "      title: 'What to expect',",
      "      child: const SizedBox.shrink(),",
      "    );",
      "  }",
      "}",
    ].join("\n"),
  });

  assert.equal(findings.length, 0);
});

test("flags feature-local card shells with a section header and actions", () => {
  const findings = scanSourceForSectionHeaders({
    relativePath:
      "lib/hosts/presentation/payments/host_payment_account_card.dart",
    source: [
      "class HostPaymentAccountContentCard extends StatelessWidget {",
      "  const HostPaymentAccountContentCard({super.key});",
      "  @override",
      "  Widget build(BuildContext context) {",
      "    return CatchSurface(",
      "      child: Column(children: [",
      "        CatchSectionHeader(title: 'Payouts'),",
      "        const Text('Set up international payouts'),",
      "        CatchButton(label: 'Set up payouts', onPressed: () {}),",
      "      ]),",
      "    );",
      "  }",
      "}",
    ].join("\n"),
  });

  assert.equal(findings.length, 1);
  assert.equal(findings[0].level, "medium");
  assert.equal(findings[0].rule, "SECTION-HEADER-005");
  assert.match(findings[0].expression, /HostPaymentAccountContentCard/u);
});

test("allows feature-local cards to delegate chrome to CatchSection", () => {
  const findings = scanSourceForSectionHeaders({
    relativePath:
      "lib/hosts/presentation/payments/host_payment_account_card.dart",
    source: [
      "class HostPaymentAccountContentCard extends StatelessWidget {",
      "  const HostPaymentAccountContentCard({super.key});",
      "  @override",
      "  Widget build(BuildContext context) {",
      "    return CatchSection.contained(",
      "      title: 'Payouts',",
      "      child: CatchButton(label: 'Set up payouts', onPressed: () {}),",
      "    );",
      "  }",
      "}",
    ].join("\n"),
  });

  assert.equal(findings.length, 0);
});

test("flags standalone section headers followed by untitled CatchSection shells", () => {
  const findings = scanSourceForSectionHeaders({
    relativePath: "lib/hosts/presentation/host_operations/host_club_organizer_section_list.dart",
    source: [
      "Column(children: [",
      "  CatchSectionHeader(",
      "    title: context.l10n.hostsHostOrganizerTitleManage,",
      "    trailing: const Text('Manage'),",
      "  ),",
      "  gapH10,",
      "  CatchSection.contained(",
      "    children: [CatchField.nav(title: 'Payouts')],",
      "  ),",
      "]);",
    ].join("\n"),
  });

  assert.equal(findings.length, 1);
  assert.equal(findings[0].level, "high");
  assert.equal(findings[0].rule, "SECTION-HEADER-004");
  assert.match(findings[0].expression, /CatchSection\.contained without title/u);
});

test("allows CatchSection to own a dynamic title directly", () => {
  const findings = scanSourceForSectionHeaders({
    relativePath: "lib/hosts/presentation/host_operations/host_club_organizer_section_list.dart",
    source: [
      "CatchSection.contained(",
      "  title: context.l10n.hostsHostOrganizerTitleManage,",
      "  children: [CatchField.nav(title: 'Payouts')],",
      ");",
    ].join("\n"),
  });

  assert.equal(findings.length, 0);
});

test("does not join a section header to a section across intervening content", () => {
  const findings = scanSourceForSectionHeaders({
    relativePath: "lib/hosts/presentation/example.dart",
    source: [
      "Column(children: [",
      "  const CatchSectionHeader(title: 'Team'),",
      "  gapH10,",
      "  const TeamCard(),",
      "  CatchSection.contained(children: const []),",
      "]);",
    ].join("\n"),
  });

  assert.equal(findings.length, 0);
});

test("flags thin dynamic kicker shells even inside core widgets", () => {
  const findings = scanSourceForSectionHeaders({
    relativePath: "lib/contexts/events/parts/catch_analytics_kit.dart",
    source: [
      "class CatchAnalyticsSection extends StatelessWidget {",
      "  const CatchAnalyticsSection({required this.label, required this.child});",
      "  final String label;",
      "  final Widget child;",
      "  Widget build(context) => Column(children: [",
      "    CatchKickerText(label: label),",
      "    child,",
      "  ]);",
      "}",
    ].join("\n"),
  });

  assert.equal(findings.length, 1);
  assert.equal(findings[0].level, "high");
  assert.equal(findings[0].rule, "SECTION-HEADER-003");
  assert.match(findings[0].expression, /CatchAnalyticsSection/u);
});

test("scanSectionHeaders covers lib, test, and widgetbook sources", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-section-headers-"));
  writeFile(
    root,
    "lib/events/presentation/widgets/example_section.dart",
    "class LocalSection extends StatelessWidget { Widget build(context) => CatchSurface(child: Text('Local', style: CatchTextStyles.sectionTitle(context))); }",
  );
  writeFile(
    root,
    "test/events/example_section_test.dart",
    "void main() { final widget = Text('Reviews', style: CatchTextStyles.titleL(context)); }",
  );
  writeFile(
    root,
    "widgetbook/lib/events/example_use_cases.dart",
    "Widget useCase() => CatchSection.divided(title: 'Reviews', child: Text('Reviews', style: CatchTextStyles.titleL(context)));",
  );

  const result = scanSectionHeaders({root});

  assert.equal(result.filesScanned, 3);
  assert.equal(result.counts.high, 1);
  assert.equal(result.counts.medium, 1);
});

test("inventories showHeader and showTitle widget flags as low advisory findings", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-section-headers-"));
  writeFile(
    root,
    "lib/events/presentation/widgets/first_section.dart",
    [
      "class FirstSection extends StatelessWidget {",
      "  const FirstSection({super.key, this.showHeader = true});",
      "  final bool showHeader;",
      "  Widget build(context) => const SizedBox.shrink();",
      "}",
    ].join("\n"),
  );
  writeFile(
    root,
    "lib/events/presentation/widgets/second_section.dart",
    [
      "class SecondSection extends StatelessWidget {",
      "  const SecondSection({super.key, this.showTitle = true});",
      "  final bool showTitle;",
      "  Widget build(context) => const SizedBox.shrink();",
      "}",
    ].join("\n"),
  );
  writeFile(
    root,
    "lib/events/presentation/widgets/third_section.dart",
    [
      "class ThirdSection extends StatelessWidget {",
      "  const ThirdSection({super.key, this.showHeader = true});",
      "  final bool showHeader;",
      "  Widget build(context) => const SizedBox.shrink();",
      "}",
    ].join("\n"),
  );

  const result = scanSectionHeaders({root});

  assert.equal(result.headerFlagInventory.count, 3);
  assert.equal(result.counts.low, 3);
  assert.deepEqual(
    result.headerFlagInventory.widgets.map((widget) => widget.className),
    ["FirstSection", "SecondSection", "ThirdSection"],
  );
  assert.equal(result.counts.high, 0);
  assert.equal(result.counts.medium, 0);
});

function scanSectionHeadersFromFixture(source) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-section-headers-"));
  writeFile(root, "lib/events/presentation/widgets/event_detail.dart", source);
  return scanSectionHeaders({root});
}

function writeFile(root, relativePath, source) {
  const file = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, source);
}
