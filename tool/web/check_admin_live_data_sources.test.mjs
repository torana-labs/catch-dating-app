import assert from "node:assert/strict";
import test from "node:test";

import {
  validateAdminLiveDataSources,
  verifyAdminCallableReachability,
  verifyWhileBackendDeploys,
} from
  "./check_admin_live_data_sources.mjs";

const base = {
  contract: {
    schemaVersion: 1,
    routes: [{
      routeId: "overview",
      navId: "overview",
      paths: ["/overview"],
      liveReads: ["adminGetOverview"],
    }, {
      routeId: "event-intake",
      navId: "organizer-intake",
      paths: ["/intake/events"],
      liveReads: ["adminGetOverview"],
    }, {
      routeId: "organizer-intake",
      navId: "organizer-intake",
      paths: ["/intake/organizers"],
      liveReads: ["adminGetOverview"],
    }, {
      routeId: "intake-operations",
      navId: "organizer-intake",
      paths: ["/intake/operations"],
      liveReads: ["adminGetOverview"],
    }],
  },
  appSource: `
    const navigation: AdminNavGroup[] = [
      {id: "group", label: "Group", items: [
        {id: "overview", label: "Overview", icon: Activity},
      ]},
    ];
    const navRoles = {};
  `,
  apiSource: `httpsCallable(functions, "adminGetOverview")`,
  functionsIndexSource: `export {adminGetOverview} from "./admin/overview";`,
  featureFiles: [],
};

test("accepts callable-backed routes without retained operational snapshots",
  () => {
    assert.deepEqual(validateAdminLiveDataSources(base), []);
  }
);

test("rejects retained operational snapshots even without feature imports",
  () => {
    const violations = validateAdminLiveDataSources({
      ...base,
      retainedOperationalSnapshots: [
        "admin/src/generated/marketingOpsBridge.json",
      ],
    });
    assert.ok(violations.some((violation) =>
      violation.includes("operational snapshots must be stored in Firestore")));
  }
);

test("rejects a production feature that imports generated operational JSON", () => {
  const violations = validateAdminLiveDataSources({
    ...base,
    featureFiles: [{
      path: "admin/src/features/intake/controller.ts",
      source: `import bridge from "../generated/intake.json";`,
    }],
  });
  assert.ok(violations.some((violation) =>
    violation.includes("production feature imports generated operational JSON")));
});

test("rejects navigation without a live callable contract", () => {
  const violations = validateAdminLiveDataSources({
    ...base,
    appSource: `
      const navigation: AdminNavGroup[] = [
        {id: "group", label: "Group", items: [
          {id: "overview", label: "Overview", icon: Activity},
          {id: "finance", label: "Finance", icon: Dollar},
        ]},
      ];
      const navRoles = {};
    `,
  });
  assert.ok(violations.includes(
    "admin navigation: finance has no live data contract"
  ));
});

test("live verification reports every missing deployed callable", async () => {
  const result = await verifyAdminCallableReachability({
    contract: {
      routes: [{
        liveReads: ["adminGetOverview", "adminListIntakeOperations"],
        liveMutations: ["adminListActionExecutions"],
      }],
    },
    projectId: "catch-prod",
    probe: async ({callable}) => {
      if (callable === "adminGetOverview") {
        return {httpStatus: 401, callableStatus: "UNAUTHENTICATED"};
      }
      throw new Error(`${callable} is not deployed`);
    },
  });
  assert.deepEqual(result.reachable.map((entry) => entry.callable), [
    "adminGetOverview",
  ]);
  assert.deepEqual(result.failures.map((entry) => entry.callable), [
    "adminListActionExecutions",
    "adminListIntakeOperations",
  ]);
});

test("keeps checking while Deploy backend runs, and stops when it is live", async () => {
  const results = [{failures: [{callable: "a"}]}, {failures: [{callable: "a"}]}, {failures: []}];
  let waits = 0;
  const live = await verifyWhileBackendDeploys({
    verify: async () => results.shift(),
    backendDeployRunning: () => true,
    wait: async () => {
      waits += 1;
    },
  });
  assert.deepEqual(live.failures, []);
  assert.equal(waits, 2);
});

test("a missing callable fails at once with no backend deploy running", async () => {
  let verifications = 0;
  const live = await verifyWhileBackendDeploys({
    verify: async () => {
      verifications += 1;
      return {failures: [{callable: "a"}]};
    },
    backendDeployRunning: () => false,
    wait: async () => assert.fail("must not wait"),
  });
  assert.equal(live.failures.length, 1);
  assert.equal(verifications, 1);
});
