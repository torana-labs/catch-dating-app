import assert from "node:assert/strict";
import test from "node:test";
import {checkAdminActionCatalog} from
  "../scripts/check-admin-action-catalog.mjs";
import {loadAdminActionCatalog} from "../src/admin/action-catalog.mjs";
import {runAction} from "../src/admin-cli/main.mjs";

test("admin action catalog validates every workflow example", async () => {
  const catalog = await loadAdminActionCatalog();
  for (const workflow of catalog.workflows) {
    for (const actionId of workflow.actions) {
      const action = catalog.actionsById.get(actionId);
      assert.ok(action, actionId);
      assert.equal(catalog.validateRequest(actionId, action.example), action.example);
    }
  }
});

test("catalog checker rejects GUI callable and workflow membership drift",
  async () => {
    const current = await loadAdminActionCatalog();
    const catalog = {
      ...current,
      actions: current.actions.map((action, index) => index === 0 ? {
        ...action,
        workflowIds: [],
      } : action),
    };
    const adminApiSource = '(functions, "adminUnknownAction")';
    const result = await checkAdminActionCatalog({
      catalog,
      adminApiSource,
      functionExportNames: ["adminUnknownAction"],
      validatorSource: '"strictRequests": ["adminUnknownAction"]',
    });
    assert.equal(result.ok, false);
    assert.ok(result.findings.some((finding) =>
      finding.id === "gui-callable-catalog-drift"));
    assert.ok(result.findings.some((finding) =>
      finding.id === "workflow-membership-drift"));
  });

test("catalog checker rejects mutations without explicit confirmation",
  async () => {
    const current = await loadAdminActionCatalog();
    const mutation = current.actions.find((action) =>
      action.kind === "mutation");
    const catalog = {
      ...current,
      actions: current.actions.map((action) =>
        action.actionId === mutation.actionId ?
          {...action, confirmation: undefined} : action),
    };
    const callables = current.actions.map((action) => action.callable);
    const result = await checkAdminActionCatalog({
      catalog,
      adminApiSource: callables.map((callable) =>
        `(functions, "${callable}")`).join("\n"),
      functionExportNames: callables,
      validatorSource: `"strictRequests": ${JSON.stringify(callables)}`,
    });
    assert.equal(result.ok, false);
    assert.ok(result.findings.some((finding) =>
      finding.id === "mutation-confirmation-missing" &&
      finding.actionId === mutation.actionId));
  });


test("Owner control-plane GUI actions remain catalogued and strictly validated", async () => {
  const result = await checkAdminActionCatalog();
  assert.deepEqual(result.findings, []);
  const current = await loadAdminActionCatalog();
  const action = current.actions.find((entry) =>
    entry.callable === "adminApplySalesPrivacyBatch");
  assert.equal(action.controlPlane, true);
  const callables = current.actions.map((entry) => entry.callable);
  const missingValidator = await checkAdminActionCatalog({
    adminApiSource: callables.map((name) => `(functions, "${name}")`).join("\n"),
    validatorSource: `"strictRequests": ${JSON.stringify(
      callables.filter((name) => name !== action.callable))}`,
  });
  assert.ok(missingValidator.findings.some((finding) =>
    finding.id === "strict-request-validation-drift" &&
    finding.missing.includes(action.callable)));
});


test("Catch WhatsApp GUI actions keep strict validation and cannot run via CLI",
  async () => {
    const catalog = await loadAdminActionCatalog();
    const review = catalog.actionsById.get("catch.whatsapp.inbound.review");
    const send = catalog.actionsById.get("catch.whatsapp.inbound.send");
    assert.equal(review.kind, "read");
    assert.equal(review.risk, "sensitive-read");
    assert.equal(send.kind, "mutation");
    assert.equal(send.risk, "critical");
    assert.equal(send.confirmation, "action-and-target");
    assert.equal(send.targetField, "inboundEventId");
    let calls = 0;
    assert.deepEqual(review.roles, ["support", "adminOwner"]);
    // Support conversation replies are open to every support role.
    assert.deepEqual(send.roles, ["admin", "adminOwner", "safetyReviewer", "support"]);
    for (const action of [review, send]) {
      assert.equal(action.controlPlane, true);
      assert.deepEqual(action.workflowIds, ["overview"]);
      assert.equal(action.guiPath, "/overview");
      assert.equal(catalog.validateRequest(action.actionId, action.example),
        action.example);
      assert.throws(() => catalog.validateRequest(action.actionId,
        {...action.example, unreviewedField: true}),
      {code: "ADMIN_ACTION_INPUT_INVALID"});
      await assert.rejects(runAction({catalog, actionId: action.actionId,
        flags: {example: true, apply: true, confirm: action.actionId,
          confirmTarget: action.example.inboundEventId},
        repoRoot: process.cwd(),
        dependencies: {client: {invoke: async () => { calls += 1; }}},
      }), {code: "ADMIN_ACTION_CONTROL_PLANE_ONLY"});
    }
    assert.equal(calls, 0);
    assert.throws(() => catalog.validateRequest(send.actionId,
      {...send.example, confirmSupportRequest: false}),
    {code: "ADMIN_ACTION_INPUT_INVALID"});
    const callables = catalog.actions.map((action) => action.callable);
    for (const action of [review, send]) {
      const result = await checkAdminActionCatalog({catalog,
        adminApiSource: callables.map((name) =>
          `(functions, "${name}")`).join("\n"),
        validatorSource: `"strictRequests": ${JSON.stringify(
          callables.filter((name) => name !== action.callable))}`,
      });
      assert.ok(result.findings.some((finding) =>
        finding.id === "strict-request-validation-drift" &&
        finding.missing.includes(action.callable)));
    }
  });


test("partner composition sharing remains Owner-only with exact current preview scope", async () => {
  const catalog = await loadAdminActionCatalog();
  const read = catalog.actionsById.get("sales.demo.GetSalesDemoPartnerReview");
  const share = catalog.actionsById.get("sales.demo.ShareSalesDemoPartnerReview");
  assert.ok(read); assert.ok(share);
  for (const action of [read, share]) {
    assert.deepEqual(action.roles, ["adminOwner"]);
    assert.deepEqual(action.workflowIds, ["sales"]);
    assert.equal(action.guiPath, "/sales/hosts");
    assert.equal(catalog.validateRequest(action.actionId, action.example), action.example);
    assert.throws(() => catalog.validateRequest(action.actionId,
      {...action.example, invitationAuthority: true}), {code: "ADMIN_ACTION_INPUT_INVALID"});
  }
  assert.equal(read.kind, "read"); assert.equal(read.risk, "sensitive-read");
  assert.equal(share.kind, "mutation"); assert.equal(share.risk, "high");
  assert.equal(share.confirmation, "action-and-target"); assert.equal(share.targetField, "blueprintId");
  for (const field of ["expectedPreviewHash", "expectedBlueprintRevision", "expectedSharingRevision",
    "partnerUid", "expectedAssignmentRevision", "expiresAt"]) {
    const changed = {...share.example}; delete changed[field];
    assert.throws(() => catalog.validateRequest(share.actionId, changed), {code: "ADMIN_ACTION_INPUT_INVALID"});
  }
  assert.throws(() => catalog.validateRequest(share.actionId,
    {...share.example, expectedPreviewHash: "unreviewed"}), {code: "ADMIN_ACTION_INPUT_INVALID"});
});

test("partner offers remain exact-target employee UI actions, not CLI capabilities", async () => {
  const catalog = await loadAdminActionCatalog();
  const action = catalog.actionsById.get("sales.partners.offer");
  assert.equal(action.callable, "adminAssignSalesPartner");
  assert.equal(action.controlPlane, true);
  assert.deepEqual(action.roles, ["admin", "adminOwner"]);
  assert.equal(action.confirmation, "action-and-target");
  assert.equal(action.targetField, "organizerId");
  assert.equal(catalog.validateRequest(action.actionId, action.example), action.example);
  assert.throws(() => catalog.validateRequest(action.actionId,
    {...action.example, grantsSendPermission: true}), {code: "ADMIN_ACTION_INPUT_INVALID"});
  let calls = 0;
  await assert.rejects(runAction({catalog, actionId: action.actionId,
    flags: {example: true, apply: true, confirm: action.actionId,
      confirmTarget: action.example.organizerId}, repoRoot: process.cwd(),
    dependencies: {client: {invoke: async () => { calls += 1; }}},
  }), {code: "ADMIN_ACTION_CONTROL_PLANE_ONLY"});
  assert.equal(calls, 0);
});
