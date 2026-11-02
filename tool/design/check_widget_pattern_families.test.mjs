import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import test from "node:test";
import {checkPatternFamilies} from "./check_widget_pattern_families.mjs";

const scriptPath = fileURLToPath(
  new URL("./check_widget_pattern_families.mjs", import.meta.url),
);
const defaultRegistryPath =
  "docs/design_parity/widget_consolidation/pattern_families.json";

function validRegistry() {
  return {
    schemaVersion: 1,
    families: [
      {
        id: "pill-chip-family",
        title: "Pills and chips",
        intent: "One ergonomic contract for compact labels and selections.",
        priority: "P0",
        status: "approved",
        targetContract: "CatchChip",
        qualityReference: "CatchChip",
        decisionSource: "widgetbook-compare:app-pill-chip-family",
        acceptedVisualDelta: [
          "Selected chips use the stronger inverse fill.",
        ],
        reviewQuestions: [],
        members: [
          {
            symbol: "CatchChip",
            disposition: "canonical",
            preview: "required",
            rationale: "Owns the target contract and complete state model.",
          },
          {
            symbol: "LegacyChip",
            disposition: "unify",
            target: "CatchChip.selectable",
            preview: "source-only",
            rationale: "Migrates to the stronger canonical chip contract.",
          },
          {
            symbol: "RepairChip",
            disposition: "repair",
            target: "CatchChip.tag",
            preview: "source-only",
            rationale: "Keeps its semantic identity while adopting the target treatment.",
          },
          {
            symbol: "DecorativeChip",
            disposition: "discard",
            preview: "not-applicable",
            rationale: "Has no durable product contract or runtime consumer.",
          },
        ],
      },
    ],
  };
}

function createFixture(t, {registry = validRegistry(), registryPath = defaultRegistryPath} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-pattern-families-"));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));

  writeFile(
    root,
    registryPath,
    `${JSON.stringify(registry, null, 2)}\n`,
  );
  writeFile(
    root,
    "widgetbook/lib/main.directories.g.dart",
    [
      "final directories = [",
      "  WidgetbookComponent(",
      "    name: 'CatchChip',",
      "    useCases: const [],",
      "  ),",
      "];",
    ].join("\n"),
  );
  writeFile(
    root,
    "lib/design/repair_chip.dart",
    [
      "class LegacyChip extends StatelessWidget {}",
      "class RepairChip extends StatelessWidget {}",
      "",
    ].join("\n"),
  );
  return {root, registryPath};
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function writeFile(root, relativePath, contents) {
  const fullPath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(fullPath), {recursive: true});
  fs.writeFileSync(fullPath, contents);
}

function errorsFor(t, mutate) {
  const registry = clone(validRegistry());
  mutate(registry);
  const {root} = createFixture(t, {registry});
  return checkPatternFamilies({repoRoot: root}).errors;
}

test("accepts a valid family with required, source-only, and explicit not-applicable previews", (t) => {
  const {root} = createFixture(t);

  const result = checkPatternFamilies({repoRoot: root});

  assert.deepEqual(result.errors, []);
  assert.equal(result.familyCount, 1);
  assert.equal(result.memberCount, 4);
});

test("rejects invalid JSON without throwing", (t) => {
  const {root} = createFixture(t);
  writeFile(root, defaultRegistryPath, "{ not-json\n");

  const result = checkPatternFamilies({repoRoot: root});

  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /registry is not valid JSON/u);
});

test("rejects a non-object registry", (t) => {
  const {root} = createFixture(t, {registry: []});

  const result = checkPatternFamilies({repoRoot: root});

  assert.deepEqual(result.errors, ["registry must be a JSON object"]);
});

test("rejects a family with zero members", (t) => {
  const errors = errorsFor(t, (registry) => {
    registry.families[0].members = [];
  });

  assert.ok(errors.includes("families[0].members must be a nonempty array"));
});

test("requires every member to acknowledge its preview state", (t) => {
  const errors = errorsFor(t, (registry) => {
    delete registry.families[0].members[3].preview;
  });

  assert.ok(errors.some((error) => error.startsWith("families[0].members[3].preview")));
});

test("rejects duplicate family ids", (t) => {
  const errors = errorsFor(t, (registry) => {
    registry.families.push(clone(registry.families[0]));
  });

  assert.ok(errors.some((error) => error.includes("duplicates family id 'pill-chip-family'")));
});

test("rejects an invalid disposition", (t) => {
  const errors = errorsFor(t, (registry) => {
    registry.families[0].members[1].disposition = "maybe";
  });

  assert.ok(errors.some((error) => error.includes(".disposition must be one of")));
});

test("requires a target for unify", (t) => {
  const errors = errorsFor(t, (registry) => {
    delete registry.families[0].members[1].target;
  });

  assert.ok(
    errors.includes(
      "families[0].members[1].target is required when disposition is 'unify'",
    ),
  );
});

test("requires qualityReference to name a member", (t) => {
  const errors = errorsFor(t, (registry) => {
    registry.families[0].qualityReference = "UnknownChip";
  });

  assert.ok(
    errors.includes(
      "families[0].qualityReference 'UnknownChip' must name a family member",
    ),
  );
});

test("requires an accepted visual delta for approved families", (t) => {
  const errors = errorsFor(t, (registry) => {
    registry.families[0].acceptedVisualDelta = [];
  });

  assert.ok(
    errors.includes(
      "families[0].acceptedVisualDelta is required when status is 'approved'",
    ),
  );
});

test("requires accepted visual deltas to be nonempty strings", (t) => {
  const errors = errorsFor(t, (registry) => {
    registry.families[0].acceptedVisualDelta = [""];
  });

  assert.ok(
    errors.includes(
      "families[0].acceptedVisualDelta[0] must be a nonempty string",
    ),
  );
});

test("accepts structured owner questions for a review family", (t) => {
  const registry = validRegistry();
  registry.families[0].status = "review";
  registry.families[0].acceptedVisualDelta = [];
  registry.families[0].reviewQuestions = [
    {
      id: "PF1",
      prompt: "Which treatment should become the family default?",
      recommendation: "Use the stronger inverse selected treatment.",
      options: ["Use inverse selection", "Keep the current outline"],
    },
  ];
  const {root} = createFixture(t, {registry});

  assert.deepEqual(checkPatternFamilies({repoRoot: root}).errors, []);
});

test("requires review families to declare owner questions", (t) => {
  const errors = errorsFor(t, (registry) => {
    registry.families[0].status = "review";
    registry.families[0].acceptedVisualDelta = [];
    delete registry.families[0].reviewQuestions;
  });

  assert.ok(
    errors.includes(
      "families[0].reviewQuestions must be a nonempty array when status is 'review'",
    ),
  );
});

test("requires approved families to record a selected option for every retained question", (t) => {
  const errors = errorsFor(t, (registry) => {
    registry.families[0].reviewQuestions = [
      {
        id: "PF1",
        prompt: "Which treatment should become the family default?",
        recommendation: "Use the stronger inverse selected treatment.",
        options: ["Use inverse selection", "Keep the current outline"],
      },
    ];
  });

  assert.ok(
    errors.includes(
      "families[0].reviewQuestions[0].selectedOption is required when status is 'approved'",
    ),
  );
});

test("requires a selected option to match one of the declared choices", (t) => {
  const errors = errorsFor(t, (registry) => {
    registry.families[0].reviewQuestions = [
      {
        id: "PF1",
        prompt: "Which treatment should become the family default?",
        recommendation: "Use the stronger inverse selected treatment.",
        selectedOption: "Invent a third treatment",
        options: ["Use inverse selection", "Keep the current outline"],
      },
    ];
  });

  assert.ok(
    errors.includes(
      "families[0].reviewQuestions[0].selectedOption must match one declared option",
    ),
  );
});

test("rejects duplicate review question ids", (t) => {
  const errors = errorsFor(t, (registry) => {
    registry.families[0].status = "review";
    registry.families[0].acceptedVisualDelta = [];
    registry.families[0].reviewQuestions = [
      {
        id: "PF1",
        prompt: "First question?",
        recommendation: "First answer.",
        options: ["First", "Second"],
      },
      {
        id: "PF1",
        prompt: "Second question?",
        recommendation: "Second answer.",
        options: ["First", "Second"],
      },
    ];
  });

  assert.ok(
    errors.includes("families[0].reviewQuestions[1].id duplicates question 'PF1'"),
  );
});

test("rejects incomplete review questions", (t) => {
  const errors = errorsFor(t, (registry) => {
    registry.families[0].status = "review";
    registry.families[0].acceptedVisualDelta = [];
    registry.families[0].reviewQuestions = [
      {
        id: "PF1",
        prompt: "",
        recommendation: "",
        options: ["Only one"],
      },
    ];
  });

  assert.ok(
    errors.includes(
      "families[0].reviewQuestions[0].options must contain at least two nonempty strings",
    ),
  );
  assert.ok(
    errors.includes("families[0].reviewQuestions[0].prompt must be a nonempty string"),
  );
  assert.ok(
    errors.includes(
      "families[0].reviewQuestions[0].recommendation must be a nonempty string",
    ),
  );
});

test("rejects a required preview missing from generated Widgetbook directories", (t) => {
  const errors = errorsFor(t, (registry) => {
    registry.families[0].members.push({
      symbol: "MissingPreviewChip",
      disposition: "register",
      preview: "required",
      rationale: "Must be visible before this family can be reviewed.",
    });
  });

  assert.ok(
    errors.some(
      (error) =>
        error.includes("'MissingPreviewChip'") &&
        error.includes("widgetbook/lib/main.directories.g.dart"),
    ),
  );
});

test("rejects a source-only symbol with no Dart source evidence", (t) => {
  const errors = errorsFor(t, (registry) => {
    registry.families[0].members.push({
      symbol: "MissingSourceChip",
      disposition: "discard",
      preview: "source-only",
      rationale: "Its source identity must still be auditable before removal.",
    });
  });

  assert.ok(
    errors.some(
      (error) =>
        error.includes("'MissingSourceChip'") &&
        error.includes("no current lib source evidence"),
    ),
  );
});

test("allows target on repair but rejects it on other non-unify dispositions", (t) => {
  const valid = createFixture(t);
  assert.deepEqual(checkPatternFamilies({repoRoot: valid.root}).errors, []);

  const errors = errorsFor(t, (registry) => {
    registry.families[0].members[0].target = "CatchChip";
  });
  assert.ok(
    errors.includes(
      "families[0].members[0].target is only allowed for 'repair' or 'unify'",
    ),
  );
});

test("allows unify and repair targets to name canonical member constructors", (t) => {
  const {root} = createFixture(t);

  const result = checkPatternFamilies({repoRoot: root});

  assert.deepEqual(result.errors, []);
});

test("a source-only symbol declared in an app package has source evidence", (t) => {
  const registry = clone(validRegistry());
  registry.families[0].members.push({
    symbol: "TodayOnlyChip",
    disposition: "discard",
    preview: "source-only",
    rationale: "Its source identity must still be auditable before removal.",
  });
  const {root} = createFixture(t, {registry});
  const missing = checkPatternFamilies({repoRoot: root}).errors;
  assert.ok(missing.some((error) => error.includes("'TodayOnlyChip'")));

  writeFile(root, "apps/host/lib/today/today_chip.dart", "class TodayOnlyChip extends StatelessWidget {}\n");
  assert.deepEqual(
    checkPatternFamilies({repoRoot: root}).errors.filter((error) => error.includes("'TodayOnlyChip'")),
    [],
  );
});

test("CLI supports --check with custom --file and --repo-root", (t) => {
  const registryPath = "fixtures/custom_pattern_families.json";
  const {root} = createFixture(t, {registryPath});

  const result = spawnSync(
    process.execPath,
    [scriptPath, "--check", "--repo-root", root, "--file", registryPath],
    {encoding: "utf8"},
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Widget pattern families OK/u);
  assert.match(result.stdout, /1 families, 4 members/u);
});

test('generated type arguments retain the registered component identity', (t) => {
  const {root} = createFixture(t);
  writeFile(root, 'widgetbook/lib/main.directories.g.dart', `
    final directories = [
      WidgetbookComponent(
        name: 'CatchChip<Map<String, int>, dynamic>',
        useCases: const [],
      ),
    ];
  `);
  assert.deepEqual(checkPatternFamilies({repoRoot: root}).errors, []);
  writeFile(root, 'widgetbook/lib/main.directories.g.dart', `
    final directories = [
      WidgetbookComponent(name: 'AnotherChip<dynamic>', useCases: const []),
      WidgetbookCategory(name: 'CatchChip', children: const []),
    ];
  `);
  assert.ok(checkPatternFamilies({repoRoot: root}).errors.some((error) =>
    error.includes("'CatchChip' is missing")));
});
