import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import Ajv2020 from "ajv/dist/2020.js";

import {
  compileFeatureContract,
  FeatureContractError,
  parseWidgetbookPreviewIds,
} from "./build_feature_contracts.mjs";

const actionOwnerPath = "lib/events/presentation/event_detail_screen_state.dart";
const widgetbookPath = "widgetbook/lib/events/example.dart";
const flutterTestPath = "test/events/event_detail_widgets_test.dart";
const webOwnerPath = "website/src/features/organizers/useExampleController.ts";
const webStoryPath = "website/src/stories/Example.stories.tsx";
const webTestPath = "website/src/features/organizers/useExampleController.test.tsx";
const adminOwnerPath = "admin/src/features/example/useAdminExampleController.ts";
const adminStoryPath = "admin/src/stories/AdminRoutesPeople.stories.tsx";
const adminTestPath = "admin/src/features/example/useAdminExampleController.test.tsx";
const adminRuntimeRegistryPath =
  "admin/src/generated/validators/adminCallableValidators.ts";
const featureSchema = JSON.parse(fs.readFileSync(
  new URL("../../design/features/feature_contract.schema.json", import.meta.url),
  "utf8",
));
const validateFeatureSchema = new Ajv2020({allErrors: true, strict: false})
  .compile(featureSchema);

function fixture() {
  return {
    source: {
      $schema: "./feature_contract.schema.json",
      version: 2,
      updated: "2026-07-23",
      id: "feature.example",
      name: "Example",
      owner: "events",
      status: "pilot",
      description: "Fixture contract.",
      surfaces: [flutterSurface()],
    },
    authorityRegistries: {
      flutter_screens: {
        screens: [
          {
            id: "screen.example",
            owner: "events",
            routes: [],
            captures: [
              {id: "example_loading"},
              {id: "example_ready"},
            ],
            states: [
              {
                id: "loading",
                kind: "loading",
                status: "captured",
                captureIds: ["example_loading"],
                previewIds: ["ExampleScreen/Screen states"],
                tests: [flutterTestPath],
              },
              {
                id: "ready",
                kind: "populated",
                status: "captured",
                captureIds: ["example_ready"],
                previewIds: ["ExampleScreen/Screen states"],
                tests: [flutterTestPath],
              },
            ],
          },
          {id: "screen.target", owner: "events", routes: [], states: []},
        ],
      },
      marketing_routes: {
        routes: [
          {
            id: "organizer_search",
            kind: "static",
            path: "/organizers/",
            review: {
              states: ["default", "filtered"],
              stateCoverage: {storybook: ["default"], manual: ["filtered"]},
            },
          },
        ],
      },
      admin_routes: {components: [adminRouteComponent()]},
    },
    componentRegistries: {
      flutter: {
        components: [{id: "catch.example", dart: {symbol: "ExampleWidget"}}],
      },
      react_marketing: {
        components: [
          {
            id: "route_example",
            kind: "route",
            routeIds: ["organizer_search"],
            source: "website/src/features/organizers/ExamplePage.tsx",
            exportName: "ExamplePage",
            storybook: {
              story: webStoryPath,
              exportName: "ExampleRoute",
              states: ["default"],
            },
          },
          {
            id: "section_example",
            kind: "section",
            routeIds: ["organizer_search"],
            source: "website/src/features/organizers/ExampleSection.tsx",
            exportName: "ExampleSection",
            storybook: {
              story: webStoryPath,
              exportName: "ExampleFiltered",
              states: ["filtered"],
            },
          },
        ],
      },
      react_admin: {components: [adminRouteComponent()]},
    },
    pathExists: () => true,
    readPath: (filePath) => {
      if (filePath === actionOwnerPath) return "enum ExampleAction { book }";
      if (filePath === widgetbookPath) return widgetbookSource();
      if (filePath === webOwnerPath) {
        return "export function useExampleController() { function updateFilters() {} }";
      }
      if (filePath === adminOwnerPath) {
        return "export function useAdminExampleController() { function refresh() {} }";
      }
      if (filePath === adminRuntimeRegistryPath) {
        return `const model = {
          "names": ["adminExample"],
          "strictRequests": ["adminExample"],
          "strictResponses": []
        } as const;`;
      }
      return "";
    },
  };
}

function adminRouteComponent() {
  return {
    id: "route_admin_example",
    kind: "route",
    owner: "features/example",
    source: "admin/src/features/example/AdminExampleScreen.tsx",
    exportName: "AdminExampleScreen",
    preview: {
      status: "ready",
      story: adminStoryPath,
      exportName: "AdminExampleRouteStory",
      states: ["ready"],
    },
  };
}

function flutterSurface() {
  return {
    id: "consumer_flutter",
    runtime: "flutter",
    authority: {registry: "flutter_screens", id: "screen.example"},
    actionScope: {
      included: "Fixture actions.",
      excluded: ["Actions outside this fixture."],
    },
    bindings: {
      previewSources: [widgetbookPath],
      actionOwners: [
        {
          id: "primary",
          language: "dart",
          file: actionOwnerPath,
          symbol: "ExampleAction",
        },
      ],
      componentContracts: ["catch.example"],
      dataContracts: ["contracts/firestore/events.schema.json"],
    },
    dimensions: {
      load: {default: "ready", values: ["ready", "loading"]},
    },
    actions: [
      {
        id: "book",
        owner: "primary",
        codeValue: "book",
        cardinality: "singleton",
        scopeKeys: ["viewerUid", "eventId"],
        outcomes: [{kind: "surface_state", stateIds: ["ready"]}],
        description: "Book once.",
      },
    ],
    scenarios: [
      {
        id: "loading",
        stateId: "loading",
        dimensions: {load: "loading"},
        actionCases: [{id: "default"}],
      },
      {
        id: "ready",
        stateId: "ready",
        dimensions: {},
        actionCases: [{id: "eligible", enabledActions: ["book"]}],
      },
    ],
    requiredEvidence: {captures: true, previews: true, tests: true},
  };
}

function marketingSurface() {
  return {
    id: "marketing_web",
    runtime: "react_marketing",
    authority: {registry: "marketing_routes", id: "organizer_search"},
    actionScope: {
      included: "URL-owned filtering.",
      excluded: ["Organizer detail actions."],
    },
    bindings: {
      previewSources: [webStoryPath],
      actionOwners: [
        {
          id: "controller",
          language: "typescript",
          file: webOwnerPath,
          symbol: "useExampleController",
        },
      ],
      componentContracts: ["route_example", "section_example"],
      dataContracts: ["contracts/public/website_host_listing_projection.schema.json"],
      testEvidence: {
        default: [webTestPath],
        filtered: [webTestPath],
      },
    },
    dimensions: {
      filters: {default: "default", values: ["default", "active"]},
    },
    actions: [
      {
        id: "update_filters",
        owner: "controller",
        codeValue: "updateFilters",
        cardinality: "unbounded",
        scopeKeys: ["routeInstanceId", "searchParamsVersion"],
        outcomes: [{kind: "surface_state", stateIds: ["default", "filtered"]}],
        description: "Update URL filters.",
      },
    ],
    scenarios: [
      {
        id: "default",
        stateId: "default",
        dimensions: {},
        actionCases: [{id: "default", enabledActions: ["update_filters"]}],
      },
      {
        id: "filtered",
        stateId: "filtered",
        dimensions: {filters: "active"},
        actionCases: [{id: "active", enabledActions: ["update_filters"]}],
      },
    ],
    requiredEvidence: {captures: false, previews: true, tests: true},
  };
}

function adminSurface() {
  return {
    id: "admin_web",
    runtime: "react_admin",
    authority: {registry: "admin_routes", id: "route_admin_example"},
    actionScope: {
      included: "Refreshing the registered admin workspace.",
      excluded: ["Local input edits remain form data."],
    },
    bindings: {
      previewSources: [adminStoryPath],
      actionOwners: [
        {
          id: "controller",
          language: "typescript",
          file: adminOwnerPath,
          symbol: "useAdminExampleController",
        },
      ],
      componentContracts: ["route_admin_example"],
      dataContracts: [],
      runtimeContracts: [
        {
          kind: "admin_callable",
          registry: adminRuntimeRegistryPath,
          callable: "adminExample",
          requestValidation: "strict_schema",
          responseValidation: "structural_object",
        },
      ],
      testEvidence: {ready: [adminTestPath]},
    },
    dimensions: {
      source: {default: "ready", values: ["ready", "refreshing"]},
    },
    actions: [
      {
        id: "refresh",
        owner: "controller",
        codeValue: "refresh",
        cardinality: "singleton",
        scopeKeys: ["adminSessionId", "workspaceVersion"],
        outcomes: [{kind: "surface_state", stateIds: ["ready"]}],
        description: "Refreshes the registered admin source.",
      },
    ],
    scenarios: [
      {
        id: "ready",
        stateId: "ready",
        dimensions: {},
        actionCases: [{id: "ready", enabledActions: ["refresh"]}],
      },
    ],
    requiredEvidence: {captures: false, previews: true, tests: true},
  };
}

function compile(overrides = {}) {
  return compileFeatureContract({
    ...fixture(),
    sourcePath: "design/features/example.feature.json",
    ...overrides,
  });
}

test("compiles exact surface-state coverage and action availability", () => {
  const artifact = compile();

  assert.deepEqual(artifact.coverage, {
    surfaces: 1,
    states: 2,
    scenarios: 2,
    actionCases: 2,
    actions: 1,
    captures: 2,
    previews: 1,
    testFiles: 1,
    evidenceExceptions: 0,
  });
  assert.deepEqual(
    artifact.surfaces[0].scenarios[0].actionCases[0].actions.notAllowed,
    ["book"],
  );
  assert.match(artifact.sourceDigest, /^sha256:[a-f0-9]{64}$/u);
});

test("recognizes top-level Dart functions as action owners", () => {
  const data = fixture();
  const originalReadPath = data.readPath;
  data.source.surfaces[0].bindings.actionOwners[0].symbol =
    "openNotificationRoute";
  data.readPath = (filePath) => filePath === actionOwnerPath
    ? "void openNotificationRoute() { book(); }"
    : originalReadPath(filePath);

  assert.doesNotThrow(() => compileFeatureContract({
    ...data,
    sourcePath: "fixture.json",
  }));
});

test("projects known implementation gaps and rejects enabling them", () => {
  const data = fixture();
  const action = data.source.surfaces[0].actions[0];
  action.implementationStatus = "known_gap";
  action.debtId = "FEATURE-ACTION-WIRING-001";
  action.implementationNotes = "The controller method exists but the route callback is not wired.";
  data.source.surfaces[0].scenarios[1].actionCases[0] = {
    id: "eligible",
    disabledActions: ["book"],
  };

  assert.equal(validateFeatureSchema(data.source), true);
  const artifact = compileFeatureContract({...data, sourcePath: "fixture.json"});
  assert.equal(artifact.surfaces[0].actions[0].implementationStatus, "known_gap");
  assert.deepEqual(
    artifact.surfaces[0].scenarios[1].actionCases[0].actions.disabled,
    ["book"],
  );

  data.source.surfaces[0].scenarios[1].actionCases[0] = {
    id: "eligible",
    enabledActions: ["book"],
  };
  assert.throws(
    () => compileFeatureContract({...data, sourcePath: "fixture.json"}),
    /known-gap actions cannot be enabled: book/u,
  );
});

test("requires debt metadata only for known implementation gaps", () => {
  const source = fixture().source;
  source.surfaces[0].actions[0].implementationStatus = "known_gap";
  assert.equal(validateFeatureSchema(source), false);

  source.surfaces[0].actions[0].debtId = "FEATURE-ACTION-WIRING-001";
  source.surfaces[0].actions[0].implementationNotes = "Missing callback wiring.";
  assert.equal(validateFeatureSchema(source), true);

  source.surfaces[0].actions[0].implementationStatus = "implemented";
  assert.equal(validateFeatureSchema(source), false);
});

test("compiles compact state matrices without weakening exact authority coverage", () => {
  const input = fixture();
  const surface = input.source.surfaces[0];
  delete surface.scenarios;
  surface.stateIds = ["loading", "ready"];
  surface.scenarioDefaults = {
    dimensions: {},
    actionCases: [{id: "default"}],
  };
  surface.scenarioOverrides = {
    loading: {dimensions: {load: "loading"}},
    ready: {actionCases: [{id: "eligible", enabledActions: ["book"]}]},
  };

  assert.equal(validateFeatureSchema(input.source), true, JSON.stringify(
    validateFeatureSchema.errors,
  ));
  const artifact = compileFeatureContract(input);
  assert.deepEqual(
    artifact.surfaces[0].scenarios.map((scenario) => scenario.stateId),
    ["loading", "ready"],
  );
  assert.deepEqual(
    artifact.surfaces[0].scenarios[1].actionCases[0].actions.enabled,
    ["book"],
  );

  surface.stateIds = ["loading"];
  assert.throws(
    () => compileFeatureContract(input),
    (error) => error instanceof FeatureContractError &&
      error.message.includes("missing authority states: ready"),
  );
});

test("rejects compact state overrides outside the declared inventory", () => {
  const input = fixture();
  const surface = input.source.surfaces[0];
  delete surface.scenarios;
  surface.stateIds = ["loading", "ready"];
  surface.scenarioDefaults = {
    dimensions: {},
    actionCases: [{id: "default"}],
  };
  surface.scenarioOverrides = {
    missing: {dimensions: {load: "loading"}},
    ready: {actionCases: [{id: "eligible", enabledActions: ["book"]}]},
  };

  assert.throws(
    () => compileFeatureContract(input),
    (error) => error instanceof FeatureContractError &&
      error.message.includes("missing is not declared in stateIds"),
  );
});

test("compiles multiple runtime projections into one shared feature identity", () => {
  const data = fixture();
  data.source.surfaces.push(marketingSurface());

  const artifact = compileFeatureContract({
    ...data,
    sourcePath: "design/features/example.feature.json",
  });

  assert.equal(artifact.coverage.surfaces, 2);
  assert.equal(artifact.coverage.states, 4);
  assert.deepEqual(
    artifact.surfaces[1].resolved.previews,
    ["route_example/ExampleRoute", "section_example/ExampleFiltered"],
  );
  assert.equal(artifact.surfaces[1].runtime, "react_marketing");
});

test("compiles admin preview registries and exact callable-validation strength", () => {
  const data = fixture();
  data.source.surfaces = [adminSurface()];

  assert.equal(validateFeatureSchema(data.source), true, JSON.stringify(
    validateFeatureSchema.errors,
  ));
  const artifact = compileFeatureContract({
    ...data,
    sourcePath: "design/features/example.feature.json",
  });

  assert.deepEqual(
    artifact.surfaces[0].resolved.previews,
    ["route_admin_example/AdminExampleRouteStory"],
  );
  assert.equal(
    artifact.surfaces[0].bindings.runtimeContracts[0].responseValidation,
    "structural_object",
  );
});

test("rejects stale or overstated admin callable-validation strength", () => {
  const data = fixture();
  const surface = adminSurface();
  surface.bindings.runtimeContracts[0].requestValidation = "structural_object";
  surface.bindings.runtimeContracts[0].responseValidation = "strict_schema";
  data.source.surfaces = [surface];

  assert.throws(
    () => compileFeatureContract({...data, sourcePath: "fixture.json"}),
    (error) => {
      assert.ok(error instanceof FeatureContractError);
      assert.match(error.message, /requestValidation: expected strict_schema/u);
      assert.match(error.message, /responseValidation: expected structural_object/u);
      return true;
    },
  );
});

test("maps route review states to explicitly registered React previews", () => {
  const data = fixture();
  const surface = marketingSurface();
  surface.bindings.previewEvidence = {
    filtered: ["route_example/ExampleRoute"],
  };
  data.source.surfaces = [surface];

  assert.equal(validateFeatureSchema(data.source), true, JSON.stringify(
    validateFeatureSchema.errors,
  ));
  const artifact = compileFeatureContract({
    ...data,
    sourcePath: "design/features/example.feature.json",
  });

  assert.deepEqual(
    artifact.surfaces[0].scenarios[1].evidence.previewIds,
    ["route_example/ExampleRoute", "section_example/ExampleFiltered"],
  );
});

test("rejects explicit React previews outside the selected route registry", () => {
  const data = fixture();
  const surface = marketingSurface();
  surface.bindings.previewEvidence = {
    filtered: ["missing_component/MissingStory"],
  };
  data.source.surfaces = [surface];

  assert.throws(
    () => compileFeatureContract({
      ...data,
      sourcePath: "design/features/example.feature.json",
    }),
    /missing_component\/MissingStory is not a selected preview/u,
  );
});

test("supports read-only projections without synthetic actions or bindings", () => {
  const data = fixture();
  const surface = data.source.surfaces[0];
  surface.actionScope = {
    included: "Read-only state projection.",
    excluded: [],
  };
  surface.bindings.actionOwners = [];
  surface.bindings.dataContracts = [];
  surface.dimensions = {};
  surface.actions = [];
  surface.scenarios = surface.scenarios.map((scenario) => ({
    ...scenario,
    dimensions: {},
    actionCases: [{id: "default"}],
  }));

  assert.equal(
    validateFeatureSchema(data.source),
    true,
    JSON.stringify(validateFeatureSchema.errors),
  );

  const artifact = compileFeatureContract({...data, sourcePath: "fixture.json"});
  assert.equal(artifact.coverage.actions, 0);
  assert.deepEqual(
    artifact.surfaces[0].scenarios[0].actionCases[0].actions,
    {enabled: [], disabled: [], notAllowed: []},
  );
});

test("rejects duplicate and missing surface-state mappings", () => {
  const data = fixture();
  data.source.surfaces[0].scenarios[1].stateId = "loading";

  assert.throws(
    () => compileFeatureContract({...data, sourcePath: "fixture.json"}),
    (error) => {
      assert.ok(error instanceof FeatureContractError);
      assert.match(error.message, /mapped by more than one scenario/u);
      assert.match(error.message, /unmapped authority states: ready/u);
      return true;
    },
  );
});

test("rejects missing capture, preview, and test evidence", () => {
  const data = fixture();
  const state = data.authorityRegistries.flutter_screens.screens[0].states[0];
  state.captureIds = [];
  state.previewIds = [];
  state.tests = [];

  assert.throws(
    () => compileFeatureContract({...data, sourcePath: "fixture.json"}),
    (error) => {
      assert.ok(error instanceof FeatureContractError);
      assert.match(error.message, /capture evidence is required/u);
      assert.match(error.message, /preview evidence is required/u);
      assert.match(error.message, /test evidence is required/u);
      return true;
    },
  );
});

test("allows explicit evidence debt and rejects stale exceptions", () => {
  const data = fixture();
  data.authorityRegistries.flutter_screens.screens[0].states[0].tests = [];
  data.source.surfaces[0].evidenceExceptions = [
    {
      stateIds: ["loading"],
      evidence: ["tests"],
      debtId: "DEBT-EXAMPLE-001",
      reason: "The route-state test is not implemented yet.",
    },
  ];

  let artifact = compileFeatureContract({...data, sourcePath: "fixture.json"});
  assert.equal(artifact.coverage.evidenceExceptions, 1);

  data.authorityRegistries.flutter_screens.screens[0].states[0].tests = [flutterTestPath];
  assert.throws(
    () => compileFeatureContract({...data, sourcePath: "fixture.json"}),
    /unused exception for loading tests/u,
  );
});

test("validates surface-state, route, and side-effect action outcomes", () => {
  const data = fixture();
  data.source.surfaces[0].actions[0].outcomes = [
    {kind: "surface_state", stateIds: ["ready", "loading"]},
    {kind: "route", authority: {registry: "flutter_screens", id: "screen.target"}},
    {kind: "side_effect", id: "example.persisted"},
  ];

  const artifact = compileFeatureContract({...data, sourcePath: "fixture.json"});
  assert.deepEqual(
    artifact.surfaces[0].actions[0].outcomes,
    data.source.surfaces[0].actions[0].outcomes,
  );

  data.source.surfaces[0].actions[0].outcomes[1].authority.id = "screen.missing";
  assert.throws(
    () => compileFeatureContract({...data, sourcePath: "fixture.json"}),
    /unknown outcome route flutter_screens:screen\.missing/u,
  );
});

test("rejects unknown action owners, actions, and dimensions", () => {
  const data = fixture();
  const surface = data.source.surfaces[0];
  surface.actions[0].owner = "missing_owner";
  surface.scenarios[1].dimensions = {viewer: "member"};
  surface.scenarios[1].actionCases[0].enabledActions = ["reserve"];

  assert.throws(
    () => compileFeatureContract({...data, sourcePath: "fixture.json"}),
    (error) => {
      assert.ok(error instanceof FeatureContractError);
      assert.match(error.message, /unknown action owner missing_owner/u);
      assert.match(error.message, /unknown dimension viewer/u);
      assert.match(error.message, /unknown action reserve/u);
      return true;
    },
  );
});

test("rejects runtime and authority mismatches", () => {
  const data = fixture();
  data.source.surfaces[0].runtime = "react_marketing";

  assert.throws(
    () => compileFeatureContract({...data, sourcePath: "fixture.json"}),
    /flutter_screens requires runtime flutter/u,
  );
});

test("parses Widgetbook preview ids from annotated use cases", () => {
  assert.deepEqual(
    [...parseWidgetbookPreviewIds(widgetbookSource())],
    ["ExampleScreen/Screen states", "example"],
  );
});

function widgetbookSource() {
  return `
@widgetbook.UseCase(
  name: 'Screen states',
  type: ExampleScreen,
  path: '[Example]/Screens',
)
Widget example(BuildContext context) => const SizedBox();
`;
}
