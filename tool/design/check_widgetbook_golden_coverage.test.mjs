import assert from "node:assert/strict";
import test from "node:test";

import {validateGoldenCoverage} from "./check_widgetbook_golden_coverage.mjs";

function fixture() {
  const component = {
    file: "widgetbook/lib/primitives/example.dart",
    builder: "example",
    type: "CatchExample",
    name: "Catalog states",
    typeFile: "lib/contexts/events/parts/catch_example.dart",
    productionReferences: [
      {
        file: "lib/contexts/events/parts/catch_example.dart",
        symbol: "CatchExample",
      },
    ],
  };
  return {
    inventory: {
      coreSurface: [
        {
          name: "CatchExample",
          file: "lib/contexts/events/parts/catch_example.dart",
          line: 1,
        },
        {
          name: "CatchExampleData",
          file: "lib/contexts/events/parts/catch_example.dart",
          line: 20,
        },
        {
          name: "CatchIndirect",
          file: "lib/contexts/events/parts/catch_indirect.dart",
          line: 1,
        },
      ],
      cases: [
        component,
        {
          ...component,
          builder: "indirect",
          type: "CatchHost",
          typeFile: "lib/contexts/events/parts/catch_host.dart",
          productionReferences: [
            {
              file: "lib/contexts/events/parts/catch_indirect.dart",
              symbol: "CatchIndirect",
            },
          ],
        },
      ],
      generated: [
        {...component, path: "Core/CatchExample"},
        {
          ...component,
          builder: "indirect",
          type: "CatchHost",
          path: "Core/CatchHost",
        },
      ],
    },
    waivers: [],
  };
}

function validate(data, options = {}) {
  return validateGoldenCoverage({
    ...data,
    today: "2026-09-04",
    ...options,
  });
}

test("covers the literal core surface by source owner and exact references", () => {
  const result = validate(fixture());
  assert.deepEqual(result.failures, []);
  assert.equal(result.surfaceCount, 3);
  assert.equal(result.coveredCount, 3);
  assert.equal(result.designatedCaseCount, 2);
  assert.ok(result.rows.every((row) => row.goldenIds.length > 0));
});

test("fails when a public core class loses every registered golden id", () => {
  const data = fixture();
  data.inventory.generated.pop();
  const result = validate(data);
  assert.match(result.failures.join("\n"), /CatchIndirect.*missing registered/u);
});

test("accepts only a current, owned and specific waiver", () => {
  const data = fixture();
  data.inventory.generated.pop();
  data.waivers.push({
    class: "CatchIndirect",
    file: "lib/contexts/events/parts/catch_indirect.dart",
    owner: "ui_system_program",
    expires: "2026-10-04",
    reason: "Nonvisual protocol has no independent golden rendering surface.",
  });
  const result = validate(data);
  assert.deepEqual(result.failures, []);
  assert.equal(result.waiverCount, 1);
});

test("rejects expired, ownerless, vague and stale waivers", () => {
  const data = fixture();
  data.waivers.push(
    {
      class: "CatchExample",
      file: "lib/contexts/events/parts/catch_example.dart",
      owner: "",
      expires: "2026-09-03",
      reason: "later",
    },
    {
      class: "CatchGone",
      file: "lib/contexts/events/parts/catch_gone.dart",
      owner: "ui_system_program",
      expires: "2026-10-04",
      reason: "Removed class must not leave a stale policy waiver behind.",
    },
  );
  const failures = validate(data).failures.join("\n");
  assert.match(failures, /requires an owner/u);
  assert.match(failures, /requires a specific reason/u);
  assert.match(failures, /waiver expired/u);
  assert.match(failures, /stale golden waiver/u);
});

test("rejects waiver counts above the Phase 1 ceiling", () => {
  const data = fixture();
  data.inventory.coreSurface = Array.from({length: 21}, (_, index) => ({
    name: `CatchWaived${index}`,
    file: `lib/contexts/events/parts/catch_waived_${index}.dart`,
    line: 1,
  }));
  data.waivers = data.inventory.coreSurface.map((row) => ({
    class: row.name,
    file: row.file,
    owner: "ui_system_program",
    expires: "2026-10-04",
    reason: "Fixture class has no independent golden rendering surface.",
  }));
  const result = validate(data);
  assert.match(result.failures.join("\n"), /exceeds limit 20/u);
});

test("keeps generated public Catch classes in the denominator", () => {
  const data = fixture();
  data.inventory.coreSurface.push({
    name: "CatchGeneratedProvider",
    file: "lib/contexts/events/parts/catch_generated.g.dart",
    line: 1,
    generated: true,
  });
  const result = validate(data);
  assert.match(
    result.failures.join("\n"),
    /CatchGeneratedProvider.*missing registered/u,
  );
});


for (const layer of ["primitives", "components", "patterns"]) {
  test(`preserves coverage when ${layer} move across the package boundary`, () => {
    const moved = JSON.parse(JSON.stringify(fixture()).replaceAll(
      "lib/contexts/events/parts/", `packages/catch_ui/lib/src/${layer}/`,
    ));
    const result = validate(moved);
    assert.deepEqual(result.failures, []);
    assert.equal(result.surfaceCount, 3);
    assert.equal(result.coveredCount, 3);
    assert.equal(result.designatedCaseCount, 2);
    moved.inventory.generated.pop();
    assert.match(validate(moved).failures.join("\n"), /CatchIndirect.*missing registered/u);
  });
}

// Moving a Riverpod adapter must preserve both coverage and its failure signal.
test("preserves adapter coverage at the app Riverpod boundary", () => {
  const moved = JSON.parse(JSON.stringify(fixture()).replaceAll(
    "lib/contexts/events/parts/", "lib/platform/riverpod_ui/",
  ));
  const result = validate(moved);
  assert.deepEqual(result.failures, []);
  assert.equal(result.surfaceCount, 3);
  assert.equal(result.coveredCount, 3);
  assert.equal(result.designatedCaseCount, 2);
  moved.inventory.generated.pop();
  assert.match(validate(moved).failures.join("\n"), /CatchIndirect.*missing registered/u);
});
