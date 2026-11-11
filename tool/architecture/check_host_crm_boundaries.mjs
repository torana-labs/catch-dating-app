#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import ts from "typescript";
import {fromRepo} from "../lib/repo_paths.mjs";

const toolPath = fileURLToPath(import.meta.url);
const isCli = process.argv[1] && path.resolve(process.argv[1]) === toolPath;

// The legacy customer detail and timeline were the only transport-route
// consumers; People reads intent plans, so no presentation file selects one.
const customerRouteConsumers = new Set();
const savedAudienceMutationOwners = new Set([
  "lib/hosts/presentation/host_audience_controller.dart",
]);
const manualQueueOwners = new Set([
  "lib/hosts/presentation/inbox/host_manual_send_list.dart",
  "lib/hosts/presentation/inbox/host_sends_workspace.dart",
]);
const permissionCollectionReviewers = new Set([
  // Rechecks organizer withdrawals inside the approval delivery transaction.
  "functions/src/events/approvalNotifications/facts.ts",
  "functions/src/events/eventAttendees.ts",
  "functions/src/organizers/campaignDeliveryWorker.ts",
  "functions/src/messaging/participantMessagingPreferences.ts",
  "functions/src/moments/momentWiring.ts",
  "functions/src/organizers/automationDeliveryWorker.ts",
  "functions/src/organizers/organizerFormMessagingConsent.ts",
  "functions/src/organizers/organizerFormConsentPromotion.ts",
  "functions/src/organizers/organizerAudienceProjection.ts",
  "functions/src/organizers/organizerCampaignDispatcher.ts",
  "functions/src/organizers/organizerCampaigns.ts",
  "functions/src/organizers/organizerContacts.ts",
  "functions/src/organizers/organizerCrm.ts",
  "functions/src/organizers/organizerSavedAudiences.ts",
  "functions/src/organizers/organizerWhatsappWebhook.ts",
  // Records the follower's reviewed WhatsApp permission (terms version checked)
  // with the follow, by organizerCommunicationPreferenceId.
  "functions/src/organizers/followOrganizerByPhone.ts",
  // Rechecks each follower's preference and stop record before a WhatsApp send.
  "functions/src/organizers/organizerFollowerWhatsappLeg.ts",
  "functions/src/safety/accountDeletion.ts",
]);

const collectionWriteOwners = new Map([
  ["organizerContacts", {
    operations: ["create", "set"],
    owners: new Set([
      "functions/src/organizers/organizerAudienceProjection.ts",
      "functions/src/organizers/organizerContacts.ts",
    ]),
  }],
  ["organizerSavedAudiences", {
    operations: ["create", "set", "update", "delete"],
    owners: new Set([
      "functions/src/organizers/organizerSavedAudiences.ts",
    ]),
  }],
  ["organizerManualSendTasks", {
    operations: ["create", "set", "update", "delete"],
    owners: new Set([
      "functions/src/organizers/organizerManualSendTasks.ts",
    ]),
  }],
]);

const manualSendStatuses = [
  "queued",
  "handoffOpened",
  "hostMarkedSent",
  "skipped",
  "cancelled",
  "superseded",
  "expired",
];

if (isCli) runCli();

export function scanHostCrmBoundaries({root = fromRepo()} = {}) {
  const findings = [];
  const presentationFiles = collectFiles(
    path.join(root, "lib/hosts/presentation"),
    ".dart"
  );
  const backendFiles = collectFiles(
    path.join(root, "functions/src"),
    ".ts"
  ).filter((file) =>
    !file.endsWith(".test.ts") &&
    !normalizePath(file).includes("/shared/generated/")
  );

  for (const file of presentationFiles) {
    const relativePath = normalizePath(path.relative(root, file));
    findings.push(...scanPresentationFile({
      relativePath,
      source: fs.readFileSync(file, "utf8"),
    }));
  }
  for (const file of backendFiles) {
    const relativePath = normalizePath(path.relative(root, file));
    findings.push(...scanBackendFile({
      relativePath,
      source: fs.readFileSync(file, "utf8"),
    }));
  }

  findings.push(...scanManualSendContract(root));
  findings.push(...scanFormProvenanceContract(root));
  findings.push(...scanHostCrmCountCopy(root));
  findings.push(...scanApplicationRouteOwnership(root));
  findings.push(...scanAudienceWorkspacePresentation(root));
  return {
    checkedFiles: presentationFiles.length + backendFiles.length,
    enforcedBoundaries: 13,
    findings,
  };
}

export function scanPresentationFile({relativePath, source}) {
  const findings = [];
  const inCustomers = relativePath.startsWith(
    "lib/hosts/presentation/customers/"
  );
  const audienceOwner = inCustomers ||
    savedAudienceMutationOwners.has(relativePath);
  for (const pattern of [
    /\bsaveAudience\s*\(/gu,
    /\barchiveAudience\s*\(/gu,
    /\bupsertSavedAudience\s*\(/gu,
    /\barchiveSavedAudience\s*\(/gu,
  ]) {
    for (const match of source.matchAll(pattern)) {
      if (!audienceOwner) findings.push(finding(
        relativePath,
        source,
        match.index,
        "Saved-audience definition mutations belong to Customers."
      ));
    }
  }

  if (source.includes("HostCommunicationRouteId") &&
      !customerRouteConsumers.has(relativePath)) {
    findings.push(finding(
      relativePath,
      source,
      source.indexOf("HostCommunicationRouteId"),
      "Host presentation must consume an intent plan, not select a transport route."
    ));
  }
  for (const pattern of [
    /CatchField\s*<\s*HostCommunicationRouteId\s*>\s*\.select/u,
    /DropdownButton\s*<\s*HostCommunicationRouteId\s*>/u,
    /SegmentedButton\s*<\s*HostCommunicationRouteId\s*>/u,
  ]) {
    const match = pattern.exec(source);
    if (match) findings.push(finding(
      relativePath,
      source,
      match.index,
      "Hosts choose communication intent; transport is server-resolved."
    ));
  }

  if (relativePath.endsWith("/host_inbox_screen.dart")) {
    for (const widget of ["HostInboxBroadcastCard", "ChatBlastComposerSheet"] ) {
      const index = source.indexOf(widget);
      if (index >= 0) findings.push(finding(
        relativePath,
        source,
        index,
        `${widget} does not belong in the inbound Inbox workspace.`
      ));
    }
  }
  const queueIndex = source.indexOf("HostManualSendList");
  if (queueIndex >= 0 && !manualQueueOwners.has(relativePath)) {
    findings.push(finding(
      relativePath,
      source,
      queueIndex,
      "Manual external handoff work belongs to the Sends workspace."
    ));
  }
  return findings;
}

export function scanBackendFile({relativePath, source}) {
  const findings = [];
  const permissionIndex = firstCollectionIndex(source, [
    "organizerCommunicationPreferences",
    "organizerCommunicationPermissionReceipts",
  ]);
  if (permissionIndex >= 0 &&
      !permissionCollectionReviewers.has(relativePath)) {
    findings.push(finding(
      relativePath,
      source,
      permissionIndex,
      "Permission-authority collection access requires an explicit reviewed owner."
    ));
  }
  if (permissionIndex >= 0) {
    const templateId = /collection\(\s*["']organizerCommunicationPreferences["']\s*\)[\s\S]{0,320}?\.doc\(\s*`/u
      .exec(source);
    if (templateId) findings.push(finding(
      relativePath,
      source,
      templateId.index,
      "Use organizerCommunicationPreferenceId; do not reconstruct preference ids."
    ));
  }

  for (const [collectionName, boundary] of collectionWriteOwners) {
    const mutations = collectionMutations(
      source,
      collectionName,
      boundary.operations
    );
    if (mutations.length > 0 && !boundary.owners.has(relativePath)) {
      for (const mutation of mutations) findings.push(finding(
        relativePath,
        source,
        mutation.index,
        `${collectionName} writes belong to its canonical server owner.`
      ));
    }
  }

  if (relativePath.endsWith("/organizerFormAutomations.ts")) {
    for (const pattern of [
      /from\s+["']\.\/organizerCampaignDispatcher["']/u,
      /from\s+["']\.\.\/events\/sendEventBroadcast["']/u,
      /\bdispatchOrganizerCampaign\s*\(/u,
      /\bsendEventBroadcastHandler\s*\(/u,
      /\bsendOrganizerWhatsappMessage\s*\(/u,
    ]) {
      const match = pattern.exec(source);
      if (match) findings.push(finding(
        relativePath,
        source,
        match.index,
        "Host Form automations may prepare reviewed work but cannot dispatch outreach."
      ));
    }
  }
  return findings;
}

export function manualSendContractFindings({relativePath, schema}) {
  const statuses = schema?.definitions?.status?.enum;
  if (JSON.stringify(statuses) === JSON.stringify(manualSendStatuses)) return [];
  return [{
    path: relativePath,
    line: 1,
    reason: "Manual handoffs may record host work only; delivered/read states are forbidden.",
  }];
}

export function hostCrmCountCopyFindings({relativePath, catalog}) {
  const findings = [];
  const keyPattern = /^(?:hostCustomers|hostSavedAudience|hostSends|hostForm|hostApplications)/u;
  const countNamePattern = /(?:count|opens|starts|submissions|created|skipped)$/iu;
  for (const [metadataKey, metadata] of Object.entries(catalog)) {
    if (!metadataKey.startsWith("@") || !keyPattern.test(metadataKey.slice(1)) ||
        !metadata || typeof metadata !== "object") continue;
    const key = metadataKey.slice(1);
    const value = catalog[key];
    if (typeof value !== "string") continue;
    for (const [placeholder, contract] of Object.entries(
      metadata.placeholders ?? {}
    )) {
      if (contract?.type !== "int" || !countNamePattern.test(placeholder)) {
        continue;
      }
      if (!value.includes(`{${placeholder}, plural,`)) {
        findings.push({
          path: relativePath,
          line: 1,
          reason: `${key}.${placeholder} is a visible CRM count without ICU plural ownership.`,
        });
      }
    }
  }
  return findings;
}

export function applicationRouteOwnershipFindings({
  routeContractPath,
  routeContractSource,
  routerPath,
  routerSource,
}) {
  const findings = [];
  const expectedListPath =
    "'/host/audience/applications'";
  const expectedDetailPath =
    "'/host/audience/applications/:applicationId'";
  if (!routeContractSource.includes(expectedListPath) ||
      !routeContractSource.includes(expectedDetailPath) ||
      routeContractSource.includes("/host/customers/applications")) {
    findings.push({
      path: routeContractPath,
      line: 1,
      reason: "Applications and application detail routes must be canonically Audience-owned.",
    });
  }

  const applicationsRoute = "name: Routes.hostApplicationsScreen.name";
  const applicationDetailRoute =
    "name: Routes.hostApplicationDetailScreen.name";
  // The People branch mounts one workspace per index route: the Audience
  // index and the inbox index.
  const audienceBranch = /StatefulShellBranch\(\s*navigatorKey:\s*keys\.hostPeople,\s*observers:\s*\[AnalyticsRouteObserver\(analytics\)\],\s*routes:\s*indexRoutes\(HostWorkspaceRoot\.people\),\s*\)/u;
  const ownedDestinationMount = /routes:\s*\[rootRoute,\s*\.\.\.routes\.where\(\(route\)\s*=>\s*route\.index\s*==\s*root\)\]/u;
  // Ownership is now declared on the destination, not inferred from its path.
  // Verify both the closed root mount and each application's typed metadata.
  const audienceDestination = (name) => new RegExp(
    `HostWorkspaceDestination\\(\\s*root:\\s*HostWorkspaceRoot\\.people,` +
    `(?:(?!HostWorkspaceDestination\\()[\\s\\S])*?name:\\s*Routes\\.${name}\\.name,`, "u",
  ).test(routerSource);
  const audienceOwnsBothRoutes =
    audienceBranch.test(routerSource) &&
    ownedDestinationMount.test(routerSource) &&
    audienceDestination("hostApplicationsScreen") &&
    audienceDestination("hostApplicationDetailScreen") &&
    routerSource.includes(applicationsRoute) &&
    routerSource.includes(applicationDetailRoute) &&
    !routerSource.includes("navigatorKey: keys.hostForms");
  if (!audienceOwnsBothRoutes) {
    findings.push({
      path: routerPath,
      line: 1,
      reason: "Named application routes must be mounted over the Audience index in the People shell branch.",
    });
  }

  if (!routerSource.includes("hostCustomersLegacyRedirect") ||
      !routerSource.includes("hostFormsLegacyRedirect")) {
    findings.push({
      path: routerPath,
      line: 1,
      reason: "Legacy Customers and Forms links must redirect to Audience ownership.",
    });
  }
  return findings;
}

export function audienceWorkspacePresentationFindings({
  audienceViewPath,
  audienceViewSource,
  routeContractPath,
  routeContractSource,
}) {
  const findings = [];
  for (const anchor of [
    "enum HostAudienceView { people, audiences, forms, responses, requests }",
    "class HostAudienceTabRail",
    "ValueKey<String>('host-audience-view-tabs')",
  ]) {
    if (!audienceViewSource.includes(anchor)) findings.push({
      path: audienceViewPath,
      line: 1,
      reason: `Audience must expose all five peer workspaces: ${anchor}`,
    });
  }
  for (const anchor of [
    "hostCreateSavedAudienceScreen(\n    '/host/audience/audiences/new'",
    "hostSavedAudienceDetailScreen(\n    '/host/audience/audiences/:audienceId'",
  ]) {
    if (!routeContractSource.includes(anchor)) findings.push({
      path: routeContractPath,
      line: 1,
      reason: "Saved-audience create and detail must remain full-page Audience routes.",
    });
  }
  return findings;
}

function scanManualSendContract(root) {
  const relativePath =
    "contracts/firestore/organizer_manual_send_tasks.schema.json";
  const file = path.join(root, relativePath);
  if (!fs.existsSync(file)) return [missingFinding(relativePath)];
  try {
    return manualSendContractFindings({
      relativePath,
      schema: JSON.parse(fs.readFileSync(file, "utf8")),
    });
  } catch {
    return [{path: relativePath, line: 1, reason: "Manual-send schema is invalid JSON."}];
  }
}

function scanHostCrmCountCopy(root) {
  const relativePath = "packages/l10n/lib/app_en.arb";
  const file = path.join(root, relativePath);
  if (!fs.existsSync(file)) return [missingFinding(relativePath)];
  try {
    return hostCrmCountCopyFindings({
      relativePath,
      catalog: JSON.parse(fs.readFileSync(file, "utf8")),
    });
  } catch {
    return [{path: relativePath, line: 1, reason: "English locale catalog is invalid JSON."}];
  }
}

function scanApplicationRouteOwnership(root) {
  const routeContractPath = "packages/platform/lib/routing/route_contract.dart";
  const routerPath = "lib/routing/go_router.dart";
  const routeContractFile = path.join(root, routeContractPath);
  const routerFile = path.join(root, routerPath);
  if (!fs.existsSync(routeContractFile) || !fs.existsSync(routerFile)) {
    return [
      ...(!fs.existsSync(routeContractFile)
        ? [missingFinding(routeContractPath)]
        : []),
      ...(!fs.existsSync(routerFile) ? [missingFinding(routerPath)] : []),
    ];
  }
  return applicationRouteOwnershipFindings({
    routeContractPath,
    routeContractSource: fs.readFileSync(routeContractFile, "utf8"),
    routerPath,
    routerSource: fs.readFileSync(routerFile, "utf8"),
  });
}

function scanAudienceWorkspacePresentation(root) {
  const audienceViewPath =
    "lib/hosts/presentation/host_audience_view.dart";
  const routeContractPath = "packages/platform/lib/routing/route_contract.dart";
  const paths = [audienceViewPath, routeContractPath];
  const missing = paths.filter((item) => !fs.existsSync(path.join(root, item)));
  if (missing.length > 0) return missing.map(missingFinding);
  return audienceWorkspacePresentationFindings({
    audienceViewPath,
    audienceViewSource: fs.readFileSync(
      path.join(root, audienceViewPath),
      "utf8"
    ),
    routeContractPath,
    routeContractSource: fs.readFileSync(path.join(root, routeContractPath), "utf8"),
  });
}

function scanFormProvenanceContract(root) {
  const required = [
    {
      path: "functions/src/organizers/organizerContacts.ts",
      anchors: [
        "origin: OrganizerContactCreationOrigin;",
        "formResponseOrganizerContactOrigin({",
      ],
    },
    {
      path: "functions/src/organizers/organizerFormConversions.ts",
      anchors: [],
      validate: protectedFormContactProvenance,
    },
    {
      path: "functions/src/shared/organizerContactOrigins.ts",
      anchors: [
        "formResponseOrganizerContactOrigin",
        'sourceEntityKind: "hostFormResponse"',
      ],
    },
  ];
  const findings = [];
  for (const item of required) {
    const file = path.join(root, item.path);
    if (!fs.existsSync(file)) {
      findings.push(missingFinding(item.path));
      continue;
    }
    const source = fs.readFileSync(file, "utf8");
    if (item.validate && !item.validate(source)) findings.push({
      path: item.path,
      line: 1,
      reason: "Host Form contact provenance must use the canonical writer for " +
        "every new or matched contact inside its source-authorized destination transaction.",
    });
    for (const anchor of item.anchors) {
      if (!source.includes(anchor)) findings.push({
        path: item.path,
        line: 1,
        reason: `Required Host Form contact provenance seam is missing: ${anchor}`,
      });
    }
  }
  return findings;
}

// This is a conservative check of the canonical straight-line creation branch,
// not a general control-flow prover. Receipt recovery is a separate branch;
// matching a contact must never create another path around its provenance write.
function protectedFormContactProvenance(source) {
  const file = ts.createSourceFile("conversion.ts", source,
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  if (file.parseDiagnostics.length) return false;
  const unwrap = (node) => {
    while (node && (ts.isAwaitExpression(node) || ts.isParenthesizedExpression(node) ||
        ts.isAsExpression(node) || ts.isNonNullExpression(node))) node = node.expression;
    return node;
  };
  const id = (node, name) => node && ts.isIdentifier(node) && node.text === name;
  const member = (node, name) => node && ts.isPropertyAccessExpression(node) &&
    node.name.text === name ? node.expression : null;
  const call = (node, name) => {
    node = unwrap(node);
    return node && ts.isCallExpression(node) && id(node.expression, name) ? node : null;
  };
  const property = (node, name) => {
    if (!node || !ts.isObjectLiteralExpression(node) ||
        node.properties.some(ts.isSpreadAssignment)) return null;
    const properties = node.properties.filter((item) => item.name &&
      (ts.isIdentifier(item.name) || ts.isStringLiteral(item.name)) && item.name.text === name);
    if (properties.length !== 1) return null;
    const item = properties[0];
    return ts.isPropertyAssignment(item) ? item.initializer :
      ts.isShorthandPropertyAssignment(item) ? item.name : null;
  };
  const nodes = (root, predicate, skipFunctions = false) => {
    const found = [];
    const visit = (node) => {
      if (skipFunctions && node !== root && ts.isFunctionLike(node)) return;
      if (predicate(node)) found.push(node);
      ts.forEachChild(node, visit);
    };
    visit(root);
    return found;
  };
  const declaration = (name, use, callback) => {
    if (!name || !ts.isIdentifier(name)) return null;
    for (let scope = use.parent; scope && scope !== callback; scope = scope.parent) {
      if (!ts.isBlock(scope)) continue;
      for (const statement of [...scope.statements].reverse()) {
        if (statement.pos >= use.pos || !ts.isVariableStatement(statement)) continue;
        const found = statement.declarationList.declarations.find((item) =>
          item.pos < use.pos && id(item.name, name.text));
        if (found) return found;
      }
    }
    return null;
  };
  const within = (node, ancestor) => {
    for (; node; node = node.parent) if (node === ancestor) return true;
    return false;
  };
  const equals = (node, field, value) => ts.isBinaryExpression(node) &&
    node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken &&
    ts.isStringLiteral(node.right) && node.right.text === value ?
      member(node.left, field) : null;
  const documentIn = (ref, use, scope, collectionName, identity) => {
    const binding = declaration(ref, use, scope);
    const reference = unwrap(binding?.initializer);
    const collection = reference && ts.isCallExpression(reference) ?
      member(reference.expression, "doc") : null;
    return collection && ts.isCallExpression(collection) &&
      member(collection.expression, "collection") && collection.arguments[0] &&
      ts.isStringLiteral(collection.arguments[0]) &&
      collection.arguments[0].text === collectionName &&
      call(reference.arguments[0] && ts.isIdentifier(reference.arguments[0]) ?
        declaration(reference.arguments[0], binding, scope)?.initializer :
        reference.arguments[0], identity);
  };
  const writers = nodes(file, (node) => ts.isCallExpression(node) &&
    id(node.expression, "createOrganizerContactInTransaction"));
  return writers.length > 0 && writers.every((writer) => {
    let callback = writer.parent;
    while (callback && !ts.isFunctionLike(callback)) callback = callback.parent;
    const transaction = callback?.parent;
    if (!callback || !ts.isArrowFunction(callback) || !ts.isBlock(callback.body) ||
        !transaction || !ts.isCallExpression(transaction) ||
        !member(transaction.expression, "runTransaction") ||
        transaction.arguments[0] !== callback) return false;
    let returned = transaction.parent;
    if (ts.isAwaitExpression(returned)) returned = returned.parent;
    if (!ts.isReturnStatement(returned) || !ts.isBlock(returned.parent) ||
        !ts.isFunctionLike(returned.parent.parent)) return false;
    const owner = returned.parent.parent;
    // No preflight result may bypass the returned destination transaction.
    if (nodes(owner.body, ts.isReturnStatement, true).some((node) => node !== returned)) return false;
    const tx = callback.parameters[0]?.name;
    if (!tx || !ts.isIdentifier(tx)) return false;

    // The awaited writer must be unconditional in the absent-origin branch.
    const awaited = writer.parent;
    const result = awaited?.parent;
    const statement = result?.parent?.parent;
    const block = statement?.parent;
    const branch = block?.parent;
    if (!awaited || !ts.isAwaitExpression(awaited) ||
        !result || !ts.isVariableDeclaration(result) || result.initializer !== awaited ||
        !statement || !ts.isVariableStatement(statement) || !block || !ts.isBlock(block) ||
        !branch || !ts.isIfStatement(branch) || branch.elseStatement !== block) return false;
    const originName = member(unwrap(branch.expression), "exists");
    const origin = declaration(originName, branch, callback);
    const read = unwrap(origin?.initializer);
    if (!read || !ts.isCallExpression(read) ||
        !id(member(read.expression, "get"), tx.text)) return false;
    if (!documentIn(read.arguments[0], origin, owner, "organizerContactOrigins",
      "organizerContactOriginId")) return false;
    // CRM/application dispatch may surround this branch; an endpoint match
    // or another conditional must not make the entire origin path optional.
    for (let ancestor = branch.parent; ancestor !== callback.body; ancestor = ancestor.parent) {
      if (ts.isBlock(ancestor)) continue;
      if (!ts.isIfStatement(ancestor) || !(
        equals(ancestor.expression, "kind", "application") && within(branch, ancestor.elseStatement) ||
        equals(ancestor.expression, "kind", "crmContact") && within(branch, ancestor.thenStatement)
      )) return false;
    }
    // A successful early return needs a transaction-read completion receipt
    // or this exact origin's recovery branch, never just a matching contact.
    const earlyReturns = nodes(callback.body, ts.isReturnStatement, true)
      .filter((node) => node.pos < writer.pos && !within(node, branch.thenStatement));
    for (const early of earlyReturns) {
      let proven = false;
      for (let parent = early.parent; parent !== callback; parent = parent.parent) {
        if (!ts.isIfStatement(parent) || !within(early, parent.thenStatement)) continue;
        const receipt = declaration(equals(parent.expression, "status", "completed"), parent, callback);
        const value = unwrap(receipt?.initializer);
        if (!value || !ts.isConditionalExpression(value)) continue;
        const decoded = call(value.whenTrue, "requireDoc");
        const snapshotName = member(value.condition, "exists");
        if (!snapshotName || !ts.isIdentifier(snapshotName) ||
            !id(decoded?.arguments[0], snapshotName.text)) continue;
        const snapshot = declaration(snapshotName, receipt, callback);
        const receiptRead = unwrap(snapshot?.initializer);
        if (receiptRead && ts.isCallExpression(receiptRead) &&
            id(member(receiptRead.expression, "get"), tx.text) &&
            documentIn(receiptRead.arguments[0], snapshot, owner,
              "organizerFormConversionReceipts", "formConversionReceiptId")) proven = true;
      }
      if (!proven) return false;
    }

    const args = writer.arguments[0];
    const targetName = member(property(args, "origin"), "origin");
    if (!targetName || !ts.isIdentifier(targetName) ||
        !id(property(args, "transaction"), tx.text) ||
        !id(member(property(args, "contactId"), "contactId"), targetName.text)) return false;
    const target = declaration(targetName, writer, callback);
    const targetCall = call(target?.initializer, "crmContactConversionTarget");
    let match = property(targetCall?.arguments[0], "existingResultId");
    if (match && ts.isIdentifier(match)) match = declaration(match, target, callback)?.initializer;
    const lookup = call(match, "findExistingContact");
    if (!lookup || !id(lookup.arguments[3], tx.text)) return false;

    const prefix = block.statements.slice(0, block.statements.indexOf(statement));
    const checks = prefix.filter(ts.isExpressionStatement).map((item) =>
      call(item.expression, "assertConversionAllowed"));
    if (prefix.some((item) => !ts.isVariableStatement(item) &&
        !(ts.isExpressionStatement(item) && call(item.expression, "assertConversionAllowed"))) ||
        !checks.some((check) => {
          const context = declaration(check?.arguments[0], writer, callback);
          return id(call(context?.initializer, "conversionContext")?.arguments[2], tx.text);
        })) return false;
    return nodes(callback.body, (node) => ts.isCallExpression(node) &&
      id(node.expression, "authorizeFormMutation"), true).some((authorize) =>
      authorize.pos < writer.pos && id(property(authorize.arguments[0], "tx"), tx.text));
  });
}

function collectionMutations(source, collectionName, operations) {
  const aliases = new Set();
  for (const match of source.matchAll(
    /\b(?:const|let)\s+(\w+)\s*=\s*([\s\S]*?);/gu
  )) {
    if (new RegExp(
      `\\.collection\\(\\s*["']${collectionName}["']\\s*\\)`,
      "u"
    ).test(match[2])) aliases.add(match[1]);
  }
  const findings = [];
  for (const alias of aliases) {
    const pattern = new RegExp(
      `\\b(?:tx|batch)\\.(?:${operations.join("|")})\\s*\\(\\s*${alias}\\b`,
      "gu"
    );
    for (const match of source.matchAll(pattern)) findings.push(match);
  }
  const inline = new RegExp(
    `\\b(?:tx|batch)\\.(?:${operations.join("|")})\\s*\\([\\s\\S]{0,320}?` +
      `\\.collection\\(\\s*["']${collectionName}["']\\s*\\)`,
    "gu"
  );
  for (const match of source.matchAll(inline)) findings.push(match);
  return findings;
}

function firstCollectionIndex(source, names) {
  const indexes = names.map((name) => source.search(new RegExp(
    `\\.collection\\(\\s*["']${name}["']\\s*\\)`,
    "u"
  ))).filter((index) => index >= 0);
  return indexes.length ? Math.min(...indexes) : -1;
}

function collectFiles(root, extension) {
  if (!fs.existsSync(root)) return [];
  const files = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile() && absolute.endsWith(extension) &&
          !absolute.endsWith(`.g${extension}`)) files.push(absolute);
    }
  };
  walk(root);
  return files.sort((a, b) => a.localeCompare(b));
}

function finding(relativePath, source, index, reason) {
  return {
    path: relativePath,
    line: 1 + source.slice(0, Math.max(0, index)).split("\n").length - 1,
    reason,
  };
}

function missingFinding(relativePath) {
  return {path: relativePath, line: 1, reason: "Required CRM authority file is missing."};
}

function normalizePath(value) {
  return value.split(path.sep).join("/");
}

function parseArgs(argv) {
  const parsed = {root: fromRepo(), json: false, help: false};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") parsed.root = requireValue(argv, ++index, arg);
    else if (arg === "--json") parsed.json = true;
    else if (arg === "--help" || arg === "-h") parsed.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return parsed;
}

function requireValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value.`);
  return value;
}

function runCli() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }
  if (args.help) {
    console.log("Usage: node tool/architecture/check_host_crm_boundaries.mjs [--root PATH] [--json]");
    return;
  }
  const result = scanHostCrmBoundaries({root: args.root});
  if (args.json) console.log(JSON.stringify(result, null, 2));
  else if (result.findings.length === 0) {
    console.log(
      `Host CRM boundary check passed (${result.checkedFiles} files, ` +
      `${result.enforcedBoundaries} boundaries).`
    );
  } else {
    for (const item of result.findings) {
      console.error(`${item.path}:${item.line}: ${item.reason}`);
    }
  }
  if (result.findings.length > 0) process.exitCode = 1;
}
