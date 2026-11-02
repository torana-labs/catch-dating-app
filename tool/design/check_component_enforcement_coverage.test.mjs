import assert from "node:assert/strict";
import test from "node:test";

import {
  checkComponentEnforcementCoverage,
  extractCheckerCodes,
  extractPluginCodes,
  extractWidgetbookNames,
} from "./check_component_enforcement_coverage.mjs";

test("extracts plugin and checker diagnostic declarations only", () => {
  assert.deepEqual(
    [...extractPluginCodes("LintCode('catch_a', 'x'); // catch_noise")],
    ["catch_a"],
  );
  assert.deepEqual(
    [...extractCheckerCodes("const code = 'catch_b'; // catch_noise")],
    ["catch_b"],
  );
  assert.deepEqual(
    [...extractWidgetbookNames("WidgetbookComponent(name: 'CatchOne')")],
    ["CatchOne"],
  );
});

test("requires decisions, executable verification, live waivers, ownership, and probes", () => {
  const registry = {
    components: [
      {
        id: "catch.one",
        enforcement: {
          code: "catch_a",
          vehicle: "plugin",
          replaces: ["RawOne"],
          replacement: "CatchOne",
          steeringCode: "catch_a",
          probeSeed: "RawOne()",
        },
      },
      {
        id: "catch.two",
        dart: {symbol: "CatchTwo"},
        verification: {
          vehicle: "widgetbook-contract",
          reason: "Canonical states are exercised in Widgetbook.",
        },
      },
      {
        id: "catch.three",
        waiver: {
          reason: "Pending executable coverage.",
          owner: "design_system",
          expires: "2026-01-01",
        },
      },
      {id: "catch.four"},
    ],
  };
  const result = checkComponentEnforcementCoverage({
    registry,
    pluginCodes: new Set(["catch_a", "catch_orphan"]),
    checkerCodes: new Set(),
    harnessSource: "",
    generatedProbeMinimums: {catch_a: 1},
    widgetbookNames: new Set(["CatchTwo"]),
    today: "2026-07-19",
  });

  assert.ok(result.failures.some((failure) => failure.includes("waiver expired")));
  assert.ok(result.failures.some((failure) => failure.includes("exactly one")));
  assert.ok(result.failures.some((failure) => failure.includes("catch_orphan")));
  assert.equal(result.metrics.expiredWaivers, 1);
  assert.equal(result.metrics.verificationCount, 1);
});

test("rejects verification without its generated Widgetbook contract", () => {
  const result = checkComponentEnforcementCoverage({
    registry: {
      components: [
        {
          id: "catch.two",
          dart: {symbol: "CatchTwo"},
          verification: {
            vehicle: "widgetbook-contract",
            reason: "Canonical states are exercised in Widgetbook.",
          },
        },
      ],
    },
    pluginCodes: new Set(),
    checkerCodes: new Set(),
    harnessSource: "",
    generatedProbeMinimums: {},
    widgetbookNames: new Set(),
    today: "2026-09-03",
  });

  assert.deepEqual(result.failures, [
    "catch.two: verification requires generated Widgetbook contract CatchTwo",
  ]);
});

test("primary enforcement code must match its declared vehicle", () => {
  const registry = {
    components: [
      {
        id: "catch.mixed-valid",
        enforcement: {
          code: "catch_plugin_primary",
          codes: ["catch_checker_supplement"],
          vehicle: "plugin",
        },
      },
      {
        id: "catch.mismatched",
        enforcement: {
          code: "catch_plugin_mismatch",
          vehicle: "checker",
        },
      },
    ],
  };
  const result = checkComponentEnforcementCoverage({
    registry,
    pluginCodes: new Set([
      "catch_plugin_primary",
      "catch_plugin_mismatch",
    ]),
    checkerCodes: new Set(["catch_checker_supplement"]),
    harnessSource: "'catch_plugin_primary' 'catch_plugin_mismatch'",
    generatedProbeMinimums: {},
    today: "2026-09-02",
  });

  assert.deepEqual(result.failures, [
    "catch.mismatched: primary code catch_plugin_mismatch is not implemented by declared checker vehicle",
  ]);
});

test("a planned record with no Dart symbol defers its Widgetbook contract, and only that", () => {
  const verification = {vehicle: "widgetbook-contract", reason: "Planned: it arrives with the first code."};
  const result = checkComponentEnforcementCoverage({
    registry: {
      components: [
        {id: "catch.planned", status: "planned", verification},
        {id: "catch.active_no_symbol", status: "active", verification},
        {id: "catch.planned_with_code", status: "planned", dart: {symbol: "CatchPlanned"}, verification},
        {id: "catch.planned_undecided", status: "planned"},
      ],
    },
    pluginCodes: new Set(),
    checkerCodes: new Set(),
    harnessSource: "",
    generatedProbeMinimums: {},
    widgetbookNames: new Set(),
    today: "2026-11-02",
  });
  assert.deepEqual(result.failures, [
    "catch.active_no_symbol: verification requires generated Widgetbook contract <missing Dart symbol>",
    "catch.planned_with_code: verification requires generated Widgetbook contract CatchPlanned",
    "catch.planned_undecided: exactly one of enforcement, verification, or waiver is required",
  ]);
});
