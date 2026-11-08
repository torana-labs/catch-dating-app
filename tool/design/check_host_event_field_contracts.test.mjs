import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  scanHostEventFieldContracts,
  scanHostEventFieldSource,
} from "./check_host_event_field_contracts.mjs";

test("flags activity choice fields without itemAccentBuilder", () => {
  const findings = scanHostEventFieldSource({
    relativePath:
      "lib/hosts/presentation/event_management/widgets/event_guest_details_section.dart",
    source: [
      "CatchField<ActivityKind>.choices(",
      "  values: ActivityKind.values,",
      "  itemLabelBuilder: (value) => value.label,",
      ")",
    ].join("\n"),
  });

  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, "HOST-EVENT-FIELD-001");
});

test("allows activity choice fields with itemAccentBuilder", () => {
  const findings = scanHostEventFieldSource({
    relativePath:
      "lib/hosts/presentation/event_management/widgets/event_guest_details_section.dart",
    source: [
      "CatchField<PaceLevel>.choices(",
      "  values: PaceLevel.values,",
      "  itemAccentBuilder: (_) => activity.accent,",
      ")",
    ].join("\n"),
  });

  assert.equal(findings.length, 0);
});

test("flags initially open event create fields", () => {
  const findings = scanHostEventFieldSource({
    relativePath:
      "lib/hosts/presentation/event_management/widgets/event_guest_details_section.dart",
    source: "CatchField<String>.choices(disclosureMode: CatchFieldMode.localExpanded)",
  });

  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, "HOST-EVENT-FIELD-002");
});

test("typed disclosure modes distinguish an expanded seed from interaction-owned state", () => {
  const scan = (source) => scanHostEventFieldSource({
    relativePath: "lib/hosts/presentation/event_management/widgets/event_guest_details_section.dart",
    source,
  });
  assert.equal(scan("CatchField.choices(disclosureMode: CatchFieldMode.controlledExpanded)").length, 1);
  assert.equal(scan("CatchField.choices(disclosureMode: CatchFieldMode.localCollapsed)").length, 0);
  assert.equal(scan("CatchField.choices(disclosureMode: accordion.isExpanded(id) ? CatchFieldMode.controlledExpanded : CatchFieldMode.controlledCollapsed)").length, 0);
});

test("commented accent builders cannot satisfy activity color ownership", () => {
  const findings = scanHostEventFieldSource({
    relativePath: "lib/hosts/presentation/event_management/widgets/event_guest_details_section.dart",
    source: "CatchField<ActivityKind>.choices(// itemAccentBuilder: (_) => accent,\n values: ActivityKind.values)",
  });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, "HOST-EVENT-FIELD-001");
});

test("flags event accordions seeded with an expanded field", () => {
  const findings = scanHostEventFieldSource({
    relativePath: "lib/hosts/presentation/edit_hosted_event_screen.dart",
    source: "final accordion = CatchAccordionController(initialExpanded: 'pace');",
  });

  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, "HOST-EVENT-FIELD-002");
});

test("repository scan covers all Host Dart sources", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-host-fields-"));
  const sourcePath = path.join(
    root,
    "lib/hosts/presentation/event_management/widgets/event_guest_details_section.dart",
  );
  fs.mkdirSync(path.dirname(sourcePath), {recursive: true});
  fs.writeFileSync(
    sourcePath,
    "CatchField<ActivityKind>.choices(itemAccentBuilder: (_) => accent)",
  );

  const result = scanHostEventFieldContracts({root});

  assert.equal(result.filesScanned, 1);
  assert.equal(result.findings.length, 0);
});
