import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildFormContractInventory,
  scanCatchFieldCalls,
  unreferencedFieldBindings,
} from "./generate_flutter_form_contract_inventory.mjs";

test("known-bad missing binding is detected", () => {
  const results = scanCatchFieldCalls({
    source: `
      CatchField.input(
        title: 'Name',
        controller: controller,
      );
    `,
  });

  assert.equal(results.length, 1);
  assert.equal(results[0].contract, null);
});

test("form choice recipe cannot hide a missing contract binding", () => {
  const results = scanCatchFieldCalls({source:     "CatchChoiceInput<String>.form(values: values, onChanged: onChanged);"});
  assert.equal(results.length, 1);
  assert.equal(results[0].symbol, "choiceInputForm");
  assert.equal(results[0].contract, null);
});

test("described input and individual choice tiles retain schema binding checks", () => {
  const results = scanCatchFieldCalls({source: `
    CatchChoiceInput<String>.described(values: values, contract: choicesContract);
    CatchChoiceTile(title: 'Bound', contract: tileContract);
    CatchChoiceInput<String>.described(values: values);
    CatchChoiceTile(title: 'Missing binding');
  `});
  assert.deepEqual(results.map(({symbol, contract}) => [symbol, contract]), [
    ["choiceInputDescribed", "choicesContract"], ["choiceTile", "tileContract"],
    ["choiceInputDescribed", null], ["choiceTile", null],
  ]);
});

test("records top-level generated bindings without accepting nested arguments", () => {
  const results = scanCatchFieldCalls({
    source: `
      CatchField.control(
        title: 'Range',
        contract: CatchContractConstraints.userProfileDocumentAgeRange,
        child: Builder(
          builder: (_) => CatchField.input(
            title: 'Nested',
            contract: nestedContract,
          ),
        ),
      );
    `,
  });

  assert.deepEqual(
    results.map((entry) => entry.contract),
    ["CatchContractConstraints.userProfileDocumentAgeRange"],
  );
});

test("range sliders require both generated endpoint bindings", () => {
  const results = scanCatchFieldCalls({
    source: `
      CatchRangeInput(
        minimumContract: minimumContract,
        values: values,
        onChanged: onChanged,
      );
    `,
  });

  assert.equal(results.length, 1);
  assert.equal(results[0].minimumContract, "minimumContract");
  assert.equal(results[0].maximumContract, null);
});

test("inventory includes bound and unbound product callsites", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-form-contracts-"));
  write(
    root,
    "lib/feature/form.dart",
    `
      final bound = CatchField.toggle(
        title: 'Enabled',
        contract: enabledContract,
        value: true,
        onChanged: null,
      );
      final unbound = CatchField.input(title: 'Name');
      final chips = CatchChoiceInput<String>.form(
        label: 'Kinds',
        contract: kindsContract,
      );
      final option = CatchChoiceInput<String>.segmented(
        contract: optionContract,
        options: options,
        selected: selected,
      );
      final search = CatchSearchField(
        contract: searchContract,
        value: query,
      );
      final topBarSearch = CatchTopBarSearch(
        contract: queryContract,
        placeholder: 'Search',
        tooltip: 'Search',
      );
      final otp = CatchCodeInput(
        contract: otpContract,
        controller: controller,
        onChanged: onChanged,
        onSubmitted: onSubmitted,
      );
      final range = CatchRangeInput(
        minimumContract: minContract,
        maximumContract: maxContract,
        values: values,
        onChanged: onChanged,
      );
      final missingRange = CatchRangeInput(
        minimumContract: minContract,
        values: values,
        onChanged: onChanged,
      );
    `,
  );
  write(
    root,
    "packages/catch_ui/lib/src/components/catch_field.dart",
    "final ignored = CatchField.input(title: 'Definition');",
  );

  const inventory = buildFormContractInventory({repoRoot: root});

  assert.equal(inventory.summary.editableCallsites, 9);
  assert.equal(inventory.summary.bySymbol.choiceInputForm, 1);
  assert.equal(inventory.summary.boundCallsites, 7);
  assert.equal(inventory.summary.unboundCallsites, 2);
});

function write(root, relative, source) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, source);
}

test("segmented choices cannot escape the missing-contract inventory", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-segmented-contracts-"));
  try {
    write(root, "lib/feature/choices.dart", `
      CatchChoiceInput<String>.segmented(options: options, selected: selected,
        contract: choiceContract, contractValueBuilder: (value) => value);
      CatchChoiceInput<String>.segmented(options: options, selected: selected);
    `);
    const result = buildFormContractInventory({repoRoot: root});
    assert.equal(result.summary.bySymbol.choiceInputSegmented, 2);
    assert.equal(result.summary.boundCallsites, 1);
    assert.equal(result.summary.unboundCallsites, 1);
    assert.equal(result.callsites[0].contractValue, "(value) => value");
    assert.equal(result.callsites[1].contractValue, null);
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test("declared field bindings must stay referenced by Dart source", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-field-bindings-"));
  try {
    write(root, "contracts/forms/field_constraint_bindings.json", JSON.stringify({
      lookupPrefixes: ["formProfile.profile."],
      fields: {eventDocument: ["title", "capacity"], formProfile: ["profile.city"]},
    }));
    write(root, "lib/platform/schema_contracts/generated/field_constraints.g.dart", `
      static const eventDocumentTitle = CatchContractFieldConstraints(
        path: 'eventDocument.title',
      );
      static const eventDocumentCapacity = CatchContractFieldConstraints(
        path: 'eventDocument.capacity',
      );
      static const formProfileProfileCity = CatchContractFieldConstraints(
        path: 'formProfile.profile.city',
      );
    `);
    write(root, "lib/feature/title.dart",
      "final contract = CatchContractConstraints\n    .eventDocumentTitle;");
    assert.deepEqual(unreferencedFieldBindings({repoRoot: root}), [
      "eventDocument.capacity",
      "formProfile.profile.city",
    ]);
    write(root, "widgetbook/lib/capacity.dart",
      "CatchContractConstraints.eventDocumentCapacity;");
    assert.deepEqual(unreferencedFieldBindings({repoRoot: root}),
      ["formProfile.profile.city"]);
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});
