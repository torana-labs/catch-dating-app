import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  applicationRouteOwnershipFindings,
  audienceWorkspacePresentationFindings,
  customerMessagingHandoffFindings,
  hostCrmCountCopyFindings,
  manualSendContractFindings,
  scanBackendFile,
  scanHostCrmBoundaries,
  scanPresentationFile,
} from "./check_host_crm_boundaries.mjs";

const protectedFormConversion = `
async function convertResponseInTransaction({db, data, actorUid}) {
  return db.runTransaction(async (transaction) => {
    await authorizeFormMutation({db, tx: transaction, actorUid});
    const source = await conversionContext(db, data, transaction);
    const provenanceRef = db.collection("organizerContactOrigins").doc(
      organizerContactOriginId({sourceKind: "hostForm",
        sourceEntityKind: "hostFormResponse", sourceEntityId: data.responseId}));
    const priorOrigin = await transaction.get(provenanceRef);
    if (priorOrigin.exists) {
      return recoverPriorCompletion(priorOrigin);
    } else {
      assertConversionAllowed(source);
      const target = crmContactConversionTarget({
        existingResultId: await findExistingContact(
          db, source.response, source.fields, transaction),
        responseId: data.responseId,
      });
      const result = await createOrganizerContactInTransaction({
        transaction, contactId: target.contactId, origin: target.origin,
      });
      return result.contactId;
    }
  });
}
`;

function scanConversionFixture(t, source) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "form-provenance-"));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const relativePath = "functions/src/organizers/organizerFormConversions.ts";
  const file = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, source);
  return scanHostCrmBoundaries({root}).findings.filter((item) =>
    item.path === relativePath);
}

test("form provenance accepts protected new and matched contact writes", (t) => {
  const withReplay = protectedFormConversion.replace("return db.runTransaction",
    'const receiptId = formConversionReceiptId(data.responseId, data.kind);\n' +
    'const receiptRef = db.collection("organizerFormConversionReceipts").doc(receiptId);\n' +
    "return db.runTransaction").replace("const source =",
    'const receiptSnap = await transaction.get(receiptRef);\n' +
    'const receipt = receiptSnap.exists ? requireDoc(receiptSnap, "Receipt") : null;\n' +
    'if (receipt?.status === "completed") return conversionProjection(receiptId, receipt);\n' +
    "const source =");
  for (const source of [protectedFormConversion,
    withReplay,
    protectedFormConversion.replace("transaction, contactId:",
      '"transaction": transaction, "contactId":').replace("origin: target.origin",
      '"origin": target.origin'),
    protectedFormConversion.replaceAll("transaction", "work")
      .replace("work, contactId", "transaction: work, contactId")
      .replaceAll("target", "destination")
      .replaceAll("priorOrigin", "receipt")
      .replaceAll("provenanceRef", "originDocument"),
    protectedFormConversion.replace(
      "const target = crmContactConversionTarget({",
      "const matched = await findExistingContact(db, source.response, source.fields, transaction);\n" +
      "const target = crmContactConversionTarget({"
    ).replace("existingResultId: await findExistingContact(\n" +
      "          db, source.response, source.fields, transaction)",
    "existingResultId: matched"),
  ]) {
    assert.deepEqual(scanConversionFixture(t, source), []);
  }
});

for (const [name, mutate] of [
  ["omitted origin", (s) => s.replace("origin: target.origin,", "")],
  ["wrong origin", (s) => s.replace("origin: target.origin", "origin: unrelated")],
  ["wrong destination", (s) => s.replace("contactId: target.contactId", "contactId: unrelated")],
  ["matched-contact early return", (s) => s.replace("const result = await",
    "if (target.contactId) return target.contactId;\nconst result = await")],
  ["matched-contact return before origin read", (s) => s.replace(
    "const provenanceRef =", "if (source.existingResultId) return source.existingResultId;\nconst provenanceRef =")],
  ["matched-contact return before transaction", (s) => s.replace(
    "return db.runTransaction", "if (data.existingResultId) return data.existingResultId;\nreturn db.runTransaction")],
  ["matched contact skips the entire origin branch", (s) => s.replace(
    "const provenanceRef =", "if (!source.existingResultId) { const provenanceRef =")
    .replace("  });", "    }\n  });")],
  ["writer skipped for a matched contact", (s) => s.replace("const result = await",
    "if (!target.contactId) { const result = await").replace(
    "return result.contactId;", "return result.contactId; } return target.contactId;")],
  ["writer detached from transaction", (s) => s.replace("transaction, contactId",
    "transaction: unrelated, contactId")],
  ["writer outside transaction", (s) => {
    const writer = "const result = await createOrganizerContactInTransaction({\n" +
      "        transaction, contactId: target.contactId, origin: target.origin,\n      });";
    return s.replace(writer, "").replace("return db.runTransaction", writer + "\nreturn db.runTransaction");
  }],
  ["unproved completed-contact replay", (s) => s.replace("const provenanceRef =",
    "const matched = await findExistingContact(db, source.response, source.fields, transaction);\n" +
    'if (matched?.status === "completed") return matched;\nconst provenanceRef =')],
  ["missing canonical provenance helper", (s) => s.replace(
    "crmContactConversionTarget({", "unreviewedContactTarget({")],
  ["unawaited writer", (s) => s.replace("await createOrganizerContactInTransaction",
    "createOrganizerContactInTransaction")],
  ["origin read outside transaction", (s) => s.replace(
    "const priorOrigin = await transaction.get(provenanceRef);", "").replace(
    "return db.runTransaction", "const priorOrigin = await provenanceRef.get();\nreturn db.runTransaction")],
  ["source check outside transaction", (s) => s.replace("assertConversionAllowed(source);", "")
    .replace("return db.runTransaction", "assertConversionAllowed(source);\nreturn db.runTransaction")],
  ["source read outside transaction", (s) => s.replace(
    "const source = await conversionContext(db, data, transaction);", "").replace(
    "return db.runTransaction", "const source = await conversionContext(db, data);\nreturn db.runTransaction")],
  ["actor check outside transaction", (s) => s.replace(
    "await authorizeFormMutation({db, tx: transaction, actorUid});", "").replace(
    "return db.runTransaction", "await authorizeFormMutation({db, actorUid});\nreturn db.runTransaction")],
  ["match lookup outside transaction", (s) => s.replace(
    "db, source.response, source.fields, transaction", "db, source.response, source.fields")],
  ["origin branch based on a contact instead", (s) => s.replace(
    'collection("organizerContactOrigins")', 'collection("organizerContacts")')],
  ["dead transaction instead of returned result", (s) => s.replace(
    "return db.runTransaction", "const unused = db.runTransaction")],
]) {
  test(`form provenance rejects ${name}`, (t) => {
    assert.notDeepEqual(scanConversionFixture(t, mutate(protectedFormConversion)), []);
  });
}

test("flags generic or context-free Customers messaging handoffs", () => {
  const findings = customerMessagingHandoffFindings({
    customersPath: "customers.dart",
    customersSource: [
      "onOpenMessaging: () {},",
      "context.goNamed(",
      "  Routes.hostInboxScreen.name,",
      "  queryParameters: {'workspace': HostMessagingWorkspace.campaigns.name},",
      ");",
    ].join("\n"),
  });

  assert.ok(findings.some((item) => /generic Messaging handoff/u.test(item.reason)));
  assert.ok(findings.some((item) => /saved-audience id/u.test(item.reason)));
});

test("accepts audience-bound compose and dedicated sender recovery", () => {
  const findings = customerMessagingHandoffFindings({
    customersPath: "customers.dart",
    customersSource: [
      "onReviewSenderSetup: review,",
      "context.goNamed(",
      "  Routes.hostInboxScreen.name,",
      "  queryParameters: {",
      "    'workspace': HostMessagingWorkspace.campaigns.name,",
      "    'compose': '1',",
      "    'audienceId': audience.audienceId,",
      "  },",
      ");",
      "context.pushNamed(Routes.hostOrganizerMessagingScreen.name);",
    ].join("\n"),
  });

  assert.deepEqual(findings, []);
});

test("flags modal, contained, or duplicate saved-audience presentation", () => {
  const findings = audienceWorkspacePresentationFindings({
    audienceViewPath: "audience_view.dart",
    audienceViewSource: [
      "enum HostAudienceView { people, audiences }",
      "class HostAudienceTabRail {}",
    ].join("\n"),
    customersPath: "customers.dart",
    customersSource: [
      "CatchRootScreenScaffold.withPrimaryRail(",
      "HostSavedAudiencesWorkspace(",
      "primaryAction: peopleView",
      "HostSavedAudiencesSheet()",
    ].join("\n"),
    workspacePath: "workspace.dart",
    workspaceSource: [
      "CatchSection.contained(",
      "ValueKey('host-saved-audience-create')",
      "ValueKey('host-saved-audience-create')",
    ].join("\n"),
    editorSheetsPath: "sheets.dart",
    editorSheetsSource: "class HostSavedAudiencesSheet {}",
    routeContractPath: "routes.dart",
    routeContractSource: "",
  });
  assert.ok(findings.some((item) => /overflow or a modal/u.test(item.reason)));
  assert.ok(findings.some((item) => /typed row section/u.test(item.reason)));
  assert.ok(findings.some((item) => /exactly one/u.test(item.reason)));
  assert.ok(findings.some((item) => /parallel modal/u.test(item.reason)));
  assert.ok(findings.some((item) => /all five peer workspaces/u.test(item.reason)));
  assert.equal(
    findings.filter((item) => /full-page Audience routes/u.test(item.reason))
      .length,
    2,
  );
});

test("saved-audience directories require the canonical typed row APIs", () => {
  const scanWorkspace = (workspaceSource) => audienceWorkspacePresentationFindings({
    audienceViewPath: "audience_view.dart",
    audienceViewSource: [
      "enum HostAudienceView { people, audiences, forms, responses, requests }",
      "class HostAudienceTabRail {}",
      "ValueKey<String>('host-audience-view-tabs')",
    ].join("\n"),
    customersPath: "customers.dart",
    customersSource: [
      "CatchRootScreenScaffold.withPrimaryRail(",
      "HostSavedAudiencesWorkspace(",
      "primaryAction: peopleView",
      "ValueKey('host-saved-audience-create')",
    ].join("\n"),
    workspacePath: "workspace.dart",
    workspaceSource,
    editorSheetsPath: "sheets.dart",
    editorSheetsSource: "",
    routeContractPath: "routes.dart",
    routeContractSource: [
      "hostCreateSavedAudienceScreen(\n    '/host/audience/audiences/new'",
      "hostSavedAudienceDetailScreen(\n    '/host/audience/audiences/:audienceId'",
    ].join("\n"),
  });
  for (const section of ["rows", "sliverRows"]) {
    assert.deepEqual(scanWorkspace(
      `CatchSection.${section}( CatchField.navigate(`,
    ), []);
  }
  assert.ok(scanWorkspace(
    "CatchSection.sliverRows( CatchField.navigate( ValueKey('host-saved-audience-create')",
  ).some((item) => /exactly one New group action/u.test(item.reason)));
  for (const source of [
    "CatchSection.containedRows( CatchField.navigate(",
    "CatchSection.content( CatchField.navigate(",
    "CatchSection.divided( CatchField.nav(",
    "CatchSection.sliverRows( CatchField.nav(",
  ]) {
    assert.ok(scanWorkspace(source).some((item) =>
      /typed row section/u.test(item.reason)));
  }
});

test("new-message presentation consumes the resolved conversation outcome", () => {
  assert.deepEqual(scanPresentationFile({
    relativePath: "lib/hosts/presentation/inbox/host_new_message_screen.dart",
    source: "plan.singleRecipient.outcome == HostCommunicationOutcome.inCatch",
  }), []);
});

test("flags saved-audience mutation outside Customers", () => {
  const findings = scanPresentationFile({
    relativePath: "lib/hosts/presentation/inbox/broadcast.dart",
    source: "await controller.saveAudience(definition);",
  });
  assert.match(findings[0].reason, /belong to Customers/u);
});

test("flags host-visible communication route pickers", () => {
  const findings = scanPresentationFile({
    relativePath: "lib/hosts/presentation/inbox/channel_picker.dart",
    source: "CatchField<HostCommunicationRouteId>.select(items: routes)",
  });
  assert.ok(findings.some((item) => /server-resolved/u.test(item.reason)));
  assert.ok(findings.some((item) => /choose communication intent/u.test(item.reason)));
});

test("flags manual-send queues outside Sends", () => {
  const findings = scanPresentationFile({
    relativePath: "lib/hosts/presentation/inbox/host_inbox_screen.dart",
    source: "const HostManualSendList()",
  });
  assert.match(findings[0].reason, /Sends workspace/u);
});

test("flags unreviewed permission-authority access", () => {
  const findings = scanBackendFile({
    relativePath: "functions/src/organizers/formGrant.ts",
    source: 'db.collection("organizerCommunicationPreferences").doc(id)',
  });
  assert.match(findings[0].reason, /explicit reviewed owner/u);
  assert.deepEqual(scanBackendFile({
    relativePath: "functions/src/organizers/organizerFormConsentPromotion.ts",
    source: 'db.collection("organizerCommunicationPreferences").doc(id)',
  }), []);
});

test("approval notification permission review is limited to its facts owner", () => {
  const source = 'db.collection("organizerCommunicationPreferences")' +
    '.doc(organizerCommunicationPreferenceId(organizerId, uid))';
  assert.deepEqual(scanBackendFile({
    relativePath: "functions/src/events/approvalNotifications/facts.ts",
    source,
  }), []);
  const findings = scanBackendFile({
    relativePath: "functions/src/events/approvalNotifications/dispatch.ts",
    source,
  });
  assert.match(findings[0].reason, /explicit reviewed owner/u);
});

test("flags direct contact creation outside canonical projection owners", () => {
  const findings = scanBackendFile({
    relativePath: "functions/src/organizers/shortcut.ts",
    source: [
      'const contactRef = db.collection("organizerContacts").doc();',
      "tx.create(contactRef, contact);",
    ].join("\n"),
  });
  assert.match(findings[0].reason, /canonical server owner/u);
});

test("flags saved-audience and manual-task writes outside their owners", () => {
  for (const [collection, alias] of [
    ["organizerSavedAudiences", "audienceRef"],
    ["organizerManualSendTasks", "taskRef"],
  ]) {
    const findings = scanBackendFile({
      relativePath: "functions/src/organizers/shortcut.ts",
      source: [
        `const ${alias} = db.collection("${collection}").doc(id);`,
        `tx.set(${alias}, document);`,
      ].join("\n"),
    });
    assert.match(findings[0].reason, /canonical server owner/u);
  }
});

test("flags form automations that dispatch outreach", () => {
  const findings = scanBackendFile({
    relativePath: "functions/src/organizers/organizerFormAutomations.ts",
    source: 'import {dispatchOrganizerCampaign} from "./organizerCampaignDispatcher";\ndispatchOrganizerCampaign();',
  });
  assert.ok(findings.some((item) => /cannot dispatch outreach/u.test(item.reason)));
});

test("flags provider delivery states on manual handoffs", () => {
  const findings = manualSendContractFindings({
    relativePath: "manual.json",
    schema: {definitions: {status: {enum: ["queued", "delivered", "read"]}}},
  });
  assert.match(findings[0].reason, /delivered\/read states are forbidden/u);
});

test("flags visible Host CRM counts without ICU plurals", () => {
  const findings = hostCrmCountCopyFindings({
    relativePath: "lib/l10n/app_en.arb",
    catalog: {
      hostSendsRecipients: "{count} people",
      "@hostSendsRecipients": {
        placeholders: {count: {type: "int"}},
      },
    },
  });
  assert.match(findings[0].reason, /without ICU plural ownership/u);
});

test("flags application queue ownership outside Audience", () => {
  const findings = applicationRouteOwnershipFindings({
    routeContractPath: "lib/platform/routing/route_contract.dart",
    routeContractSource:
      "hostApplicationsScreen('/host/customers/applications'",
    routerPath: "lib/routing/go_router.dart",
    routerSource: [
      "navigatorKey: keys.hostCustomers",
      "name: Routes.hostApplicationsScreen.name",
      "name: Routes.hostApplicationDetailScreen.name",
      "navigatorKey: keys.hostForms",
      "navigatorKey: keys.hostInbox",
    ].join("\n"),
  });
  assert.ok(findings.some((item) => /canonically Audience-owned/u.test(item.reason)));
  assert.ok(findings.some((item) => /Audience shell branch/u.test(item.reason)));
  assert.ok(findings.some((item) => /Legacy Customers and Forms/u.test(item.reason)));
});

test("shared workspace keeps application routes in the Audience branch", () => {
  const routeContractSource = fs.readFileSync(
    new URL("../../lib/platform/routing/route_contract.dart", import.meta.url), "utf8");
  const routerSource = fs.readFileSync(
    new URL("../../lib/routing/go_router.dart", import.meta.url), "utf8");
  const scan = (source) => applicationRouteOwnershipFindings({
    routeContractPath: "lib/platform/routing/route_contract.dart", routeContractSource,
    routerPath: "lib/routing/go_router.dart", routerSource: source,
  });
  assert.deepEqual(scan(routerSource), []);
  for (const name of ["hostApplicationsScreen", "hostApplicationDetailScreen"]) {
    const declaration = new RegExp(
      `(HostWorkspaceDestination\\(\\s*root:\\s*)HostWorkspaceRoot\\.audience` +
      `((?:(?!HostWorkspaceDestination\\()[\\s\\S])*?name:\\s*Routes\\.${name}\\.name,)`, "u",
    );
    assert.ok(declaration.test(routerSource), name);
    assert.ok(scan(routerSource.replace(declaration, "$1HostWorkspaceRoot.inbox$2"))
      .some((item) => /Audience shell branch/u.test(item.reason)), name);
  }
  for (const [before, after] of [
    ["navigatorKey: keys.hostAudience", "navigatorKey: keys.hostInbox"],
    ["workspaceRoute(Routes.hostAudienceScreen, roots[2])",
      "workspaceRoute(Routes.hostInboxScreen, roots[2])"],
    ["route.root.route == root", "true"],
    ["name: Routes.hostApplicationsScreen.name", "name: Routes.hostInboxScreen.name"],
    ["name: Routes.hostApplicationDetailScreen.name", "name: Routes.hostInboxScreen.name"],
  ]) {
    assert.ok(routerSource.includes(before), before);
    assert.ok(scan(routerSource.replace(before, after)).some((item) =>
      /Audience shell branch/u.test(item.reason)), before);
  }
});
