#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolDir, "../..");
const contractRoot = path.join(repoRoot, "contracts");
const draft07 = "http://json-schema.org/draft-07/schema#";

const errors = [];

function main() {
  if (!fs.existsSync(contractRoot)) {
    fail(`Missing contracts directory: ${relative(contractRoot)}`);
    finish();
    return;
  }

  const jsonFiles = walk(contractRoot).filter((file) => file.endsWith(".json"));
  const parsed = new Map();
  for (const file of jsonFiles) {
    try {
      parsed.set(file, readJson(file));
    } catch (error) {
      fail(`${relative(file)}: ${error.message}`);
    }
  }

  checkSchemaFiles(parsed);
  checkLocalRefs(parsed);
  checkCallableShapeMarkers(parsed);
  checkWireShapeExtensions(parsed);
  checkPromptCatalogs(parsed);
  checkPersonFieldCatalog(parsed);
  checkHostAttentionPolicyCatalog(parsed);
  checkEventAssistanceContracts(parsed);
  checkFixturePlacement(parsed);
  checkCurrentCodeDrift(parsed);

  finish({
    jsonFiles: parsed.size,
    schemaFiles: [...parsed.keys()].filter((file) =>
      file.endsWith(".schema.json")
    ).length,
  });
}

function checkEventAssistanceContracts(parsed) {
  const catalog = parsed.get(
    path.join(contractRoot, "catalogs/event_assistance_workflows.json")
  );
  const commandBindingCatalog = parsed.get(
    path.join(contractRoot,
      "catalogs/event_assistance_command_bindings.json")
  );
  const common = parsed.get(
    path.join(contractRoot, "shared/event_assistance_common.schema.json")
  );
  if (!catalog || !commandBindingCatalog || !common) {
    fail("Missing event assistance contracts.");
    return;
  }
  const kinds = common.definitions?.workflowKind?.enum ?? [];
  const policies = common.definitions?.WorkflowPolicy?.oneOf ?? [];
  const rows = catalog.definitions ?? [];
  if (
    catalog.schemaVersion !== 1 ||
    catalog.kind !== "eventAssistanceWorkflows"
  )
    fail("Invalid event assistance catalog identity.");
  if (new Set(kinds).size !== kinds.length || kinds.length === 0)
    fail("Workflow kinds must be nonempty and unique.");
  if (JSON.stringify(rows.map((row) => row.kind)) !== JSON.stringify(kinds))
    fail(
      "Event assistance catalog must cover workflow kinds exactly and in order."
    );
  if (
    JSON.stringify(policies.map((row) => row.properties?.kind?.const)) !==
    JSON.stringify(kinds)
  )
    fail("Each assistance workflow requires a correlated policy schema.");
  const rules = new Set([
    "all",
    "moving",
    "groups",
    "movingSubgroups",
    "resources",
    "rounds",
    "outcomes",
    "accountability",
    "paid",
    "requiredData",
    "roles",
    "admission",
    "tracking",
    "groupsOrResources",
    "independentUnits",
  ]);
  for (const [index, row] of rows.entries()) {
    const policy = policies[index];
    if (!rules.has(row.applicability))
      fail("Unknown assistance applicability rule: " + row.kind);
    if (
      !common.definitions[row.configDefinition] ||
      policy?.properties?.config?.$ref !==
        "#/definitions/" + row.configDefinition
    )
      fail("Missing or mismatched workflow configuration: " + row.kind);
    for (const field of [
      "trigger",
      "automatic",
      "hostDecision",
      "resolution",
    ]) {
      if (typeof row[field] !== "string" || row[field].trim().length === 0)
        fail("Missing workflow " + field + ": " + row.kind);
    }
  }
  const settings = parsed.get(path.join(contractRoot,
    "shared/event_assistance_settings.schema.json"));
  const templates = settings?.definitions?.Template?.oneOf ?? [];
  if (JSON.stringify(templates.map((t) => t.properties?.kind?.const)) !==
      JSON.stringify(kinds)) fail("Settings templates must cover every workflow.");
  for (const [index, template] of templates.entries()) {
    const row = rows[index];
    const expectedRef = row?.kind === "lateJoin" ?
      "#/definitions/LateJoinTemplateConfig" :
      "event_assistance_common.schema.json#/definitions/" +
        row?.configDefinition;
    if (template.additionalProperties !== false ||
        !["kind", "version", "config", "setting"].every((key) =>
          template.required?.includes(key)) ||
        template.properties?.config?.$ref !== expectedRef ||
        template.properties?.setting?.$ref !== "#/definitions/TemplateSetting") {
      fail("Settings template lost its correlated configuration: " + row?.kind);
    }
  }
  const templateSetting = structuredClone(common.definitions.PolicySetting);
  templateSetting.anyOf[0].required = templateSetting.anyOf[0].required
    .filter((key) => key !== "policyVersion");
  delete templateSetting.anyOf[0].properties.policyVersion;
  if (JSON.stringify(settings?.definitions?.TemplateSetting) !==
      JSON.stringify(templateSetting)) {
    fail("Template authority must match runtime authority without code version.");
  }
  const lateTemplate = settings?.definitions?.LateJoinTemplateConfig;
  const lateRuntime = common.definitions.LateJoinPolicy;
  if (lateTemplate?.additionalProperties !== false ||
      JSON.stringify(lateTemplate?.required) !==
        JSON.stringify(lateRuntime.required) ||
      JSON.stringify(Object.keys(lateTemplate?.properties ?? {})) !==
        JSON.stringify(Object.keys(lateRuntime.properties))) {
    fail("Late-join templates must retain the runtime configuration fields.");
  }
  for (const [key, value] of Object.entries(lateRuntime.properties)) {
    if (key !== "destination" && JSON.stringify(lateTemplate?.properties?.[key])
        !== JSON.stringify(value)) {
      fail("Late-join template constraint drift: " + key);
    }
  }
  const commands = (common.definitions?.Command?.oneOf ?? []).map((entry) => {
    if (!entry.$ref) return entry;
    const match = /^#\/definitions\/([^/]+)$/.exec(entry.$ref);
    if (!match || Object.keys(entry).length !== 1) {
      fail("Assistance command references must name one local definition.");
      return {};
    }
    return common.definitions[match[1]] ?? {};
  });
  const commandKinds = commands.map(
    (command) => command.properties?.kind?.const
  );
  if (
    !commands.length ||
    new Set(commandKinds).size !== commands.length ||
    commandKinds.some((kind) => typeof kind !== "string")
  )
    fail("Assistance command variants must be unique and named.");
  for (const command of commands) {
    if (
      command.additionalProperties !== false ||
      !["kind", "context", "eventId", "operationId", "payload"].every((field) =>
        command.required?.includes(field)
      )
    )
      fail("Assistance commands require closed context-bound envelopes.");
  }
  const knownCommandKinds = new Set(commandKinds);
  const commandBindings = commandBindingCatalog.definitions ?? [];
  if (commandBindingCatalog.schemaVersion !== 1 ||
      commandBindingCatalog.kind !== "eventAssistanceCommandBindings") {
    fail("Invalid event assistance command binding catalog identity.");
  }
  if (JSON.stringify(commandBindings.map((row) => row.commandKind)) !==
      JSON.stringify(commandKinds)) {
    fail("Command bindings must cover command kinds exactly and in order.");
  }
  const bindingTypes = new Set([
    "directCommand",
    "domainAdapter",
    "internalCoordinator",
    "contractOnly",
  ]);
  for (const row of commandBindings) {
    if (!row || typeof row !== "object" ||
        JSON.stringify(Object.keys(row)) !==
          JSON.stringify(["commandKind", "live", "rehearsal"])) {
      fail("Invalid command binding row: " + (row?.commandKind ?? "unknown"));
      continue;
    }
    for (const mode of ["live", "rehearsal"]) {
      const binding = row[mode];
      const partialCoverage = binding?.coverage;
      const expectedBindingKeys = partialCoverage === undefined ?
        ["bindingType", "operations", "missingCapability"] :
        ["bindingType", "coverage", "operations", "missingCapability"];
      if (!binding || typeof binding !== "object" ||
          JSON.stringify(Object.keys(binding)) !==
            JSON.stringify(expectedBindingKeys) ||
          !bindingTypes.has(binding.bindingType) ||
          !Array.isArray(binding.operations) ||
          new Set(binding.operations).size !== binding.operations.length ||
          binding.operations.some((operation) =>
            typeof operation !== "string" ||
            !/^[A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)?$/.test(
              operation
            )) ||
          (binding.missingCapability !== null &&
            (typeof binding.missingCapability !== "string" ||
              !/^[a-z][A-Za-z0-9]*$/.test(binding.missingCapability)))) {
        fail(`Invalid ${mode} command binding: ${row.commandKind}`);
        continue;
      }
      const contractOnly = binding.bindingType === "contractOnly";
      if (contractOnly !== (binding.operations.length === 0) ||
          contractOnly && binding.missingCapability === null ||
          !contractOnly && partialCoverage === undefined &&
            binding.missingCapability !== null) {
        fail(`Command binding operations mismatch: ${row.commandKind}/${mode}`);
      }
      if (partialCoverage !== undefined &&
          !validPartialCommandCoverage(partialCoverage, row.commandKind,
            commands, binding)) {
        fail(`Invalid partial command coverage: ${row.commandKind}/${mode}`);
      }
    }
  }
  const referencedCommandKinds = new Set();
  const commandRoles = ["automatic", "host", "guest"];
  const overridePolicies = new Set(["none", "scopedReasonedExpiring"]);
  const resolutionBoundaries = new Set([
    "eventAssistanceCommand",
    "eventConfiguration",
    "messagingConfiguration",
    "paymentConfiguration",
    "navigation",
    "reportReview",
  ]);
  const hostSurfaces = new Set([
    "today",
    "eventSetup",
    "liveNow",
    "liveGuests",
    "liveRoom",
    "eventReport",
  ]);
  const hostPresentations = new Set([
    "readinessTask",
    "atomicAction",
    "statusControl",
    "exceptionQueue",
    "reportInsight",
  ]);
  for (const row of rows) {
    const workflow = row.kind ?? "unknown";
    const commandMap = row.commands;
    if (!commandMap || typeof commandMap !== "object" ||
        JSON.stringify(Object.keys(commandMap)) !==
          JSON.stringify(commandRoles)) {
      fail("Workflow commands must cover every actor role: " + workflow);
      continue;
    }
    for (const role of commandRoles) {
      const values = commandMap[role];
      if (!Array.isArray(values) ||
          new Set(values).size !== values.length ||
          values.some((kind) => !knownCommandKinds.has(kind))) {
        fail("Invalid " + role + " workflow commands: " + workflow);
        continue;
      }
      for (const kind of values) referencedCommandKinds.add(kind);
    }
    const hasCommandContract = commandRoles.some(
      (role) => commandMap[role].length > 0
    );
    if (!resolutionBoundaries.has(row.resolutionBoundary) ||
        (row.resolutionBoundary === "eventAssistanceCommand") !==
          hasCommandContract) {
      fail("Invalid workflow resolution boundary: " + workflow);
    }
    if (!overridePolicies.has(row.overridePolicy)) {
      fail("Invalid workflow override policy: " + workflow);
    }
    const supportsOverride = commandMap.host.includes("applyOverride");
    if ((row.overridePolicy === "scopedReasonedExpiring") !==
        supportsOverride) {
      fail("Workflow override policy must match applyOverride: " + workflow);
    }
    const projection = row.hostProjection;
    if (!projection || typeof projection !== "object" ||
        JSON.stringify(Object.keys(projection)) !==
          JSON.stringify(["surfaces", "presentation"]) ||
        !Array.isArray(projection.surfaces) ||
        projection.surfaces.length === 0 ||
        new Set(projection.surfaces).size !== projection.surfaces.length ||
        projection.surfaces.some((surface) => !hostSurfaces.has(surface)) ||
        !hostPresentations.has(projection.presentation)) {
      fail("Invalid Host projection: " + workflow);
    }
  }
  if (JSON.stringify([...referencedCommandKinds].sort()) !==
      JSON.stringify([...knownCommandKinds].sort())) {
    fail("Event assistance workflows must account for every command kind.");
  }
}

function validPartialCommandCoverage(
  coverage,
  commandKind,
  commands,
  binding
) {
  if (!coverage || typeof coverage !== "object" ||
      JSON.stringify(Object.keys(coverage)) !== JSON.stringify([
        "kind",
        "variantField",
        "implementedVariants",
        "missingVariants",
      ]) ||
      coverage.kind !== "partial" ||
      typeof coverage.variantField !== "string" ||
      !/^[a-z][A-Za-z0-9]*$/.test(coverage.variantField) ||
      !validCoverageVariants(coverage.implementedVariants) ||
      !validCoverageVariants(coverage.missingVariants) ||
      binding.bindingType === "contractOnly" ||
      binding.missingCapability === null) {
    return false;
  }
  const command = commands.find((candidate) =>
    candidate.properties?.kind?.const === commandKind
  );
  const variants = command?.properties?.payload?.properties?.[
    coverage.variantField
  ]?.enum;
  const partition = [
    ...coverage.implementedVariants,
    ...coverage.missingVariants,
  ];
  return Array.isArray(variants) &&
    JSON.stringify(partition) === JSON.stringify(variants) &&
    new Set(partition).size === partition.length;
}

function validCoverageVariants(value) {
  return Array.isArray(value) && value.length > 0 &&
    new Set(value).size === value.length &&
    value.every((variant) =>
      typeof variant === "string" && /^[a-z][A-Za-z0-9]*$/.test(variant));
}

function checkHostAttentionPolicyCatalog(parsed) {
  const catalogPath = path.join(
    contractRoot,
    "catalogs/host_attention_policies.json"
  );
  const commonPath = path.join(
    contractRoot,
    "shared/host_attention_common.schema.json"
  );
  const catalog = parsed.get(catalogPath);
  const common = parsed.get(commonPath);
  if (!catalog || !common) {
    fail("Missing Host attention policy catalog or companion schemas.");
    return;
  }

  if (catalog.schemaVersion !== 1 || catalog.kind !== "hostAttentionPolicies") {
    fail(`${relative(catalogPath)}: invalid catalog identity.`);
  }
  for (const field of [
    "policyVersion",
    "horizonHours",
    "immediateHours",
    "soonHours",
  ]) {
    if (!Number.isInteger(catalog[field]) || catalog[field] < 1) {
      fail(`${relative(catalogPath)}: ${field} must be a positive integer.`);
    }
  }
  if (!(catalog.immediateHours < catalog.soonHours &&
      catalog.soonHours < catalog.horizonHours)) {
    fail(
      `${relative(catalogPath)}: urgency thresholds must increase before ` +
      "the horizon."
    );
  }

  const expectedKinds = common.definitions?.kind?.enum;
  if (!Array.isArray(expectedKinds) || expectedKinds.length === 0) {
    fail(`${relative(commonPath)}: kind enum must be non-empty.`);
    return;
  }
  if (common.definitions?.kind?.["x-catch-catalog"] !==
      "../catalogs/host_attention_policies.json") {
    fail(`${relative(commonPath)}: kind must declare the policy catalog.`);
  }
  if (!Array.isArray(catalog.definitions)) {
    fail(`${relative(catalogPath)}: definitions must be an array.`);
    return;
  }
  const actualKinds = catalog.definitions.map((definition) => definition?.kind);
  if (JSON.stringify(actualKinds) !== JSON.stringify(expectedKinds)) {
    fail(
      `${relative(catalogPath)}: definition kinds must match ` +
      `${relative(commonPath)} exactly and in order.`
    );
  }

  const scopes = new Set(common.definitions?.scope?.enum ?? []);
  const sourceOwners = new Set(common.definitions?.sourceOwner?.enum ?? []);
  const consequences = new Set(common.definitions?.consequence?.enum ?? []);
  const routes = new Set(common.definitions?.destinationRoute?.enum ?? []);
  const deliveryModes = new Set([
    "serverProjected",
    "clientMerged",
    "shortcutOnly",
    "blockedMissingTruth",
  ]);
  const readinessStates = new Set(["sourceReady", "blocked"]);
  const requiredTextFields = [
    "kind",
    "scope",
    "sourceOwner",
    "sourceIdPolicy",
    "sourceRevisionPolicy",
    "triggerPredicate",
    "resolutionPredicate",
    "permissionPredicate",
    "consequence",
    "dueAtPolicy",
    "expiresAtPolicy",
    "dedupePolicy",
    "deliveryMode",
    "readiness",
    "readinessReason",
  ];
  const seenKinds = new Set();
  for (const [index, definition] of catalog.definitions.entries()) {
    const label = `${relative(catalogPath)} definitions[${index}]`;
    if (!definition || typeof definition !== "object") {
      fail(`${label}: definition must be an object.`);
      continue;
    }
    for (const field of requiredTextFields) {
      if (typeof definition[field] !== "string" ||
          definition[field].trim().length === 0) {
        fail(`${label}: ${field} must be a non-empty string.`);
      }
    }
    if (seenKinds.has(definition.kind)) {
      fail(`${label}: duplicate kind ${String(definition.kind)}.`);
    }
    seenKinds.add(definition.kind);
    checkEnumValue(label, "scope", definition.scope, scopes);
    checkEnumValue(label, "sourceOwner", definition.sourceOwner, sourceOwners);
    checkEnumValue(
      label,
      "consequence",
      definition.consequence,
      consequences
    );
    checkEnumValue(
      label,
      "deliveryMode",
      definition.deliveryMode,
      deliveryModes
    );
    checkEnumValue(
      label,
      "readiness",
      definition.readiness,
      readinessStates
    );
    if (!definition.destination || typeof definition.destination !== "object") {
      fail(`${label}: destination must be an object.`);
    } else {
      checkEnumValue(
        `${label} destination`,
        "route",
        definition.destination.route,
        routes
      );
      if (definition.destination.section !== null &&
          (typeof definition.destination.section !== "string" ||
            definition.destination.section.length === 0)) {
        fail(`${label}: destination.section must be null or non-empty text.`);
      }
    }
    const expectsBlocked = definition.deliveryMode === "blockedMissingTruth";
    if ((definition.readiness === "blocked") !== expectsBlocked) {
      fail(
        `${label}: only blockedMissingTruth definitions may be blocked, and ` +
        "all blockedMissingTruth definitions must be blocked."
      );
    }
  }
}

function checkPersonFieldCatalog(parsed) {
  const catalogPath = path.join(contractRoot, "catalogs/person_fields.json");
  const applicationCommonPath = path.join(
    contractRoot,
    "shared/organizer_application_common.schema.json"
  );
  const usersPath = path.join(contractRoot, "firestore/users.schema.json");
  const publicProfilesPath = path.join(
    contractRoot,
    "firestore/public_profiles.schema.json"
  );
  const catalog = parsed.get(catalogPath);
  const applicationCommon = parsed.get(applicationCommonPath);
  const users = parsed.get(usersPath);
  const publicProfiles = parsed.get(publicProfilesPath);
  if (!catalog || !applicationCommon || !users || !publicProfiles) {
    fail("Missing person-field catalog or profile/application schemas.");
    return;
  }
  if (catalog.schemaVersion !== 1 || catalog.kind !== "personFields") {
    fail(`${relative(catalogPath)}: invalid catalog identity.`);
  }
  if (catalog.organizerAccessPolicy !== "submittedQuestionGrantOnly") {
    fail(
      `${relative(catalogPath)}: organizer access must remain bound to ` +
      "submitted question grants."
    );
  }
  if (catalog.publicProfileMetadataPolicy !==
      "structuralMappingOnlyNotAuthorization") {
    fail(
      `${relative(catalogPath)}: public profile mappings must remain ` +
      "structural metadata, not an access grant."
    );
  }
  if (catalog.tabularChoiceImportPolicy !==
      "preserveAsTextUntilOptionsMapped") {
    fail(
      `${relative(catalogPath)}: tabular choice answers must remain text ` +
      "until the source options are mapped."
    );
  }
  const accessPolicies = {
    authenticationPolicy: "identityVerificationDoesNotGrantDataAccess",
    applicationReviewPolicy: "reviewEveryQuestionBeforeEachSubmission",
    hostCommercePolicy: "eventScopedAggregatesOnly",
    eventStaffPolicy: "eventScopedRosterAndAttendanceOnly",
    employeeAccessPolicy: "purposeScopedRoleGatedMaskedAndAudited",
    rawPiiPolicy: "breakGlassOnly",
  };
  for (const [key, expected] of Object.entries(accessPolicies)) {
    if (catalog[key] !== expected) {
      fail(`${relative(catalogPath)}: ${key} must remain ${expected}.`);
    }
  }
  if (!Array.isArray(catalog.fields) || catalog.fields.length === 0) {
    fail(`${relative(catalogPath)}: fields must be a non-empty array.`);
    return;
  }

  const ids = new Set();
  const aliases = new Set();
  const questionKinds = new Set([
    "shortText", "longText", "singleChoice", "multiChoice", "date",
    "phone", "email", "url", "number", "boolean", "file",
  ]);
  const transforms = new Set([
    "identity", "trim", "e164", "isoDate", "number", "boolean",
    "splitOptions", "assetUrl",
  ]);
  const privacyClasses = new Set([
    "contact", "profile", "sensitive", "organizerCustom",
  ]);
  const prefillPolicies = new Set([
    "never", "participantReviewRequired",
  ]);
  const hostPresentations = new Set([
    "detailOnly", "filterable", "sortable",
  ]);
  const authorities = new Set([
    "firebaseAuth", "privateProfile", "intakeProfile", "derived",
  ]);
  const publicProjections = new Set(["never", "direct", "derived"]);
  for (const [index, field] of catalog.fields.entries()) {
    const label = `${relative(catalogPath)} fields[${index}]`;
    if (typeof field.id !== "string" || !/^[A-Za-z][A-Za-z0-9]*$/.test(field.id)) {
      fail(`${label}: id must be a canonical field identifier.`);
      continue;
    }
    if (ids.has(field.id)) fail(`${label}: duplicate id ${field.id}.`);
    ids.add(field.id);
    if (!Array.isArray(field.aliases) || field.aliases.length === 0) {
      fail(`${label}: aliases must be a non-empty array.`);
    } else {
      for (const alias of field.aliases) {
        if (typeof alias !== "string" || !/^[a-z0-9]+$/.test(alias)) {
          fail(`${label}: alias ${String(alias)} is not normalized.`);
        } else if (aliases.has(alias)) {
          fail(`${label}: duplicate alias ${alias}.`);
        }
        aliases.add(alias);
      }
      const canonicalAlias = field.id.toLowerCase();
      if (!field.aliases.includes(canonicalAlias)) {
        fail(`${label}: aliases must include canonical id ${canonicalAlias}.`);
      }
    }
    checkEnumValue(label, "questionKind", field.questionKind, questionKinds);
    checkEnumValue(label, "transform", field.transform, transforms);
    checkEnumValue(label, "privacyClass", field.privacyClass, privacyClasses);
    checkEnumValue(label, "prefillPolicy", field.prefillPolicy, prefillPolicies);
    checkEnumValue(
      label,
      "hostPresentation",
      field.hostPresentation,
      hostPresentations
    );
    checkEnumValue(label, "authority", field.authority, authorities);
    checkEnumValue(
      label,
      "publicProfileProjection",
      field.publicProfileProjection,
      publicProjections
    );

    if (field.privateProfilePath !== null &&
        !users.properties?.[field.privateProfilePath]) {
      fail(`${label}: unknown privateProfilePath ${field.privateProfilePath}.`);
    }
    if (field.publicProfileProjection === "never") {
      if (field.publicProfilePath !== null) {
        fail(`${label}: non-public fields cannot name a public profile path.`);
      }
    } else if (typeof field.publicProfilePath !== "string" ||
        !publicProfiles.properties?.[field.publicProfilePath]) {
      fail(`${label}: public projection must name a real public profile path.`);
    }
    if (field.authority === "derived") {
      if (typeof field.derivedFrom !== "string") {
        fail(`${label}: derived authority requires derivedFrom.`);
      }
      if (field.privateProfilePath !== null) {
        fail(`${label}: derived fields cannot claim a private profile path.`);
      }
    } else if (field.derivedFrom !== null) {
      fail(`${label}: only derived fields may declare derivedFrom.`);
    }
  }
  for (const field of catalog.fields) {
    if (field.derivedFrom !== null && !ids.has(field.derivedFrom)) {
      fail(
        `${relative(catalogPath)}: ${field.id} derives from unknown field ` +
        `${field.derivedFrom}.`
      );
    }
  }

  const schemaField = applicationCommon.definitions?.canonicalFieldId;
  const schemaIds = schemaField?.enum;
  if (!Array.isArray(schemaIds) ||
      JSON.stringify(schemaIds) !== JSON.stringify([...ids])) {
    fail(
      `${relative(applicationCommonPath)}: canonicalFieldId enum must match ` +
      `${relative(catalogPath)} exactly and in order.`
    );
  }
  if (schemaField?.["x-catch-catalog"] !== "../catalogs/person_fields.json") {
    fail(
      `${relative(applicationCommonPath)}: canonicalFieldId must declare its ` +
      "person-field catalog."
    );
  }
}

function checkEnumValue(label, key, value, allowed) {
  if (!allowed.has(value)) {
    fail(`${label}: ${key} has unsupported value ${String(value)}.`);
  }
}

function checkSchemaFiles(parsed) {
  for (const [file, json] of parsed.entries()) {
    if (!file.endsWith(".schema.json")) continue;
    if (json.$schema !== draft07) {
      fail(`${relative(file)}: expected draft-07 $schema.`);
    }
    if (typeof json.$id !== "string" || json.$id.length === 0) {
      fail(`${relative(file)}: missing string $id.`);
    }
  }
}

function checkCallableShapeMarkers(parsed) {
  for (const [file, json] of parsed.entries()) {
    if (!file.endsWith(".schema.json")) continue;
    const shape = json["x-callable-shape"];
    if (shape === undefined) continue;
    if (shape !== "patch") {
      fail(`${relative(file)}: x-callable-shape must be "patch" when present.`);
      continue;
    }
    if (!isCallableSchemaPath(file)) {
      fail(
        `${relative(file)}: x-callable-shape is only valid under ` +
        `contracts/callables/ or contracts/patches/.`
      );
    }
    if (
      json.type !== "object" ||
      !Array.isArray(json.required) ||
      !json.required.includes("fields") ||
      json.properties?.fields?.type !== "object" ||
      !json.properties?.fields?.properties
    ) {
      fail(
        `${relative(file)}: x-callable-shape "patch" requires a top-level ` +
        `required fields object.`
      );
    }
  }
}

function isCallableSchemaPath(file) {
  return file.startsWith(path.join(contractRoot, "callables") + path.sep) ||
    file.startsWith(path.join(contractRoot, "patches") + path.sep);
}

function checkWireShapeExtensions(parsed) {
  for (const [file, json] of parsed.entries()) {
    if (!file.endsWith(".schema.json")) continue;
    visitWireShapeNode(json, file, "#", parsed);
  }
}

function visitWireShapeNode(node, file, pointer, parsed) {
  if (Array.isArray(node)) {
    node.forEach((item, index) => {
      visitWireShapeNode(item, file, `${pointer}/${index}`, parsed);
    });
    return;
  }
  if (!node || typeof node !== "object") return;

  if (
    node["x-wire-shape-extends"] !== undefined ||
    node["x-wire-shape-injects"] !== undefined
  ) {
    validateWireShapeNode(node, file, pointer, parsed);
  }

  for (const [key, value] of Object.entries(node)) {
    visitWireShapeNode(value, file, `${pointer}/${escapeJsonPointer(key)}`, parsed);
  }
}

function validateWireShapeNode(node, file, pointer, parsed) {
  const label = `${relative(file)}${pointer}`;
  const extendsPath = node["x-wire-shape-extends"];
  const injects = node["x-wire-shape-injects"];

  if (typeof extendsPath !== "string" || extendsPath.length === 0) {
    fail(`${label}: x-wire-shape-extends must be a non-empty string.`);
    return;
  }
  if (!Array.isArray(injects) || injects.length === 0) {
    fail(`${label}: x-wire-shape-injects must be a non-empty array.`);
    return;
  }

  const targetPath = resolveContractMetadataPath(extendsPath, file);
  const target = parsed.get(targetPath);
  if (!target) {
    fail(`${label}: x-wire-shape-extends target not found: ${extendsPath}`);
    return;
  }
  if (target.type !== "object" || !target.properties) {
    fail(`${label}: x-wire-shape-extends target must be an object schema.`);
  }
  if (node.type !== "object" || !node.properties) {
    fail(`${label}: wire extension node must be an object with properties.`);
    return;
  }

  const required = new Set(node.required ?? []);
  const seen = new Set();
  for (const field of injects) {
    if (typeof field !== "string" || field.length === 0) {
      fail(`${label}: x-wire-shape-injects contains a non-string field.`);
      continue;
    }
    if (seen.has(field)) {
      fail(`${label}: duplicate injected wire field ${field}.`);
      continue;
    }
    seen.add(field);
    if (!node.properties[field]) {
      fail(`${label}: injected wire field ${field} is not declared.`);
    }
    if (!required.has(field)) {
      fail(`${label}: injected wire field ${field} must be required.`);
    }
    if (target.properties?.[field]) {
      fail(
        `${label}: injected wire field ${field} already exists in ` +
        `${extendsPath}.`
      );
    }
  }
}

function resolveContractMetadataPath(value, fromFile) {
  if (/^[a-z]+:\/\//i.test(value)) return value;
  if (value.startsWith("contracts/")) {
    return path.join(repoRoot, value);
  }
  return path.resolve(path.dirname(fromFile), value);
}

function escapeJsonPointer(value) {
  return value.replace(/~/g, "~0").replace(/\//g, "~1");
}

function checkLocalRefs(parsed) {
  for (const [file, json] of parsed.entries()) {
    for (const ref of collectRefs(json)) {
      if (ref.startsWith("#") || /^[a-z]+:\/\//i.test(ref)) continue;
      const target = ref.split("#")[0];
      if (!target) continue;
      const targetPath = path.resolve(path.dirname(file), target);
      if (!fs.existsSync(targetPath)) {
        fail(`${relative(file)}: $ref target not found: ${ref}`);
      }
    }
  }
}

function checkPromptCatalogs(parsed) {
  const profileCatalogPath = path.join(
    contractRoot,
    "catalogs/profile_prompts.json"
  );
  const photoCatalogPath = path.join(contractRoot, "catalogs/photo_prompts.json");
  const profilePhotoPolicyPath = path.join(
    contractRoot,
    "catalogs/profile_photo_policy.json"
  );
  const profileSchemaPath = path.join(
    contractRoot,
    "embedded/profile_prompt_answer.schema.json"
  );
  const photoSchemaPath = path.join(
    contractRoot,
    "embedded/photo_prompt_answer.schema.json"
  );
  const usersSchemaPath = path.join(contractRoot, "firestore/users.schema.json");
  const publicSchemaPath = path.join(
    contractRoot,
    "firestore/public_profiles.schema.json"
  );
  const patchSchemaPath = path.join(
    contractRoot,
    "patches/update_user_profile.schema.json"
  );

  const profileCatalog = parsed.get(profileCatalogPath);
  const photoCatalog = parsed.get(photoCatalogPath);
  const profilePhotoPolicy = parsed.get(profilePhotoPolicyPath);
  const profileSchema = parsed.get(profileSchemaPath);
  const photoSchema = parsed.get(photoSchemaPath);
  const usersSchema = parsed.get(usersSchemaPath);
  const publicSchema = parsed.get(publicSchemaPath);
  const patchSchema = parsed.get(patchSchemaPath);

  if (!profileCatalog || !photoCatalog || !profilePhotoPolicy) {
    fail("Missing prompt catalog files.");
    return;
  }
  if (!profileSchema || !photoSchema || !usersSchema || !publicSchema ||
      !patchSchema) {
    fail("Missing first-slice schema files.");
    return;
  }

  checkCatalog({
    file: profileCatalogPath,
    catalog: profileCatalog,
    expectedKind: "profilePrompts",
    maxItemKey: "maxAnswers",
  });
  checkCatalog({
    file: photoCatalogPath,
    catalog: photoCatalog,
    expectedKind: "photoPrompts",
  });

  const profileLimits = profileCatalog.limits ?? {};
  if (!Number.isInteger(profilePhotoPolicy.maxPhotos)) {
    fail(`${relative(profilePhotoPolicyPath)}: maxPhotos must be an integer.`);
  }
  const photoLimits = {
    ...(photoCatalog.limits ?? {}),
    maxCaptions: profilePhotoPolicy.maxPhotos,
  };
  assertEqual(
    profileSchema.properties?.promptId?.maxLength,
    profileLimits.maxPromptIdLength,
    "profile prompt id max length"
  );
  assertEqual(
    profileSchema.properties?.prompt?.maxLength,
    profileLimits.maxPromptTitleLength,
    "profile prompt title max length"
  );
  assertEqual(
    profileSchema.properties?.answer?.maxLength,
    profileLimits.maxAnswerLength,
    "profile prompt answer max length"
  );
  assertEqual(
    photoSchema.properties?.promptId?.maxLength,
    photoLimits.maxPromptIdLength,
    "photo prompt id max length"
  );
  assertEqual(
    photoSchema.properties?.prompt?.maxLength,
    photoLimits.maxPromptTitleLength,
    "photo prompt title max length"
  );
  assertEqual(
    photoSchema.properties?.caption?.maxLength,
    photoLimits.maxCaptionLength,
    "photo prompt caption max length"
  );
  const photoIndexMax =
    photoSchema.properties?.photoIndex?.maximum ??
    (photoSchema.properties?.photoIndex?.["x-catch-maximumFrom"] ===
      "profilePhotoPolicy.maxPhotosMinusOne" ?
      profilePhotoPolicy.maxPhotos - 1 :
      undefined);
  assertEqual(
    photoIndexMax,
    photoLimits.maxCaptions - 1,
    "photo prompt max index"
  );

  for (const [schemaFile, schema] of [
    [usersSchemaPath, usersSchema],
    [publicSchemaPath, publicSchema],
  ]) {
    assertEqual(
      schema.properties?.profilePrompts?.maxItems,
      profileLimits.maxAnswers,
      `${relative(schemaFile)} profilePrompts maxItems`
    );
  }

  assertEqual(
    patchSchema.properties?.fields?.properties?.profilePrompts?.maxItems,
    profileLimits.maxAnswers,
    "updateUserProfile profilePrompts maxItems"
  );
}

function checkCatalog({file, catalog, expectedKind, maxItemKey}) {
  if (catalog.schemaVersion !== 1) {
    fail(`${relative(file)}: schemaVersion must be 1.`);
  }
  if (catalog.kind !== expectedKind) {
    fail(`${relative(file)}: kind must be ${expectedKind}.`);
  }
  if (!Array.isArray(catalog.prompts) || catalog.prompts.length === 0) {
    fail(`${relative(file)}: prompts must be a non-empty array.`);
    return;
  }
  const ids = new Set();
  for (const [index, prompt] of catalog.prompts.entries()) {
    if (typeof prompt.id !== "string" || prompt.id.length === 0) {
      fail(`${relative(file)}: prompt ${index} has invalid id.`);
    }
    if (ids.has(prompt.id)) {
      fail(`${relative(file)}: duplicate prompt id ${prompt.id}.`);
    }
    ids.add(prompt.id);
    if (typeof prompt.title !== "string" || prompt.title.length === 0) {
      fail(`${relative(file)}: prompt ${prompt.id} has invalid title.`);
    }
    if (
      typeof prompt.placeholder !== "string" ||
      prompt.placeholder.length === 0
    ) {
      fail(`${relative(file)}: prompt ${prompt.id} has invalid placeholder.`);
    }
  }
  if (maxItemKey && !Number.isInteger(catalog.limits?.[maxItemKey])) {
    fail(`${relative(file)}: limits.${maxItemKey} must be an integer.`);
  }
  if (Array.isArray(catalog.defaultPromptIds)) {
    for (const id of catalog.defaultPromptIds) {
      if (!ids.has(id)) {
        fail(`${relative(file)}: defaultPromptIds contains unknown id ${id}.`);
      }
    }
  }
}

function checkFixturePlacement(parsed) {
  const validDir = path.join(contractRoot, "fixtures/valid");
  const invalidDir = path.join(contractRoot, "fixtures/invalid");
  const validFiles = [...parsed.keys()].filter((file) =>
    file.startsWith(`${validDir}${path.sep}`)
  );
  const invalidFiles = [...parsed.keys()].filter((file) =>
    file.startsWith(`${invalidDir}${path.sep}`)
  );

  if (validFiles.length === 0) {
    fail("contracts/fixtures/valid must contain at least one fixture.");
  }
  if (invalidFiles.length === 0) {
    fail("contracts/fixtures/invalid must contain at least one fixture.");
  }

  for (const file of validFiles) {
    if (containsKey(parsed.get(file), "bio")) {
      fail(`${relative(file)}: valid fixtures must not contain legacy bio.`);
    }
  }

  const overlongPrompt = parsed.get(
    path.join(invalidDir, "profile_prompt_answer_overlong.json")
  );
  const profileSchema = parsed.get(
    path.join(contractRoot, "embedded/profile_prompt_answer.schema.json")
  );
  const maxAnswerLength = profileSchema?.properties?.answer?.maxLength;
  if (
    typeof overlongPrompt?.answer === "string" &&
    Number.isInteger(maxAnswerLength) &&
    overlongPrompt.answer.length <= maxAnswerLength
  ) {
    fail("profile_prompt_answer_overlong.json must exceed maxAnswerLength.");
  }
}

function checkCurrentCodeDrift(parsed) {
  const commonSchema = parsed.get(
    path.join(contractRoot, "shared/profile_common.schema.json")
  );
  const heightCm = commonSchema?.definitions?.heightCm;
  if (
    !Number.isInteger(heightCm?.minimum) ||
    !Number.isInteger(heightCm?.maximum)
  ) {
    fail("profile_common.schema.json heightCm must define integer bounds.");
    return;
  }

  const updateUserProfilePath = path.join(
    repoRoot,
    "functions/src/profiles/updateUserProfile.ts"
  );
  const updateUserProfileSource = fs.readFileSync(
    updateUserProfilePath,
    "utf8"
  );
  assertContains(
    updateUserProfileSource,
    "validateUpdateUserProfileCallablePayload",
    `${relative(updateUserProfilePath)} generated profile validator`
  );
  if (updateUserProfileSource.includes("UserProfilePatchSchema")) {
    fail(`${relative(updateUserProfilePath)} must use generated schema validation.`);
  }
  if (
    updateUserProfileSource.includes("SexualOrientationSchema") ||
    /sexualOrientation\s*:/.test(updateUserProfileSource)
  ) {
    fail(`${relative(updateUserProfilePath)} must not accept sexualOrientation.`);
  }

  const rulesPath = path.join(repoRoot, "firestore.rules");
  const rulesSource = fs.readFileSync(rulesPath, "utf8");
  if (rulesSource.includes("sexualOrientation")) {
    fail(`${relative(rulesPath)} must not accept sexualOrientation.`);
  }
  assertContains(
    rulesSource,
    `data[field] >= ${heightCm.minimum}`,
    `${relative(rulesPath)} minimum height`
  );
  assertContains(
    rulesSource,
    `data[field] <= ${heightCm.maximum}`,
    `${relative(rulesPath)} maximum height`
  );

  const seedPath = path.join(repoRoot, "tool/demo/seed_demo_data.mjs");
  const seedSource = fs.readFileSync(seedPath, "utf8");
  if (/\bbio\s*:/.test(seedSource)) {
    fail(`${relative(seedPath)} must not emit legacy bio fields.`);
  }
  assertContains(
    seedSource,
    "profilePromptsForIndex",
    `${relative(seedPath)} profile prompts`
  );
  assertContains(
    seedSource,
    "photoPromptsForIndex",
    `${relative(seedPath)} photo prompts`
  );
}

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function collectRefs(value) {
  const refs = [];
  visit(value);
  return refs;

  function visit(node) {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!node || typeof node !== "object") return;
    if (typeof node.$ref === "string") refs.push(node.$ref);
    Object.values(node).forEach(visit);
  }
}

function containsKey(value, key) {
  if (Array.isArray(value)) return value.some((item) => containsKey(item, key));
  if (!value || typeof value !== "object") return false;
  if (Object.prototype.hasOwnProperty.call(value, key)) return true;
  return Object.values(value).some((item) => containsKey(item, key));
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    fail(`${label}: expected ${expected}, got ${actual}.`);
  }
}

function assertContains(source, expected, label) {
  if (!source.includes(expected)) {
    fail(`${label}: expected to contain ${expected}`);
  }
}

function fail(message) {
  errors.push(message);
}

function finish(stats = {}) {
  if (errors.length > 0) {
    console.error("Schema contract validation failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }
  const suffix = Object.entries(stats)
    .map(([key, value]) => `${key}=${value}`)
    .join(", ");
  console.log(`Schema contract validation passed${suffix ? ` (${suffix})` : ""}.`);
}

function relative(file) {
  return path.relative(repoRoot, file);
}

main();
