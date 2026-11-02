#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
import {discoverSchemaSpecs} from "./lib/schema_specs.mjs";

const requireFromFunctions = createRequire(
  new URL("../../functions/package.json", import.meta.url)
);
const {compile} = requireFromFunctions("json-schema-to-typescript");

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolDir, "../..");
const contractRoot = path.join(repoRoot, "contracts");
const checkOnly = process.argv.includes("--check");

function readToolJson(fileName) {
  return JSON.parse(fs.readFileSync(path.join(toolDir, fileName), "utf8"));
}

const schemaSpecs = discoverSchemaSpecs({
  contractRoot,
  exceptions: readToolJson("schema_spec_exceptions.json"),
  order: readToolJson("schema_spec_order.json"),
});

const FIRESTORE_ADMIN_EMBEDDED_SPECS = [
  {
    name: "Gender",
    source: "shared/profile_common.schema.json",
    pointer: "/definitions/gender",
  },
  {
    name: "PaymentStatus",
    source: "firestore/payments.schema.json",
    pointer: "/properties/status",
  },
  {
    name: "ProfilePromptAnswer",
    source: "embedded/profile_prompt_answer.schema.json",
  },
  {
    name: "PhotoPromptAnswer",
    source: "embedded/photo_prompt_answer.schema.json",
  },
  {
    name: "ProfilePhoto",
    source: "embedded/profile_photo.schema.json",
  },
  {
    name: "UploadedPhoto",
    source: "embedded/uploaded_photo.schema.json",
  },
  {
    name: "ActivityPreferences",
    source: "embedded/activity_preferences.schema.json",
  },
  {
    name: "OrganizerSupplyCapabilities",
    source: "embedded/organizer_supply_capabilities.schema.json",
  },
  {
    name: "EventMeetingLocation",
    source: "shared/event_common.schema.json",
    pointer: "/definitions/eventMeetingLocation",
  },
  {
    name: "EventFormatSnapshot",
    source: "shared/event_common.schema.json",
    pointer: "/definitions/eventFormatSnapshot",
  },
  {
    name: "EventSuccessFormatPrimitives",
    source: "shared/event_common.schema.json",
    pointer: "/definitions/eventSuccessFormatPrimitives",
  },
  {
    name: "EventSuccessStructureConfig",
    source: "shared/event_common.schema.json",
    pointer: "/definitions/eventSuccessStructureConfig",
  },
  {
    name: "EventSuccessQuestionnaireConfig",
    source: "shared/event_common.schema.json",
    pointer: "/definitions/eventSuccessQuestionnaireConfig",
  },
  {
    name: "EventSuccessDefaults",
    source: "shared/event_common.schema.json",
    pointer: "/definitions/eventSuccessDefaults",
  },
  {
    name: "EventPolicyDefaults",
    source: "shared/event_common.schema.json",
    pointer: "/definitions/eventPolicyDefaults",
  },
  {
    name: "ClubHostDefaults",
    source: "shared/event_common.schema.json",
    pointer: "/definitions/organizerHostDefaults",
  },
  {
    name: "ClubHostProfile",
    source: "shared/event_common.schema.json",
    pointer: "/definitions/organizerHostProfile",
  },
  {
    name: "EventConstraints",
    source: "shared/event_common.schema.json",
    pointer: "/definitions/eventConstraints",
  },
  {
    name: "EventPolicyBundleDocument",
    source: "shared/event_common.schema.json",
    pointer: "/definitions/eventPolicyBundle",
  },
  {
    name: "EventPolicyAdmissionDocument",
    source: "shared/event_common.schema.json",
    pointer: "/definitions/eventPolicyBundle/properties/admission",
  },
  {
    name: "EventPolicyPrivateAccessDocument",
    source: "shared/event_common.schema.json",
    pointer:
      "/definitions/eventPolicyBundle/properties/admission/" +
      "properties/privateAccessPolicy",
  },
  {
    name: "EventPolicyWaitlistDocument",
    source: "shared/event_common.schema.json",
    pointer:
      "/definitions/eventPolicyBundle/properties/admission/" +
      "properties/waitlistPolicy",
  },
  {
    name: "EventPolicyBalancedRatioDocument",
    source: "shared/event_common.schema.json",
    pointer:
      "/definitions/eventPolicyBundle/properties/admission/" +
      "properties/balancedRatioPolicy",
  },
  {
    name: "EventPolicyPricingDocument",
    source: "shared/event_common.schema.json",
    pointer: "/definitions/eventPolicyBundle/properties/pricing",
  },
  {
    name: "EventPolicyDemandPricingRuleDocument",
    source: "shared/event_common.schema.json",
    pointer:
      "/definitions/eventPolicyBundle/properties/pricing/" +
      "properties/demandPricingRules/items",
  },
];

const FIRESTORE_ADMIN_FIELD_OVERRIDES = new Map([
  ["ClubDocument.hostProfiles", "ClubHostProfile[]"],
  ["ClubDocument.hostDefaults", "ClubHostDefaults"],
  ["EventDocument.meetingLocation", "EventMeetingLocation"],
  ["EventDocument.eventFormat", "EventFormatSnapshot"],
  ["EventDocument.constraints", "EventConstraints"],
  ["EventDocument.eventPolicy", "EventPolicyBundleDocument | null"],
  ["EventFormatSnapshot.version", "number"],
  [
    "EventFormatSnapshot.eventSuccessPrimitives",
    "EventSuccessFormatPrimitives",
  ],
  ["EventSuccessDefaults.structureConfig", "EventSuccessStructureConfig"],
  [
    "EventSuccessDefaults.questionnaireConfig",
    "EventSuccessQuestionnaireConfig",
  ],
  ["ClubHostDefaults.eventPolicy", "EventPolicyDefaults"],
  ["ClubHostDefaults.eventSuccess", "EventSuccessDefaults"],
  [
    "ClubHostDefaults.eventSuccessByActivityKind",
    "Record<string, EventSuccessDefaults>",
  ],
  ["EventPolicyBundleDocument.version", "number"],
  ["EventPolicyBundleDocument.admission", "EventPolicyAdmissionDocument"],
  ["EventPolicyBundleDocument.pricing", "EventPolicyPricingDocument"],
  ["EventPolicyAdmissionDocument.waitlistPolicy", "EventPolicyWaitlistDocument"],
  [
    "EventPolicyAdmissionDocument.privateAccessPolicy",
    "EventPolicyPrivateAccessDocument",
  ],
  [
    "EventPolicyAdmissionDocument.balancedRatioPolicy",
    "EventPolicyBalancedRatioDocument | null",
  ],
  ["EventPolicyPricingDocument.demandPricingRules", "EventPolicyDemandPricingRuleDocument[]"],
]);

const FIRESTORE_ADMIN_OPTIONAL_FIELDS = new Map([
  ["EventConstraints", ["maxMen", "maxWomen"]],
  [
    "EventDocument",
    [
      "locationDetails",
      "bookedCount",
      "checkedInCount",
      "waitlistedCount",
      "cancelledAt",
      "cancellationReason",
    ],
  ],
  [
    "MatchDocument",
    [
      "lastMessageAt",
      "lastMessagePreview",
      "lastMessageSenderId",
      "blockedBy",
      "blockedAt",
    ],
  ],
  [
    "EventPolicyAdmissionDocument",
    [
      "waitlistPolicy",
      "inviteRequired",
      "membershipRequired",
      "manualApprovalRequired",
      "privateAccessPolicy",
      "cohortCapacityLimits",
      "balancedRatioPolicy",
    ],
  ],
  [
    "EventPolicyPricingDocument",
    [
      "cohortAdjustmentsInPaise",
      "demandPricingRules",
    ],
  ],
]);

const generatedFiles = [];
// Former outputs this generator removes when publishing and reports when they
// linger in check mode, so a retired module cannot silently stay importable.
const retiredOutputs = [];

async function main() {
  generatedFiles.push(...profileRequirementsOutputs(
    readContractJson("catalogs/profile_requirements.json"),
    readContractJson("firestore/users.schema.json")
  ));
  const profileCatalog = readContractJson("catalogs/profile_prompts.json");
  const personFieldCatalog = readContractJson("catalogs/person_fields.json");
  const organizerFormTemplateCatalog = readContractJson(
    "catalogs/organizer_form_templates.json"
  );
  assertOrganizerFormTemplateCatalog(organizerFormTemplateCatalog);
  const hostAttentionPolicyCatalog = readContractJson(
    "catalogs/host_attention_policies.json"
  );
  const organizerEntitlementSkuCatalog = readContractJson(
    "catalogs/organizer_entitlement_skus.json"
  );
  const eventSuccessMomentPresentationCatalog = readContractJson(
    "catalogs/event_success_moment_presentations.json"
  );
  assertEventSuccessMomentPresentationCatalog(
    eventSuccessMomentPresentationCatalog
  );
  const profilePhotoPolicy = readContractJson(
    "catalogs/profile_photo_policy.json"
  );
  const photoCatalog = withProfilePhotoPolicy(
    readContractJson("catalogs/photo_prompts.json"),
    profilePhotoPolicy
  );
  const profileDecisionMigration = readContractJson(
    "migrations/swipes_to_profile_decisions.json"
  );
  const eventAssistanceCatalog = readContractJson(
    "catalogs/event_assistance_workflows.json"
  );
  const eventAssistanceCommandBindingCatalog = readContractJson(
    "catalogs/event_assistance_command_bindings.json"
  );
  const assistanceCommon = readContractJson(
    "shared/event_assistance_common.schema.json"
  );
  const workflowKinds = assistanceCommon.definitions.workflowKind.enum;
  const commandSchema = resolveRefs(assistanceCommon.definitions.Command,
    path.join(contractRoot, "shared/event_assistance_common.schema.json"),
    false);
  const commandKinds = commandSchema.oneOf.map(
    (variant) => variant.properties.kind.const
  );
  const commandCoverageFields = new Set(["intent"]);
  for (const row of eventAssistanceCommandBindingCatalog.definitions) {
    for (const mode of [row.live, row.rehearsal]) {
      if (mode.coverage?.variantField) {
        commandCoverageFields.add(mode.coverage.variantField);
      }
    }
  }
  const commandCoverageVariants = [...new Set(commandSchema.oneOf.flatMap(
    (variant) => [...commandCoverageFields].flatMap((field) =>
      variant.properties.payload?.properties?.[field]?.enum ?? [])
  ))];
  addTextOutput(
    "lib/platform/schema_contracts/generated/event_assistance_kinds.g.dart",
    renderDartEventAssistanceCatalog({
      catalog: eventAssistanceCatalog,
      commandBindingCatalog: eventAssistanceCommandBindingCatalog,
      workflowKinds,
      commandKinds,
      coverageVariants: commandCoverageVariants,
    })
  );
  const bundledSchemas = new Map();
  const typeModules = new Map();

  for (const spec of schemaSpecs) {
    const file = path.join(contractRoot, spec.source);
    const schema = applyProfilePhotoPolicy(
      bundleSchema(file),
      profilePhotoPolicy
    );
    bundledSchemas.set(spec.name, schema);
    typeModules.set(spec.name, await addTypeOutput(spec, schema));
  }

  const firestoreAdminTypes = await renderTsFirestoreAdminTypes({
    schemaSpecs,
    profilePhotoPolicy,
  });
  const runtimeModules = functionsRuntimeModules({
    declaration: readContractJson("functions/runtime_modules.json"),
    specNames: schemaSpecs.map((spec) => spec.name),
    typeDependencies: new Map([...typeModules].map(([name, module]) =>
      [name, module.typeDependencies])),
    adminTypeDependencies: [...firestoreAdminTypes.matchAll(
      /^import type \{(\w+)\} from /gm
    )].map((match) => match[1]),
  });
  for (const spec of schemaSpecs) {
    if (runtimeModules.types.has(spec.name)) {
      addTextOutput(spec.typeOutput, typeModules.get(spec.name).content);
    } else {
      retiredOutputs.push(spec.typeOutput);
    }
  }

  renderTsSchemaModules({
      schemaMap: bundledSchemas,
      runtimeValidators: runtimeModules.validators,
      eventAssistanceCatalog,
      eventAssistanceCommandBindingCatalog,
      profileCatalog,
      personFieldCatalog,
      organizerFormTemplateCatalog,
      hostAttentionPolicyCatalog,
      organizerEntitlementSkuCatalog,
      photoCatalog,
      profilePhotoPolicy,
  });
  renderTsValidators(runtimeModules.validators);
  addTextOutput(
    "functions/src/shared/generated/firestoreAdminTypes.ts",
    firestoreAdminTypes
  );
  addTextOutput(
    "functions/src/shared/generated/schemaPaths.ts",
    renderTsPathConstants({
      profileDecisionSchema: bundledSchemas.get("SwipeDocument"),
      profileDecisionMigration,
    })
  );
  addTextOutput(
    "tool/contracts/generated/schema_contract_registry.mjs",
    renderToolSchemaRegistry({
      schemaMap: bundledSchemas,
      eventAssistanceCatalog,
      eventAssistanceCommandBindingCatalog,
      profileCatalog,
      personFieldCatalog,
      organizerFormTemplateCatalog,
      hostAttentionPolicyCatalog,
      organizerEntitlementSkuCatalog,
      photoCatalog,
      profilePhotoPolicy,
    })
  );
  addTextOutput(
    "tool/contracts/generated/schema_contract_validators.mjs",
    renderToolValidators()
  );
  const eventDisplayProperties = bundledSchemas.get("WebsiteHostListingProjection")
    .definitions.catchEvent.properties;
  const publicEventDisplaySchemas = JSON.stringify({
    photoUrl: eventDisplayProperties.photoUrl,
    meetingLocation: eventDisplayProperties.meetingLocation,
    itinerary: eventDisplayProperties.itinerary,
  }, null, 2);
  addTextOutput(
    "website/src/shared/contracts/generated/publicEventDisplaySchemas.ts",
    "// GENERATED CODE - DO NOT MODIFY BY HAND.\n" +
    "// Regenerate with: node tool/contracts/generate_schema_contracts.mjs\n" +
    "export const publicEventDisplaySchemas = " +
    publicEventDisplaySchemas + " as const;\n"
  );
  // The public page read models check optional event fields against the
  // same bundled schemas as the website reader.
  addTextOutput(
    "functions/src/shared/generated/publicEventDisplaySchemas.ts",
    "/* eslint-disable */\n" +
    "// GENERATED CODE - DO NOT MODIFY BY HAND.\n" +
    "// Regenerate with: node tool/contracts/generate_schema_contracts.mjs\n" +
    "export const publicEventDisplaySchemas = " +
    publicEventDisplaySchemas + " as const;\n"
  );
  addTextOutput(
    "website/src/shared/contracts/generated/joinWaitlistSchemas.ts",
    renderWebsiteJoinWaitlistSchemas({
      requestSchema: bundledSchemas.get("JoinWaitlistHTTPRequest"),
      responseSchema: bundledSchemas.get("JoinWaitlistHTTPResponse"),
    })
  );
  addTextOutput(
    "functions/src/shared/generated/eventSuccessMomentPresentations.ts",
    renderTsEventSuccessMomentPresentations(
      eventSuccessMomentPresentationCatalog
    )
  );
  addTextOutput(
    "lib/platform/schema_contracts/generated/" +
      "event_success_moment_presentations.g.dart",
    renderDartEventSuccessMomentPresentations(
      eventSuccessMomentPresentationCatalog
    )
  );
  addTextOutput(
    "lib/platform/schema_contracts/generated/profile_schema_contracts.g.dart",
    renderDartContracts({
      profileCatalog,
      personFieldCatalog,
      photoCatalog,
      profilePhotoPolicy,
      profilePromptSchema: bundledSchemas.get("ProfilePromptAnswer"),
      photoPromptSchema: bundledSchemas.get("PhotoPromptAnswer"),
      profilePhotoSchema: bundledSchemas.get("ProfilePhoto"),
      updateUserProfileSchema: bundledSchemas.get(
        "UpdateUserProfileCallablePayload"
      ),
      profileDecisionSchema: bundledSchemas.get("SwipeDocument"),
      profileDecisionMigration,
      commonSchema: readContractJson("shared/profile_common.schema.json"),
    })
  );

  addTextOutput(
    "lib/platform/schema_contracts/generated/field_constraints.g.dart",
    renderDartFieldConstraints({
      schemaSpecs,
      schemaMap: bundledSchemas,
      bindings: readContractJson("forms/field_constraint_bindings.json"),
    })
  );

  const dartCallableRequests = renderDartCallableRequestClasses({
    schemaSpecs,
    schemaMap: bundledSchemas,
    commonSchema: readContractJson("shared/profile_common.schema.json"),
  });
  addTextOutput(
    "lib/platform/schema_contracts/generated/callable_request_dtos.g.dart",
    dartCallableRequests.text
  );
  for (const file of dartCallableRequests.files) {
    addTextOutput(file.path, file.content);
  }
  addTextOutput(
    "lib/platform/schema_contracts/generated/INDEX.md",
    renderGeneratedIndex({dartCallableRequests, runtimeModules})
  );
  if (!checkOnly && dartCallableRequests.ungenerable.length > 0) {
    console.log(
      `[callable_request_dtos.g.dart] ${dartCallableRequests.ungenerable.length} ` +
      `schemas not yet generatable (hand-written callable helpers still own them):`
    );
    for (const entry of dartCallableRequests.ungenerable) {
      console.log(`  - ${entry.name}: ${entry.reason}`);
    }
  }

  const staleFiles = publishSchemaOutputs({
    root: repoRoot, files: generatedFiles, checkOnly, retiredFiles: retiredOutputs,
  });

  if (staleFiles.length > 0) {
    console.error("Generated schema contract outputs are stale:");
    for (const file of staleFiles) console.error(`- ${file}`);
    console.error("Run: node tool/contracts/generate_schema_contracts.mjs");
    process.exitCode = 1;
    return;
  }

  console.log(
    checkOnly ?
      "Generated schema contract outputs are current." :
      `Generated ${generatedFiles.length} schema contract files.`
  );
}

/** Check or publish only this generator's declared outputs and exclusive dirs. */
export function publishSchemaOutputs({root, files, checkOnly, retiredFiles = []}) {
  const staleFiles = [];
  const expectedFiles = new Set(files.map((file) => file.path));
  for (const relativeFile of retiredFiles) {
    const absoluteFile = path.join(root, relativeFile);
    if (expectedFiles.has(relativeFile) || !fs.existsSync(absoluteFile)) continue;
    if (checkOnly) staleFiles.push(relativeFile);
    else fs.unlinkSync(absoluteFile);
  }
  const ownedDirectories = [
    "functions/src/shared/generated/schemas",
    "functions/src/shared/generated/validators",
    "functions/src/shared/generated/catalogs",
    ...(checkOnly ? [DART_SCHEMA_OUTPUT_DIR, DART_CALLABLE_REQUEST_OUTPUT_DIR] : []),
  ];
  for (const relativeDirectory of ownedDirectories) {
    const absoluteDirectory = path.join(root, relativeDirectory);
    if (!fs.existsSync(absoluteDirectory)) continue;
    for (const file of fs.readdirSync(absoluteDirectory, {recursive: true})) {
      const relativeFile = `${relativeDirectory}/${file}`;
      const absoluteFile = path.join(root, relativeFile);
      if (!fs.statSync(absoluteFile).isFile() || expectedFiles.has(relativeFile)) continue;
      if (checkOnly) staleFiles.push(relativeFile);
      else fs.unlinkSync(absoluteFile);
    }
  }
  if (!checkOnly) {
    fs.rmSync(
      path.join(root, "lib/platform/schema_contracts/generated/callables"),
      {recursive: true, force: true}
    );
    fs.rmSync(
      path.join(root, "lib/platform/schema_contracts/generated/schemas"),
      {recursive: true, force: true}
    );
  }
  for (const file of files) {
    const absolutePath = path.join(root, file.path);
    if (checkOnly) {
      const current = fs.existsSync(absolutePath) ?
        fs.readFileSync(absolutePath, "utf8") :
        null;
      if (current !== file.content) staleFiles.push(file.path);
    } else {
      fs.mkdirSync(path.dirname(absolutePath), {recursive: true});
      fs.writeFileSync(absolutePath, file.content);
    }
  }

  return staleFiles;
}

const ORGANIZER_FORM_TEMPLATE_IDS = [
  "event-application",
  "event-registration",
  "dinner-guest-intake",
  "run-walk-participation",
  "racket-session",
  "quiz-team-night",
  "event-waiver",
  "post-event-feedback",
  "blank",
];
const ORGANIZER_FORM_PURPOSES = new Set([
  "application",
  "registration",
  "intake",
  "waiver",
  "feedback",
  "survey",
]);
const ORGANIZER_FORM_IDENTITY_POLICIES = new Set([
  "anonymous",
  "emailVerified",
  "phoneVerified",
  "emailOrPhoneVerified",
  "catchAccount",
]);

function assertOrganizerFormTemplateCatalog(catalog) {
  if (catalog?.schemaVersion !== 1 ||
      catalog?.kind !== "organizerFormTemplates") {
    throw new Error("Organizer form template catalog identity is invalid.");
  }
  if (!Array.isArray(catalog.templates) ||
      catalog.templates.length !== ORGANIZER_FORM_TEMPLATE_IDS.length) {
    throw new Error("Organizer form template catalog coverage is incomplete.");
  }
  const ids = new Set();
  for (const template of catalog.templates) {
    if (!ORGANIZER_FORM_TEMPLATE_IDS.includes(template?.id) ||
        ids.has(template.id)) {
      throw new Error(`Invalid organizer form template id: ${template?.id}`);
    }
    ids.add(template.id);
    if (!Number.isInteger(template.version) || template.version < 1 ||
        typeof template.title !== "string" || !template.title.trim() ||
        typeof template.description !== "string" ||
        !ORGANIZER_FORM_PURPOSES.has(template.purpose) ||
        !ORGANIZER_FORM_IDENTITY_POLICIES.has(template.identityPolicy) ||
        !Array.isArray(template.sections) || template.sections.length === 0) {
      throw new Error(`Organizer form template ${template.id} is malformed.`);
    }
    const sectionIds = new Set();
    const questionKeys = new Set();
    for (const section of template.sections) {
      if (typeof section?.id !== "string" || !section.id ||
          sectionIds.has(section.id) ||
          typeof section.title !== "string" || !section.title.trim() ||
          !Array.isArray(section.questions)) {
        throw new Error(
          `Organizer form template ${template.id} has an invalid section.`
        );
      }
      sectionIds.add(section.id);
      for (const question of section.questions) {
        if (typeof question?.key !== "string" ||
            !/^[A-Za-z][A-Za-z0-9_]{0,79}$/u.test(question.key) ||
            questionKeys.has(question.key) ||
            typeof question.label !== "string" || !question.label.trim() ||
            typeof question.kind !== "string" ||
            typeof question.required !== "boolean") {
          throw new Error(
            `Organizer form template ${template.id} has an invalid question.`
          );
        }
        questionKeys.add(question.key);
      }
    }
  }
}

const EVENT_SUCCESS_MOMENT_KINDS = [
  "none",
  "preArrival",
  "selfCheckIn",
  "firstHelloCheckIn",
  "compatibilityQuestionnaire",
  "liveStepContext",
  "socialPrompt",
  "conversationCues",
  "assignment",
  "liveReveal",
  "wingmanRequest",
  "postEvent",
];
const EVENT_SUCCESS_SEED_RULE = "fnv1a32-utf8-fields-v1";
const EVENT_SUCCESS_REVEAL_CLOCK =
  "revealStartedAtPlusStructureRevealCountdown";
const EVENT_SUCCESS_INTERACTION_MODELS = [
  "pacePods",
  "pairedRotations",
  "teamRotations",
  "seatedTable",
  "freeFormMixer",
  "hostLedProgram",
  "openFormat",
];
const EVENT_SUCCESS_DISCLOSURE_LEVELS = ["light", "personal", "reflective"];

function assertEventSuccessMomentPresentationCatalog(catalog) {
  if (catalog?.schemaVersion !== 1 ||
      catalog?.kind !== "eventSuccessMomentPresentations") {
    throw new Error(
      "Event Success moment presentation catalog identity is invalid."
    );
  }
  if (!Array.isArray(catalog.moments) ||
      catalog.moments.length !== EVENT_SUCCESS_MOMENT_KINDS.length) {
    throw new Error(
      "Event Success moment presentation catalog must cover every moment."
    );
  }
  const momentsByKind = new Map();
  const motifIds = new Set([
    "path", "gate", "spark", "rhythm", "orbit", "reveal", "signal",
    "afterglow",
  ]);
  const accentPolicies = new Set([
    "primary", "secondary", "secondaryUntilReveal",
  ]);
  const ambientBedIds = new Set([
    "theatrical", "pulse", "sunrise", "silent",
  ]);
  for (const moment of catalog.moments) {
    if (!EVENT_SUCCESS_MOMENT_KINDS.includes(moment?.momentKind)) {
      throw new Error(
        `Unknown Event Success moment presentation: ${moment?.momentKind}`
      );
    }
    if (momentsByKind.has(moment.momentKind)) {
      throw new Error(
        `Duplicate Event Success moment presentation: ${moment.momentKind}`
      );
    }
    momentsByKind.set(moment.momentKind, moment);
    if (typeof moment.paletteTokenId !== "string" ||
        moment.paletteTokenId.length === 0) {
      throw new Error(`${moment.momentKind} requires a palette token id.`);
    }
    if (moment.accentPaletteTokenId !== null &&
        (typeof moment.accentPaletteTokenId !== "string" ||
         moment.accentPaletteTokenId.length === 0)) {
      throw new Error(
        `${moment.momentKind} has an invalid accent palette token id.`
      );
    }
    if (!accentPolicies.has(moment.accentPalettePolicyId)) {
      throw new Error(
        `${moment.momentKind} has an invalid accent palette policy.`
      );
    }
    if (moment.accentPalettePolicyId !== "primary" &&
        moment.accentPaletteTokenId === null) {
      throw new Error(
        `${moment.momentKind} requires its secondary palette token.`
      );
    }
    if (!motifIds.has(moment.motifId)) {
      throw new Error(`${moment.momentKind} has an invalid motif id.`);
    }
    const durations = moment.phaseDurationsMs;
    for (const phase of ["anticipation", "climax", "settle"]) {
      if (!Number.isInteger(durations?.[phase]) || durations[phase] < 0) {
        throw new Error(
          `${moment.momentKind} has an invalid ${phase} duration.`
        );
      }
    }
    if (typeof moment.tempoBpm !== "number" ||
        !Number.isFinite(moment.tempoBpm) || moment.tempoBpm <= 0) {
      throw new Error(`${moment.momentKind} has an invalid tempo.`);
    }
    if (!Number.isInteger(moment.idlePulsePeriodMs) ||
        moment.idlePulsePeriodMs <= 0) {
      throw new Error(
        `${moment.momentKind} has an invalid idle-pulse period.`
      );
    }
    if (!Number.isInteger(moment.particleDensity) ||
        moment.particleDensity < 0) {
      throw new Error(
        `${moment.momentKind} has an invalid particle density.`
      );
    }
    if (moment.seedDerivationRuleId !== EVENT_SUCCESS_SEED_RULE) {
      throw new Error(
        `${moment.momentKind} has an unsupported deterministic seed rule.`
      );
    }
    if (moment.clockReferenceId !== "none" &&
        moment.clockReferenceId !== EVENT_SUCCESS_REVEAL_CLOCK) {
      throw new Error(
        `${moment.momentKind} has an unsupported server clock reference.`
      );
    }
    if (!ambientBedIds.has(moment.ambientBedId) ||
        (moment.ambientBedWhenEventEndedId !== null &&
         !ambientBedIds.has(moment.ambientBedWhenEventEndedId))) {
      throw new Error(`${moment.momentKind} has an invalid ambient bed id.`);
    }
  }
  for (const momentKind of EVENT_SUCCESS_MOMENT_KINDS) {
    if (!momentsByKind.has(momentKind)) {
      throw new Error(
        `Missing Event Success moment presentation: ${momentKind}`
      );
    }
  }
  const reveal = momentsByKind.get("liveReveal");
  if (reveal.clockReferenceId !== EVENT_SUCCESS_REVEAL_CLOCK ||
      reveal.phaseDurationsMs.anticipation <= 0 ||
      reveal.phaseDurationsMs.climax <= 0 ||
      reveal.phaseDurationsMs.settle <= 0 ||
      reveal.particleDensity <= 0) {
    throw new Error(
      "Live reveal must own its server clock, phases, and particle density."
    );
  }
  for (const [momentKind, moment] of momentsByKind) {
    if (momentKind === "liveReveal") continue;
    if (moment.clockReferenceId !== "none" || moment.particleDensity !== 0) {
      throw new Error(
        `${momentKind} cannot inherit the live-reveal ceremony.`
      );
    }
  }
  assertEventSuccessSocialMissionPromptSets(catalog.socialMissionPromptSets);
  assertEventSuccessMomentParityFixture(catalog.parityFixture, reveal);
}

function assertEventSuccessSocialMissionPromptSets(promptSets) {
  if (!Array.isArray(promptSets) ||
      promptSets.length !== EVENT_SUCCESS_INTERACTION_MODELS.length) {
    throw new Error(
      "Event Success social missions must cover every interaction model."
    );
  }
  const models = new Set();
  for (const promptSet of promptSets) {
    if (!EVENT_SUCCESS_INTERACTION_MODELS.includes(
      promptSet?.interactionModel
    ) || models.has(promptSet.interactionModel)) {
      throw new Error(
        `Invalid Event Success social mission model: ${
          promptSet?.interactionModel
        }`
      );
    }
    models.add(promptSet.interactionModel);
    if (!Array.isArray(promptSet.prompts) ||
        promptSet.prompts.length !== EVENT_SUCCESS_DISCLOSURE_LEVELS.length) {
      throw new Error(
        `${promptSet.interactionModel} requires three social mission prompts.`
      );
    }
    promptSet.prompts.forEach((prompt, index) => {
      if (prompt?.disclosureLevel !== EVENT_SUCCESS_DISCLOSURE_LEVELS[index] ||
          typeof prompt?.promptId !== "string" ||
          !/^[A-Za-z][A-Za-z0-9.]{2,79}$/u.test(prompt.promptId)) {
        throw new Error(
          `${promptSet.interactionModel} social mission ${index} is invalid.`
        );
      }
    });
  }
}

function assertEventSuccessMomentParityFixture(fixture, presentation) {
  if (fixture?.momentKind !== presentation.momentKind ||
      !Number.isInteger(fixture.activeRevealRoundIndex) ||
      !Number.isSafeInteger(fixture.serverAnchorMillis) ||
      !Number.isInteger(fixture.revealCountdownMs) ||
      fixture.revealCountdownMs < 0 || typeof fixture.eventId !== "string" ||
      fixture.eventId.length === 0) {
    throw new Error("Event Success moment parity fixture input is invalid.");
  }
  const timeline = resolveEventSuccessMomentTimelineFixture({
    presentation,
    serverAnchorMillis: fixture.serverAnchorMillis,
    revealCountdownMs: fixture.revealCountdownMs,
  });
  const seed = deriveEventSuccessMomentSeedFixture({
    presentation,
    eventId: fixture.eventId,
    activeRevealRoundIndex: fixture.activeRevealRoundIndex,
    serverAnchorMillis: fixture.serverAnchorMillis,
  });
  const expected = {...timeline, seed};
  if (JSON.stringify(fixture.expected) !== JSON.stringify(expected)) {
    throw new Error(
      "Event Success moment parity fixture expected output is stale."
    );
  }
}

function resolveEventSuccessMomentTimelineFixture({
  presentation,
  serverAnchorMillis,
  revealCountdownMs,
}) {
  const anticipationDurationMs =
    presentation.clockReferenceId === EVENT_SUCCESS_REVEAL_CLOCK ?
      revealCountdownMs : presentation.phaseDurationsMs.anticipation;
  const climaxStartsAtMillis = serverAnchorMillis + anticipationDurationMs;
  const settleStartsAtMillis =
    climaxStartsAtMillis + presentation.phaseDurationsMs.climax;
  return {
    anticipationStartsAtMillis: serverAnchorMillis,
    climaxStartsAtMillis,
    settleStartsAtMillis,
    completesAtMillis:
      settleStartsAtMillis + presentation.phaseDurationsMs.settle,
  };
}

function deriveEventSuccessMomentSeedFixture({
  presentation,
  eventId,
  activeRevealRoundIndex,
  serverAnchorMillis,
}) {
  if (presentation.seedDerivationRuleId !== EVENT_SUCCESS_SEED_RULE) {
    throw new Error(
      `Unsupported Event Success seed rule: ${
        presentation.seedDerivationRuleId
      }`
    );
  }
  let hash = 0x811c9dc5;
  const fields = [
    eventId,
    presentation.momentKind,
    String(activeRevealRoundIndex),
    String(serverAnchorMillis),
  ];
  for (const field of fields) {
    for (const byte of new TextEncoder().encode(field)) {
      hash = Math.imul(hash ^ byte, 0x01000193) >>> 0;
    }
    hash = Math.imul(hash ^ 0xff, 0x01000193) >>> 0;
  }
  return hash;
}

function renderTsEventSuccessMomentPresentations(catalog) {
  const momentKindType = EVENT_SUCCESS_MOMENT_KINDS
    .map((value) => JSON.stringify(value))
    .join(" | ");
  const interactionModelType = EVENT_SUCCESS_INTERACTION_MODELS
    .map((value) => JSON.stringify(value))
    .join(" | ");
  return `${tsGeneratedHeader()}export type EventSuccessMomentKind =
  ${momentKindType};
export type EventSuccessInteractionModel =
  ${interactionModelType};
export type EventSuccessDisclosureLevel =
  "light" | "personal" | "reflective";
export type EventSuccessAccentPalettePolicyId =
  "primary" | "secondary" | "secondaryUntilReveal";
export type EventSuccessMomentClockReferenceId =
  "none" | "${EVENT_SUCCESS_REVEAL_CLOCK}";
export type EventSuccessMomentSeedDerivationRuleId =
  "${EVENT_SUCCESS_SEED_RULE}";
export type EventSuccessAmbientBedId =
  "theatrical" | "pulse" | "sunrise" | "silent";

export interface EventSuccessMomentPhaseDurations {
  readonly anticipation: number;
  readonly climax: number;
  readonly settle: number;
}

export interface EventSuccessMomentPresentationContract {
  readonly momentKind: EventSuccessMomentKind;
  readonly paletteTokenId: string;
  readonly accentPaletteTokenId: string | null;
  readonly accentPalettePolicyId: EventSuccessAccentPalettePolicyId;
  readonly motifId: string;
  readonly phaseDurationsMs: EventSuccessMomentPhaseDurations;
  readonly tempoBpm: number;
  readonly idlePulsePeriodMs: number;
  readonly particleDensity: number;
  readonly seedDerivationRuleId: EventSuccessMomentSeedDerivationRuleId;
  readonly clockReferenceId: EventSuccessMomentClockReferenceId;
  readonly ambientBedId: EventSuccessAmbientBedId;
  readonly ambientBedWhenEventEndedId: EventSuccessAmbientBedId | null;
}

export interface EventSuccessSocialMissionPromptContract {
  readonly promptId: string;
  readonly disclosureLevel: EventSuccessDisclosureLevel;
}

export interface EventSuccessSocialMissionPromptSetContract {
  readonly interactionModel: EventSuccessInteractionModel;
  readonly prompts: readonly EventSuccessSocialMissionPromptContract[];
}

export interface EventSuccessMomentPresentationCatalog {
  readonly schemaVersion: 1;
  readonly kind: "eventSuccessMomentPresentations";
  readonly moments: readonly EventSuccessMomentPresentationContract[];
  readonly socialMissionPromptSets:
    readonly EventSuccessSocialMissionPromptSetContract[];
  readonly parityFixture: {
    readonly eventId: string;
    readonly momentKind: EventSuccessMomentKind;
    readonly activeRevealRoundIndex: number;
    readonly serverAnchorMillis: number;
    readonly revealCountdownMs: number;
    readonly expected: EventSuccessCeremonyTimeline & {readonly seed: number};
  };
}

export interface EventSuccessCeremonyTimeline {
  readonly anticipationStartsAtMillis: number;
  readonly climaxStartsAtMillis: number;
  readonly settleStartsAtMillis: number;
  readonly completesAtMillis: number;
}

export const eventSuccessMomentPresentationCatalog:
  EventSuccessMomentPresentationCatalog =
  ${jsonForTs(catalog)};

const eventSuccessMomentPresentationsByKind = new Map<
  EventSuccessMomentKind,
  EventSuccessMomentPresentationContract
>(eventSuccessMomentPresentationCatalog.moments.map((presentation) => [
  presentation.momentKind,
  presentation,
]));

export function eventSuccessMomentPresentationFor(
  momentKind: EventSuccessMomentKind
): EventSuccessMomentPresentationContract {
  const presentation = eventSuccessMomentPresentationsByKind.get(momentKind);
  if (!presentation) {
    throw new Error("Missing Event Success moment presentation: " + momentKind);
  }
  return presentation;
}

const eventSuccessSocialMissionPromptsByInteractionModel = new Map<
  EventSuccessInteractionModel,
  EventSuccessSocialMissionPromptSetContract
>(eventSuccessMomentPresentationCatalog.socialMissionPromptSets.map((set) => [
  set.interactionModel,
  set,
]));

export function eventSuccessSocialMissionPromptFor(input: {
  interactionModel: EventSuccessInteractionModel;
  activeStepIndex: number;
}): EventSuccessSocialMissionPromptContract {
  const promptSet = eventSuccessSocialMissionPromptsByInteractionModel.get(
    input.interactionModel
  );
  if (!promptSet || promptSet.prompts.length !== 3) {
    throw new Error(
      "Missing Event Success social missions: " + input.interactionModel
    );
  }
  const disclosureIndex = Math.max(0, Math.min(2, input.activeStepIndex));
  return promptSet.prompts[disclosureIndex];
}

export function resolveEventSuccessCeremonyTimeline(input: {
  presentation: EventSuccessMomentPresentationContract;
  serverAnchorMillis: number;
  revealCountdownMs?: number | null;
}): EventSuccessCeremonyTimeline {
  const configuredAnticipationMs =
    input.presentation.phaseDurationsMs.anticipation;
  const anticipationDurationMs =
    input.presentation.clockReferenceId ===
      "${EVENT_SUCCESS_REVEAL_CLOCK}" ?
      input.revealCountdownMs ?? configuredAnticipationMs :
      configuredAnticipationMs;
  if (!Number.isSafeInteger(input.serverAnchorMillis) ||
      !Number.isInteger(anticipationDurationMs) ||
      anticipationDurationMs < 0) {
    throw new Error("Event Success ceremony timing input is invalid.");
  }
  const climaxStartsAtMillis =
    input.serverAnchorMillis + anticipationDurationMs;
  const settleStartsAtMillis =
    climaxStartsAtMillis + input.presentation.phaseDurationsMs.climax;
  return {
    anticipationStartsAtMillis: input.serverAnchorMillis,
    climaxStartsAtMillis,
    settleStartsAtMillis,
    completesAtMillis:
      settleStartsAtMillis + input.presentation.phaseDurationsMs.settle,
  };
}

export function deriveEventSuccessMomentSeed(input: {
  presentation: EventSuccessMomentPresentationContract;
  eventId: string;
  activeRevealRoundIndex: number;
  serverAnchorMillis: number;
}): number {
  if (input.presentation.seedDerivationRuleId !==
      "${EVENT_SUCCESS_SEED_RULE}") {
    throw new Error(
      "Unsupported Event Success seed rule: " +
        input.presentation.seedDerivationRuleId
    );
  }
  let hash = 0x811c9dc5;
  const fields = [
    input.eventId,
    input.presentation.momentKind,
    String(input.activeRevealRoundIndex),
    String(input.serverAnchorMillis),
  ];
  for (const field of fields) {
    for (const byte of new TextEncoder().encode(field)) {
      hash = Math.imul(hash ^ byte, 0x01000193) >>> 0;
    }
    hash = Math.imul(hash ^ 0xff, 0x01000193) >>> 0;
  }
  return hash;
}
`;
}

function renderDartEventAssistanceCatalog({
  catalog,
  commandBindingCatalog,
  workflowKinds,
  commandKinds,
  coverageVariants,
}) {
  const enumText = (name, values) => {
    const compact = `enum ${name} { ${
      values.map(lowerCamelCase).join(", ")
    } }`;
    return compact.length <= 80 ? compact :
      `enum ${name} {\n` +
      values.map((value) => `  ${lowerCamelCase(value)},`).join("\n") +
      "\n}";
  };
  const enumList = (name, values, spaces = 6) => values.length === 0 ?
    `<${name}>[]` :
    `<${name}>[\n` + values.map((value) =>
      `${" ".repeat(spaces)}${name}.${lowerCamelCase(value)},`
    ).join("\n") + `\n${" ".repeat(spaces - 2)}]`;
  const stringList = (values, spaces = 6) => values.length === 0 ?
    "<String>[]" :
    "<String>[\n" + values.map((value) =>
      `${" ".repeat(spaces)}${dartString(value)},`
    ).join("\n") + `\n${" ".repeat(spaces - 2)}]`;
  const families = [...new Set(catalog.definitions.map((row) => row.family))];
  const applicability = [...new Set(
    catalog.definitions.map((row) => row.applicability)
  )];
  const scopes = [...new Set(catalog.definitions.map((row) => row.scope))];
  const overridePolicies = [...new Set(
    catalog.definitions.map((row) => row.overridePolicy)
  )];
  const resolutionBoundaries = [...new Set(
    catalog.definitions.map((row) => row.resolutionBoundary)
  )];
  const surfaces = [...new Set(catalog.definitions.flatMap(
    (row) => row.hostProjection.surfaces
  ))];
  const presentations = [...new Set(catalog.definitions.map(
    (row) => row.hostProjection.presentation
  ))];
  const bindingTypes = [...new Set(commandBindingCatalog.definitions.flatMap(
    (row) => [row.live.bindingType, row.rehearsal.bindingType]
  ))];
  const bindingCoverages = ["none", "partial", "complete"];
  const coverageKind = (binding) => binding.coverage?.kind ??
    (binding.bindingType === "contractOnly" ? "none" : "complete");
  const missingCapabilities = [...new Set(
    commandBindingCatalog.definitions.flatMap((row) =>
      [row.live.missingCapability, row.rehearsal.missingCapability]
        .filter((value) => value !== null)
    )
  )];
  const rows = catalog.definitions.map((row) =>
    "  EventAssistanceWorkflowDescriptor(\n" +
    `    kind: EventAssistanceWorkflowKind.${row.kind},\n` +
    `    version: ${row.version},\n` +
    `    family: EventAssistanceWorkflowFamily.${
      lowerCamelCase(row.family)
    },\n` +
    `    applicability: EventAssistanceApplicability.${
      lowerCamelCase(row.applicability)
    },\n` +
    `    scope: EventAssistanceWorkflowScope.${lowerCamelCase(row.scope)},\n` +
    `    automaticCommands: ${enumList(
      "EventAssistanceCommandKind",
      row.commands.automatic
    )},\n` +
    `    hostCommands: ${enumList(
      "EventAssistanceCommandKind",
      row.commands.host
    )},\n` +
    `    guestCommands: ${enumList(
      "EventAssistanceCommandKind",
      row.commands.guest
    )},\n` +
    `    overridePolicy: EventAssistanceOverridePolicy.${
      lowerCamelCase(row.overridePolicy)
    },\n` +
    `    resolutionBoundary:\n        EventAssistanceResolutionBoundary.${
      lowerCamelCase(row.resolutionBoundary)
    },\n` +
    "    hostProjection: EventAssistanceHostProjection(\n" +
    `      surfaces: ${enumList(
      "EventAssistanceHostSurface",
      row.hostProjection.surfaces,
      8
    )},\n` +
    `      presentation: EventAssistanceHostPresentation.${
      lowerCamelCase(row.hostProjection.presentation)
    },\n` +
    "    ),\n" +
    "  ),"
  ).join("\n");
  const bindingRows = commandBindingCatalog.definitions.map((row) =>
    "  EventAssistanceCommandBindingDescriptor(\n" +
    `    commandKind: EventAssistanceCommandKind.${row.commandKind},\n` +
    "    live: EventAssistanceModeBinding(\n" +
    `      bindingType: EventAssistanceCommandBindingType.${
      lowerCamelCase(row.live.bindingType)
    },\n` +
    `      coverage: EventAssistanceCommandCoverage.${
      coverageKind(row.live)
    },\n` +
    `      variantField: ${dartLiteral(
      row.live.coverage?.variantField ?? null
    )},\n` +
    `      implementedVariants: ${enumList(
      "EventAssistanceCommandCoverageVariant",
      row.live.coverage?.implementedVariants ?? [],
      8
    )},\n` +
    `      missingVariants: ${enumList(
      "EventAssistanceCommandCoverageVariant",
      row.live.coverage?.missingVariants ?? [],
      8
    )},\n` +
    `      operations: ${stringList(row.live.operations, 8)},\n` +
    `      missingCapability: ${row.live.missingCapability === null ?
      "null" :
      `EventAssistanceMissingCapability.${row.live.missingCapability}`},\n` +
    "    ),\n" +
    "    rehearsal: EventAssistanceModeBinding(\n" +
    `      bindingType: EventAssistanceCommandBindingType.${
      lowerCamelCase(row.rehearsal.bindingType)
    },\n` +
    `      coverage: EventAssistanceCommandCoverage.${
      coverageKind(row.rehearsal)
    },\n` +
    `      variantField: ${dartLiteral(
      row.rehearsal.coverage?.variantField ?? null
    )},\n` +
    `      implementedVariants: ${enumList(
      "EventAssistanceCommandCoverageVariant",
      row.rehearsal.coverage?.implementedVariants ?? [],
      8
    )},\n` +
    `      missingVariants: ${enumList(
      "EventAssistanceCommandCoverageVariant",
      row.rehearsal.coverage?.missingVariants ?? [],
      8
    )},\n` +
    `      operations: ${stringList(row.rehearsal.operations, 8)},\n` +
    `      missingCapability: ${row.rehearsal.missingCapability === null ?
      "null" :
      `EventAssistanceMissingCapability.${row.rehearsal.missingCapability}`},\n` +
    "    ),\n" +
    "  ),"
  ).join("\n");
  return `${dartGeneratedHeader()}${enumText(
    "EventAssistanceWorkflowKind",
    workflowKinds
  )}

${enumText("EventAssistanceCommandKind", commandKinds)}

${enumText("EventAssistanceWorkflowFamily", families)}

${enumText("EventAssistanceApplicability", applicability)}

${enumText("EventAssistanceWorkflowScope", scopes)}

${enumText("EventAssistanceOverridePolicy", overridePolicies)}

${enumText("EventAssistanceResolutionBoundary", resolutionBoundaries)}

${enumText("EventAssistanceHostSurface", surfaces)}

${enumText("EventAssistanceHostPresentation", presentations)}

${enumText("EventAssistanceCommandBindingType", bindingTypes)}

${enumText("EventAssistanceCommandCoverage", bindingCoverages)}

${enumText("EventAssistanceCommandCoverageVariant", coverageVariants)}

${enumText("EventAssistanceMissingCapability", missingCapabilities)}

final class EventAssistanceHostProjection {
  const EventAssistanceHostProjection({
    required this.surfaces,
    required this.presentation,
  });

  final List<EventAssistanceHostSurface> surfaces;
  final EventAssistanceHostPresentation presentation;
}

final class EventAssistanceWorkflowDescriptor {
  const EventAssistanceWorkflowDescriptor({
    required this.kind,
    required this.version,
    required this.family,
    required this.applicability,
    required this.scope,
    required this.automaticCommands,
    required this.hostCommands,
    required this.guestCommands,
    required this.overridePolicy,
    required this.resolutionBoundary,
    required this.hostProjection,
  });

  final EventAssistanceWorkflowKind kind;
  final int version;
  final EventAssistanceWorkflowFamily family;
  final EventAssistanceApplicability applicability;
  final EventAssistanceWorkflowScope scope;
  final List<EventAssistanceCommandKind> automaticCommands;
  final List<EventAssistanceCommandKind> hostCommands;
  final List<EventAssistanceCommandKind> guestCommands;
  final EventAssistanceOverridePolicy overridePolicy;
  final EventAssistanceResolutionBoundary resolutionBoundary;
  final EventAssistanceHostProjection hostProjection;

  bool get hasCommandContract =>
      automaticCommands.isNotEmpty ||
      hostCommands.isNotEmpty ||
      guestCommands.isNotEmpty;
}

const eventAssistanceWorkflowCatalog = <EventAssistanceWorkflowDescriptor>[
${rows}
];

extension EventAssistanceWorkflowCatalogLookup on EventAssistanceWorkflowKind {
  EventAssistanceWorkflowDescriptor get descriptor =>
      eventAssistanceWorkflowCatalog[index];
}

final class EventAssistanceModeBinding {
  const EventAssistanceModeBinding({
    required this.bindingType,
    required this.coverage,
    required this.variantField,
    required this.implementedVariants,
    required this.missingVariants,
    required this.operations,
    required this.missingCapability,
  });

  final EventAssistanceCommandBindingType bindingType;
  final EventAssistanceCommandCoverage coverage;
  final String? variantField;
  final List<EventAssistanceCommandCoverageVariant> implementedVariants;
  final List<EventAssistanceCommandCoverageVariant> missingVariants;
  final List<String> operations;
  final EventAssistanceMissingCapability? missingCapability;

  bool get isImplemented =>
      coverage != EventAssistanceCommandCoverage.none;

  bool get isFullyImplemented =>
      coverage == EventAssistanceCommandCoverage.complete;
}

final class EventAssistanceCommandBindingDescriptor {
  const EventAssistanceCommandBindingDescriptor({
    required this.commandKind,
    required this.live,
    required this.rehearsal,
  });

  final EventAssistanceCommandKind commandKind;
  final EventAssistanceModeBinding live;
  final EventAssistanceModeBinding rehearsal;
}

const eventAssistanceCommandBindingCatalog =
    <EventAssistanceCommandBindingDescriptor>[
${bindingRows}
];

extension EventAssistanceCommandBindingCatalogLookup
    on EventAssistanceCommandKind {
  EventAssistanceCommandBindingDescriptor get binding =>
      eventAssistanceCommandBindingCatalog[index];
}
`;
}

function renderDartEventSuccessMomentPresentations(catalog) {
  const moments = catalog.moments.map((moment) =>
    `  EventSuccessMomentPresentationContract(\n` +
    `    momentKind: ${dartString(moment.momentKind)},\n` +
    `    paletteTokenId: ${dartString(moment.paletteTokenId)},\n` +
    `    accentPaletteTokenId: ${dartLiteral(moment.accentPaletteTokenId)},\n` +
    `    accentPalettePolicyId: ${
      dartString(moment.accentPalettePolicyId)
    },\n` +
    `    motifId: ${dartString(moment.motifId)},\n` +
    `    phaseDurationsMs: EventSuccessMomentPhaseDurations(\n` +
    `      anticipation: ${moment.phaseDurationsMs.anticipation},\n` +
    `      climax: ${moment.phaseDurationsMs.climax},\n` +
    `      settle: ${moment.phaseDurationsMs.settle},\n` +
    `    ),\n` +
    `    tempoBpm: ${moment.tempoBpm},\n` +
    `    idlePulsePeriodMs: ${moment.idlePulsePeriodMs},\n` +
    `    particleDensity: ${moment.particleDensity},\n` +
    `    seedDerivationRuleId: ${
      dartString(moment.seedDerivationRuleId)
    },\n` +
    `    clockReferenceId: ${dartString(moment.clockReferenceId)},\n` +
    `    ambientBedId: ${dartString(moment.ambientBedId)},\n` +
    `    ambientBedWhenEventEndedId: ${
      dartLiteral(moment.ambientBedWhenEventEndedId)
    },\n` +
    `  ),`
  ).join("\n");
  const byKind = catalog.moments.map((moment) =>
    `  ${dartString(moment.momentKind)}: ` +
      `eventSuccessMomentPresentations[${
        EVENT_SUCCESS_MOMENT_KINDS.indexOf(moment.momentKind)
      }],`
  ).join("\n");
  const promptSets = catalog.socialMissionPromptSets.map((promptSet) =>
    `  EventSuccessSocialMissionPromptSetContract(\n` +
    `    interactionModel: ${dartString(promptSet.interactionModel)},\n` +
    `    prompts: <EventSuccessSocialMissionPromptContract>[\n` +
    promptSet.prompts.map((prompt) =>
      `      EventSuccessSocialMissionPromptContract(` +
      `promptId: ${dartString(prompt.promptId)}, ` +
      `disclosureLevel: ${dartString(prompt.disclosureLevel)}),`
    ).join("\n") + `\n    ],\n  ),`
  ).join("\n");
  const promptSetsByModel = catalog.socialMissionPromptSets.map((promptSet) =>
    `  ${dartString(promptSet.interactionModel)}: ` +
      `eventSuccessSocialMissionPromptSets[${
        EVENT_SUCCESS_INTERACTION_MODELS.indexOf(promptSet.interactionModel)
      }],`
  ).join("\n");
  return `${dartGeneratedHeader()}
import 'dart:convert';

class EventSuccessMomentPhaseDurations {
  const EventSuccessMomentPhaseDurations({
    required this.anticipation,
    required this.climax,
    required this.settle,
  });

  final int anticipation;
  final int climax;
  final int settle;
}

class EventSuccessMomentPresentationContract {
  const EventSuccessMomentPresentationContract({
    required this.momentKind,
    required this.paletteTokenId,
    required this.accentPaletteTokenId,
    required this.accentPalettePolicyId,
    required this.motifId,
    required this.phaseDurationsMs,
    required this.tempoBpm,
    required this.idlePulsePeriodMs,
    required this.particleDensity,
    required this.seedDerivationRuleId,
    required this.clockReferenceId,
    required this.ambientBedId,
    required this.ambientBedWhenEventEndedId,
  });

  final String momentKind;
  final String paletteTokenId;
  final String? accentPaletteTokenId;
  final String accentPalettePolicyId;
  final String motifId;
  final EventSuccessMomentPhaseDurations phaseDurationsMs;
  final double tempoBpm;
  final int idlePulsePeriodMs;
  final int particleDensity;
  final String seedDerivationRuleId;
  final String clockReferenceId;
  final String ambientBedId;
  final String? ambientBedWhenEventEndedId;
}

class EventSuccessSocialMissionPromptContract {
  const EventSuccessSocialMissionPromptContract({
    required this.promptId,
    required this.disclosureLevel,
  });

  final String promptId;
  final String disclosureLevel;
}

class EventSuccessSocialMissionPromptSetContract {
  const EventSuccessSocialMissionPromptSetContract({
    required this.interactionModel,
    required this.prompts,
  });

  final String interactionModel;
  final List<EventSuccessSocialMissionPromptContract> prompts;
}

class EventSuccessCeremonyTimeline {
  const EventSuccessCeremonyTimeline({
    required this.anticipationStartsAtMillis,
    required this.climaxStartsAtMillis,
    required this.settleStartsAtMillis,
    required this.completesAtMillis,
  });

  final int anticipationStartsAtMillis;
  final int climaxStartsAtMillis;
  final int settleStartsAtMillis;
  final int completesAtMillis;

  Map<String, Object?> toJson() => <String, Object?>{
    'anticipationStartsAtMillis': anticipationStartsAtMillis,
    'climaxStartsAtMillis': climaxStartsAtMillis,
    'settleStartsAtMillis': settleStartsAtMillis,
    'completesAtMillis': completesAtMillis,
  };
}

const eventSuccessMomentPresentationCatalogJson =
    ${dartLiteral(catalog)};

const eventSuccessMomentPresentations =
    <EventSuccessMomentPresentationContract>[
${moments}
];

final eventSuccessMomentPresentationsByKind =
    <String, EventSuccessMomentPresentationContract>{
${byKind}
};

const eventSuccessSocialMissionPromptSets =
    <EventSuccessSocialMissionPromptSetContract>[
${promptSets}
];

final eventSuccessSocialMissionPromptsByInteractionModel =
    <String, EventSuccessSocialMissionPromptSetContract>{
${promptSetsByModel}
};

EventSuccessMomentPresentationContract eventSuccessMomentPresentationFor(
  String momentKind,
) {
  final presentation = eventSuccessMomentPresentationsByKind[momentKind];
  if (presentation == null) {
    throw StateError('Missing Event Success moment presentation: \$momentKind');
  }
  return presentation;
}

EventSuccessSocialMissionPromptContract eventSuccessSocialMissionPromptFor({
  required String interactionModel,
  required int activeStepIndex,
}) {
  final promptSet =
      eventSuccessSocialMissionPromptsByInteractionModel[interactionModel];
  if (promptSet == null || promptSet.prompts.length != 3) {
    throw StateError(
      'Missing Event Success social missions: \$interactionModel',
    );
  }
  final disclosureIndex = activeStepIndex < 0
      ? 0
      : activeStepIndex > 2
      ? 2
      : activeStepIndex;
  return promptSet.prompts[disclosureIndex];
}

EventSuccessCeremonyTimeline resolveEventSuccessCeremonyTimeline({
  required EventSuccessMomentPresentationContract presentation,
  required int serverAnchorMillis,
  int? revealCountdownMs,
}) {
  final configuredAnticipationMs = presentation.phaseDurationsMs.anticipation;
  final anticipationDurationMs = presentation.clockReferenceId ==
          '${EVENT_SUCCESS_REVEAL_CLOCK}'
      ? revealCountdownMs ?? configuredAnticipationMs
      : configuredAnticipationMs;
  if (anticipationDurationMs < 0) {
    throw ArgumentError.value(
      anticipationDurationMs,
      'revealCountdownMs',
      'must not be negative',
    );
  }
  final climaxStartsAtMillis = serverAnchorMillis + anticipationDurationMs;
  final settleStartsAtMillis =
      climaxStartsAtMillis + presentation.phaseDurationsMs.climax;
  return EventSuccessCeremonyTimeline(
    anticipationStartsAtMillis: serverAnchorMillis,
    climaxStartsAtMillis: climaxStartsAtMillis,
    settleStartsAtMillis: settleStartsAtMillis,
    completesAtMillis:
        settleStartsAtMillis + presentation.phaseDurationsMs.settle,
  );
}

int deriveEventSuccessMomentSeed({
  required EventSuccessMomentPresentationContract presentation,
  required String eventId,
  required int activeRevealRoundIndex,
  required int serverAnchorMillis,
}) {
  if (presentation.seedDerivationRuleId != '${EVENT_SUCCESS_SEED_RULE}') {
    throw UnsupportedError(
      'Unsupported Event Success seed rule: '
      '\${presentation.seedDerivationRuleId}',
    );
  }
  var hash = 0x811c9dc5;
  final fields = <String>[
    eventId,
    presentation.momentKind,
    activeRevealRoundIndex.toString(),
    serverAnchorMillis.toString(),
  ];
  for (final field in fields) {
    for (final byte in utf8.encode(field)) {
      hash = ((hash ^ byte) * 0x01000193) & 0xffffffff;
    }
    hash = ((hash ^ 0xff) * 0x01000193) & 0xffffffff;
  }
  return hash;
}
`;
}

function withProfilePhotoPolicy(photoCatalog, profilePhotoPolicy) {
  return {
    ...photoCatalog,
    limits: {
      ...photoCatalog.limits,
      maxCaptions: profilePhotoPolicy.maxPhotos,
    },
  };
}

function applyProfilePhotoPolicy(schema, profilePhotoPolicy) {
  const cloned = structuredClone(schema);
  applyDerivedProfilePhotoPolicyValues(cloned, profilePhotoPolicy);
  return cloned;
}

function applyDerivedProfilePhotoPolicyValues(value, profilePhotoPolicy) {
  if (Array.isArray(value)) {
    for (const item of value) {
      applyDerivedProfilePhotoPolicyValues(item, profilePhotoPolicy);
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (
    value["x-catch-maximumFrom"] ===
    "profilePhotoPolicy.maxPhotosMinusOne"
  ) {
    value.maximum = profilePhotoPolicy.maxPhotos - 1;
    delete value["x-catch-maximumFrom"];
  }
  for (const child of Object.values(value)) {
    applyDerivedProfilePhotoPolicyValues(child, profilePhotoPolicy);
  }
}

async function addTypeOutput(spec, schema) {
  let types = await compileTs({...schema, title: spec.name}, spec.name);
  types = normalizeExternalTypeReferences(spec.name, types);
  const imports = tsTypeImports(spec.name, types);
  const content = `${tsGeneratedHeader()}${imports}${types.trim()}\n`;
  for (const output of spec.additionalTypeOutputs ?? []) {
    addTextOutput(output, content);
  }
  return {content, typeDependencies: referencedSpecNames(spec.name, types)};
}

function referencedSpecNames(currentTypeName, source) {
  const typeSource = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  return schemaSpecs
    .filter((spec) => spec.name !== currentTypeName &&
      new RegExp(`\\b${spec.name}\\b`).test(typeSource))
    .map((spec) => spec.name);
}

/**
 * Resolves contracts/functions/runtime_modules.json into the specs whose
 * Functions type and validator modules are emitted. The declaration is the
 * source of truth, so the generator never reads Functions code: an
 * undeclared import fails the Functions build, and a declared name that is
 * not a schema spec fails here. Types the emitted modules depend on are
 * added from the generator's own output.
 */
export function functionsRuntimeModules({declaration, specNames, typeDependencies,
  adminTypeDependencies}) {
  const known = new Set(specNames);
  const validators = new Set(declaration.validators ?? []);
  const declaredTypes = [...validators, ...(declaration.types ?? [])];
  const unknown = declaredTypes.filter((name) => !known.has(name));
  if (unknown.length > 0) {
    throw new Error(
      "contracts/functions/runtime_modules.json names unknown schema specs:\n" +
      unknown.map((name) => `- ${name}`).join("\n")
    );
  }
  const types = new Set();
  const pending = [...declaredTypes, ...adminTypeDependencies];
  while (pending.length > 0) {
    const name = pending.pop();
    if (types.has(name)) continue;
    types.add(name);
    pending.push(...(typeDependencies.get(name) ?? []));
  }
  return {validators, types};
}

function compileTs(schema, name) {
  return compile(schema, name, {
    bannerComment: "",
    cwd: repoRoot,
    declareExternallyReferenced: false,
    enableConstEnums: false,
    format: true,
    ignoreMinAndMaxItems: true,
    style: {
      bracketSpacing: false,
      printWidth: 80,
      semi: true,
      singleQuote: false,
      tabWidth: 2,
      trailingComma: "es5",
      useTabs: false,
    },
  });
}

async function renderTsFirestoreAdminTypes({schemaSpecs, profilePhotoPolicy}) {
  const firestoreSpecs = schemaSpecs
    .filter((spec) => spec.source.startsWith("firestore/"));
  const allAdminTypeNames = [
    ...FIRESTORE_ADMIN_EMBEDDED_SPECS.map((spec) => spec.name),
    ...firestoreSpecs.map((spec) => firestoreAdminTypeName(spec.name)),
  ];
  const sections = [];

  for (const spec of FIRESTORE_ADMIN_EMBEDDED_SPECS) {
    const schema = firestoreAdminNamedSchema(spec, profilePhotoPolicy);
    applyFirestoreAdminFieldOverrides(schema, spec.name);
    applyFirestoreAdminOptionalFields(schema, spec.name);
    sections.push(await compileFirestoreAdminType(
      schema,
      spec.name,
      allAdminTypeNames
    ));
  }

  for (const spec of firestoreSpecs) {
    const file = path.join(contractRoot, spec.source);
    const schema = applyProfilePhotoPolicy(
      bundleSchema(file),
      profilePhotoPolicy
    );
    stripInternalDemoFields(schema);
    stripTopLevelStructuralValidation(schema);
    const adminName = firestoreAdminTypeName(spec.name);
    schema.title = adminName;
    applyFirestoreAdminFieldOverrides(schema, adminName);
    applyFirestoreAdminOptionalFields(schema, adminName);
    sections.push(await compileFirestoreAdminType(
      withAdminTimestamps(schema),
      adminName,
      allAdminTypeNames
    ));
  }

  const sectionSource = sections.join("\n\n");
  const externalImports = schemaSpecs
    .filter((spec) => !allAdminTypeNames.includes(spec.name))
    .filter((spec) => new RegExp(`\\b${spec.name}\\b`).test(sectionSource))
    .map((spec) => `import type {${spec.name}} from "${typeImportPath(spec)}";`)
    .join("\n");
  const importBlock = externalImports.length === 0 ?
    "" : `${externalImports}\n\n`;

  return `${tsGeneratedHeader()}${importBlock}` +
`/**
 * Schema-derived Admin SDK Firestore document types.
 *
 * The sibling generated document files model serialized JSON fixture
 * timestamps as {_seconds, _nanoseconds}. These types keep the same
 * schema-owned fields, but project Firestore timestamp values as live
 * FirebaseFirestore.Timestamp instances for Cloud Functions code that reads
 * and writes through the Admin SDK.
 */

// FirebaseFirestore.Timestamp is available globally through firebase-admin's
// @google-cloud/firestore dependency.

${sectionSource}\n`;
}

async function compileFirestoreAdminType(schema, name, allAdminTypeNames) {
  let types = await compileTs(schema, name);
  // A document may embed another contract twice, such as the public listing
  // projection; both references name the imported contract type.
  types = normalizeTypeReferences(name, types, [
    ...allAdminTypeNames,
    ...schemaSpecs.map((spec) => spec.name)
      .filter((specName) => !allAdminTypeNames.includes(specName)),
  ]);
  return types.trim();
}

function firestoreAdminNamedSchema(spec, profilePhotoPolicy) {
  const file = path.join(contractRoot, spec.source);
  const bundled = applyProfilePhotoPolicy(bundleSchema(file), profilePhotoPolicy);
  const source = spec.pointer ?
    resolveJsonPointer(bundled, spec.pointer) :
    bundled;
  return withAdminTimestamps({
    ...structuredClone(source),
    title: spec.name,
  });
}

function firestoreAdminTypeName(schemaName) {
  return schemaName;
}

function withAdminTimestamps(schema) {
  const cloned = structuredClone(schema);
  replaceSerializedTimestampSchemas(cloned);
  return cloned;
}

function replaceSerializedTimestampSchemas(value) {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      if (isSerializedTimestampSchema(item)) {
        value[i] = {tsType: "FirebaseFirestore.Timestamp"};
      } else {
        replaceSerializedTimestampSchemas(item);
      }
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (isSerializedTimestampSchema(value)) {
    for (const key of Object.keys(value)) delete value[key];
    value.tsType = "FirebaseFirestore.Timestamp";
    return;
  }
  for (const child of Object.values(value)) {
    replaceSerializedTimestampSchemas(child);
  }
}

function isSerializedTimestampSchema(value) {
  if (!value || typeof value !== "object" || value.type !== "object") {
    return false;
  }
  const properties = value.properties;
  if (!properties || typeof properties !== "object") return false;
  return Boolean(
    properties._seconds?.type === "integer" &&
    properties._nanoseconds?.type === "integer"
  );
}

function stripInternalDemoFields(schema) {
  const fields = schema["x-internal-demo-fields"];
  if (!Array.isArray(fields) || !schema.properties) return;
  for (const field of fields) {
    delete schema.properties[field];
  }
  if (Array.isArray(schema.required)) {
    schema.required = schema.required.filter((field) => !fields.includes(field));
  }
}

function stripTopLevelStructuralValidation(schema) {
  delete schema.anyOf;
  delete schema.oneOf;
  delete schema.allOf;
}

function applyFirestoreAdminFieldOverrides(schema, typeName) {
  if (!schema.properties) return;
  for (const [key, tsType] of FIRESTORE_ADMIN_FIELD_OVERRIDES) {
    const [targetTypeName, fieldName] = key.split(".");
    if (targetTypeName !== typeName || !schema.properties[fieldName]) {
      continue;
    }
    schema.properties[fieldName] = {tsType};
  }
}

function applyFirestoreAdminOptionalFields(schema, typeName) {
  const fields = FIRESTORE_ADMIN_OPTIONAL_FIELDS.get(typeName);
  if (!fields || !Array.isArray(schema.required)) return;
  schema.required = schema.required.filter((field) => !fields.includes(field));
}

function normalizeTypeReferences(currentTypeName, source, typeNames) {
  let normalized = source;
  for (const name of typeNames) {
    if (currentTypeName === name) continue;
    normalized = normalized.replace(
      new RegExp(`\\b${name}\\d+\\b`, "g"),
      name
    );
  }
  return normalized;
}

function normalizeExternalTypeReferences(currentTypeName, source) {
  return normalizeTypeReferences(
    currentTypeName,
    source,
    schemaSpecs.map((spec) => spec.name)
  );
}

function tsTypeImports(currentTypeName, source) {
  const imports = [];
  const typeSource = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  for (const spec of schemaSpecs) {
    if (currentTypeName === spec.name) continue;
    const pattern = new RegExp(`\\b${spec.name}\\b`);
    if (!pattern.test(typeSource)) continue;
    imports.push(`import type {${spec.name}} from "${typeImportPath(spec)}";`);
  }
  return imports.length === 0 ? "" : `${imports.join("\n")}\n\n`;
}

function addTextOutput(relativePath, content) {
  generatedFiles.push({path: relativePath, content});
}

function schemaRegistryEntries(schemaMap) {
  return schemaSpecs.map((spec) => [
    schemaConstName(spec),
    schemaMap.get(spec.name),
  ]);
}

function schemaConstName(spec) {
  return `${spec.name.charAt(0).toLowerCase()}${spec.name.slice(1)}Schema`;
}

function validatorName(spec) {
  return `validate${spec.name}`;
}

function typeImportPath(spec) {
  return `./${path.basename(spec.typeOutput, ".ts")}`;
}

function runtimeSchemaModuleName(spec) {
  return path.basename(spec.typeOutput, ".ts")
    .replace(/CallablePayload$/, "Input")
    .replace(/CallableResponse$/, "Output");
}

function renderTsSchemaModules({
  schemaMap,
  runtimeValidators,
  eventAssistanceCatalog,
  eventAssistanceCommandBindingCatalog,
  profileCatalog,
  personFieldCatalog,
  organizerFormTemplateCatalog,
  hostAttentionPolicyCatalog,
  organizerEntitlementSkuCatalog,
  photoCatalog,
  profilePhotoPolicy,
}) {
  const moduleNames = new Set();
  for (const spec of schemaSpecs) {
    const key = runtimeSchemaModuleName(spec);
    if (moduleNames.has(key)) throw new Error(`Duplicate runtime schema module: ${key}`);
    moduleNames.add(key);
    if (!runtimeValidators.has(spec.name)) continue;
    const name = schemaConstName(spec);
    const module = runtimeSchemaModuleName(spec);
    addTextOutput(
      `functions/src/shared/generated/schemas/${module}.ts`,
      `${tsGeneratedHeader()}export const ${name}: Record<string, unknown> = ` +
        `${jsonForTs(schemaMap.get(spec.name))};\n`
    );
  }
  const catalogEntries = [
    ["eventAssistanceWorkflowCatalog", eventAssistanceCatalog],
    ["eventAssistanceCommandBindingCatalog",
      eventAssistanceCommandBindingCatalog],
    ["profilePromptCatalog", profileCatalog],
    ["personFieldCatalog", personFieldCatalog],
    ["organizerFormTemplateCatalog", organizerFormTemplateCatalog],
    ["hostAttentionPolicyCatalog", hostAttentionPolicyCatalog],
    ["organizerEntitlementSkuCatalog", organizerEntitlementSkuCatalog],
    ["photoPromptCatalog", photoCatalog],
    ["profilePromptLimits", profileCatalog.limits],
    ["photoPromptLimits", photoCatalog.limits],
    ["profilePhotoPolicy", profilePhotoPolicy],
    ["defaultProfilePromptIds", profileCatalog.defaultPromptIds],
  ];
  for (const [name, value] of catalogEntries) {
    addTextOutput(
      `functions/src/shared/generated/catalogs/${name}.ts`,
      `${tsGeneratedHeader()}export const ${name} = ${jsonForTs(value)};\n`
    );
  }
  retiredOutputs.push("functions/src/shared/generated/schemaRegistry.ts");
}

function renderTsValidators(runtimeValidators) {
  for (const spec of schemaSpecs) {
    if (!runtimeValidators.has(spec.name)) continue;
    const module = runtimeSchemaModuleName(spec);
    const schema = schemaConstName(spec);
    const validator = validatorName(spec);
    addTextOutput(
      `functions/src/shared/generated/validators/${module}.ts`,
      `${tsGeneratedHeader()}import type {${spec.name}} from ".${typeImportPath(spec)}";\n` +
        `import {${schema}} from "../schemas/${module}";\n` +
        `import {lazyValidator} from "../schemaValidationRuntime";\n\n` +
        `export const ${validator} =\n` +
        `  lazyValidator<${spec.name}>(${schema});\n`
    );
  }
  addTextOutput(
    "functions/src/shared/generated/schemaValidationRuntime.ts",
    renderTsValidationRuntime()
  );
  retiredOutputs.push("functions/src/shared/generated/schemaValidators.ts");
}

function renderTsValidationRuntime() {
  return `${tsGeneratedHeader()}import Ajv from "ajv";
import type {ValidateFunction} from "ajv";
import addFormats from "ajv-formats";

const ajv = new Ajv({allErrors: true, strict: false});
addFormats(ajv);

export function lazyValidator<T>(
  schema: Record<string, unknown>
): ValidateFunction<T> {
  let compiled: ValidateFunction<T> | null = null;
  const validate = ((data: unknown) => {
    compiled ??= ajv.compile(schema) as ValidateFunction<T>;
    return compiled(data);
  }) as ValidateFunction<T>;
  Object.defineProperty(validate, "errors", {
    get: () => compiled?.errors ?? null,
  });
  return validate;
}

export function schemaErrorMessages(
  validator: ValidateFunction<unknown>
): string[] {
  return (validator.errors ?? []).map((error) => {
    const location = error.instancePath || "/";
    return \`\${location} \${error.message ?? "failed validation"}\`;
  });
}
`;
}

function renderTsPathConstants({
  profileDecisionSchema,
  profileDecisionMigration,
}) {
  const pathParts = profileDecisionPathParts(profileDecisionSchema);
  const futurePathParts = profileDecisionPathParts(
    profileDecisionMigration?.candidatePrimaryStoragePath
  );
  return `${tsGeneratedHeader()}export const schemaProfileDecisionLogicalName =
  ${JSON.stringify(profileDecisionSchema["x-logical-name"] ?? "profileDecision")};
export const schemaProfileDecisionPathTemplate =
  ${JSON.stringify(pathParts.pathTemplate)};
export const schemaProfileDecisionTriggerPath =
  ${JSON.stringify(pathParts.triggerPath)};
export const schemaProfileDecisionCollectionPath =
  ${JSON.stringify(pathParts.collectionPath)};
export const schemaProfileDecisionOutgoingSubcollectionPath =
  ${JSON.stringify(pathParts.outgoingSubcollectionPath)};
export const schemaProfileDecisionFuturePathTemplate =
  ${JSON.stringify(futurePathParts.pathTemplate)};
export const schemaProfileDecisionFutureCollectionPath =
  ${JSON.stringify(futurePathParts.collectionPath)};
export const schemaProfileDecisionFutureOutgoingSubcollectionPath =
  ${JSON.stringify(futurePathParts.outgoingSubcollectionPath)};
`;
}

function renderToolSchemaRegistry({
  schemaMap,
  eventAssistanceCatalog,
  eventAssistanceCommandBindingCatalog,
  profileCatalog,
  personFieldCatalog,
  organizerFormTemplateCatalog,
  hostAttentionPolicyCatalog,
  organizerEntitlementSkuCatalog,
  photoCatalog,
  profilePhotoPolicy,
}) {
  const entries = schemaRegistryEntries(schemaMap);
  const catalogEntries = [
    ["eventAssistanceWorkflowCatalog", eventAssistanceCatalog],
    ["eventAssistanceCommandBindingCatalog",
      eventAssistanceCommandBindingCatalog],
    ["profilePromptCatalog", profileCatalog],
    ["personFieldCatalog", personFieldCatalog],
    ["organizerFormTemplateCatalog", organizerFormTemplateCatalog],
    ["hostAttentionPolicyCatalog", hostAttentionPolicyCatalog],
    ["organizerEntitlementSkuCatalog", organizerEntitlementSkuCatalog],
    ["photoPromptCatalog", photoCatalog],
    ["profilePromptLimits", profileCatalog.limits],
    ["photoPromptLimits", photoCatalog.limits],
    ["profilePhotoPolicy", profilePhotoPolicy],
    ["defaultProfilePromptIds", profileCatalog.defaultPromptIds],
  ];
  return `${mjsGeneratedHeader()}${entries.map(([name, schema]) =>
    `export const ${name} = ${jsonForJs(schema)};\n`
  ).join("\n")}\n${catalogEntries.map(([name, value]) =>
    `export const ${name} = ${jsonForJs(value)};\n`
  ).join("\n")}`;
}

function renderToolValidators() {
  const schemaImports = schemaSpecs.map((spec) =>
    `  ${schemaConstName(spec)},`
  ).join("\n");
  const validators = schemaSpecs.map((spec) =>
    `export const ${validatorName(spec)} = ajv.compile(${schemaConstName(spec)});`
  ).join("\n");

  return `${mjsGeneratedHeader()}import {createRequire} from "node:module";
import {
${schemaImports}
} from "./schema_contract_registry.mjs";

const requireFromRepo = createRequire(
  new URL("../../../package.json", import.meta.url)
);
const requireFromFunctions = createRequire(
  new URL("../../../functions/package.json", import.meta.url)
);

function requireContractDependency(name) {
  try {
    return requireFromRepo(name);
  } catch (error) {
    if (error?.code !== "MODULE_NOT_FOUND") throw error;
    return requireFromFunctions(name);
  }
}

const Ajv = requireContractDependency("ajv");
const addFormats = requireContractDependency("ajv-formats");

const ajv = new Ajv({allErrors: true, strict: false});
addFormats(ajv);

${validators}

export function schemaErrorMessages(validator) {
  return (validator.errors ?? []).map((error) => {
    const location = error.instancePath || "/";
    return \`\${location} \${error.message ?? "failed validation"}\`;
  });
}

export function assertValidSchemaPayload(validator, payload, label) {
  if (validator(payload)) return;
  const details = schemaErrorMessages(validator).join("; ");
  throw new Error(\`\${label} failed schema validation: \${details}\`);
}
`;
}

function renderWebsiteJoinWaitlistSchemas({requestSchema, responseSchema}) {
  return `${tsGeneratedHeader()}` +
`export const joinWaitlistRequestSchema: Record<string, unknown> =
  ${jsonForTs(requestSchema)};

export const joinWaitlistResponseSchema: Record<string, unknown> =
  ${jsonForTs(responseSchema)};
`;
}

function renderDartContracts({
  profileCatalog,
  personFieldCatalog,
  photoCatalog,
  profilePhotoPolicy,
  profilePromptSchema,
  photoPromptSchema,
  profilePhotoSchema,
  updateUserProfileSchema,
  profileDecisionSchema,
  profileDecisionMigration,
  commonSchema,
}) {
  const profileLimits = profileCatalog.limits;
  const photoLimits = photoCatalog.limits;
  const height = commonSchema.definitions.heightCm;
  const profileDecisionPath = profileDecisionPathParts(profileDecisionSchema);
  const profileDecisionFuturePath = profileDecisionPathParts(
    profileDecisionMigration?.candidatePrimaryStoragePath
  );
  const preferredAge = updateUserProfileSchema.properties.fields.properties
    .minAgePreference;
  const profilePrompts = profileCatalog.prompts.map((prompt) =>
    `  SchemaProfilePromptDefinition(` +
    `id: ${dartString(prompt.id)}, ` +
    `title: ${dartString(prompt.title)}, ` +
    `placeholder: ${dartString(prompt.placeholder)},` +
    `),`
  ).join("\n");
  const photoPrompts = photoCatalog.prompts.map((prompt) =>
    `  SchemaPhotoPromptDefinition(` +
    `id: ${dartString(prompt.id)}, ` +
    `title: ${dartString(prompt.title)}, ` +
    `placeholder: ${dartString(prompt.placeholder)},` +
    `),`
  ).join("\n");
  const defaultPromptIds = profileCatalog.defaultPromptIds
    .map((id) => `  ${dartString(id)},`)
    .join("\n");
  const personFields = personFieldCatalog.fields.map((field) =>
    `  SchemaPersonFieldDefinition(` +
    `id: ${dartString(field.id)}, ` +
    `aliases: <String>[${field.aliases.map(dartString).join(", ")}], ` +
    `questionKind: ${dartString(field.questionKind)}, ` +
    `transform: ${dartString(field.transform)}, ` +
    `privacyClass: ${dartString(field.privacyClass)}, ` +
    `prefillPolicy: ${dartString(field.prefillPolicy)}, ` +
    `hostPresentation: ${dartString(field.hostPresentation)}, ` +
    `authority: ${dartString(field.authority)}, ` +
    `privateProfilePath: ${dartLiteral(field.privateProfilePath)}, ` +
    `derivedFrom: ${dartLiteral(field.derivedFrom)}, ` +
    `publicProfileProjection: ` +
    `${dartString(field.publicProfileProjection)}, ` +
    `publicProfilePath: ${dartLiteral(field.publicProfilePath)},` +
    `),`
  ).join("\n");
  const personFieldAliases = personFieldCatalog.fields.flatMap((field) =>
    field.aliases.map((alias) =>
      `  ${dartString(alias)}: ${dartString(field.id)},`
    )
  ).join("\n");

  return `${dartGeneratedHeader()}
class SchemaProfilePromptDefinition {
  const SchemaProfilePromptDefinition({
    required this.id,
    required this.title,
    required this.placeholder,
  });

  final String id;
  final String title;
  final String placeholder;
}

class SchemaPhotoPromptDefinition {
  const SchemaPhotoPromptDefinition({
    required this.id,
    required this.title,
    required this.placeholder,
  });

  final String id;
  final String title;
  final String placeholder;
}

class SchemaPersonFieldDefinition {
  const SchemaPersonFieldDefinition({
    required this.id,
    required this.aliases,
    required this.questionKind,
    required this.transform,
    required this.privacyClass,
    required this.prefillPolicy,
    required this.hostPresentation,
    required this.authority,
    required this.privateProfilePath,
    required this.derivedFrom,
    required this.publicProfileProjection,
    required this.publicProfilePath,
  });

  final String id;
  final List<String> aliases;
  final String questionKind;
  final String transform;
  final String privacyClass;
  final String prefillPolicy;
  final String hostPresentation;
  final String authority;
  final String? privateProfilePath;
  final String? derivedFrom;
  final String publicProfileProjection;
  final String? publicProfilePath;
}

const schemaPersonFieldOrganizerAccessPolicy = ${dartString(
  personFieldCatalog.organizerAccessPolicy
)};
const schemaPersonFieldPublicProfileMetadataPolicy = ${dartString(
  personFieldCatalog.publicProfileMetadataPolicy
)};
const schemaPersonFieldTabularChoiceImportPolicy = ${dartString(
  personFieldCatalog.tabularChoiceImportPolicy
)};

const schemaProfilePromptPerfectEventId = ${dartString(
  profileCatalog.defaultPromptIds[0]
)};
const schemaMaxProfilePromptAnswers = ${profileLimits.maxAnswers};
const schemaMaxPhotoPromptCaptions = ${photoLimits.maxCaptions};
const schemaMinimumProfilePhotos = ${profilePhotoPolicy.minPhotos};
const schemaMaximumProfilePhotos = ${profilePhotoPolicy.maxPhotos};
const schemaProfilePhotoAspectRatioWidth =
    ${profilePhotoPolicy.displayAspectRatio.width};
const schemaProfilePhotoAspectRatioHeight =
    ${profilePhotoPolicy.displayAspectRatio.height};
const schemaProfilePhotoThumbnailSize = ${profilePhotoPolicy.thumbnailSize};
const schemaProfilePhotoMaxUploadBytes = ${profilePhotoPolicy.maxUploadBytes};
const schemaMaximumProfilePromptAnswerLength =
    ${profileLimits.maxAnswerLength};
const schemaMaximumPhotoPromptCaptionLength = ${photoLimits.maxCaptionLength};
const schemaMinimumProfileAge = ${preferredAge.minimum};
const schemaMaximumPreferredMatchAge = ${preferredAge.maximum};
const schemaMinimumHeightCm = ${height.minimum};
const schemaMaximumHeightCm = ${height.maximum};
const schemaProfileDecisionLogicalName =
    ${dartString(profileDecisionSchema["x-logical-name"] ?? "profileDecision")};
const schemaProfileDecisionPathTemplate =
    ${dartString(profileDecisionPath.pathTemplate)};
const schemaProfileDecisionCollectionPath =
    ${dartString(profileDecisionPath.collectionPath)};
const schemaProfileDecisionOutgoingSubcollectionPath =
    ${dartString(profileDecisionPath.outgoingSubcollectionPath)};
const schemaProfileDecisionFuturePathTemplate =
    ${dartString(profileDecisionFuturePath.pathTemplate)};
const schemaProfileDecisionFutureCollectionPath =
    ${dartString(profileDecisionFuturePath.collectionPath)};
const schemaProfileDecisionFutureOutgoingSubcollectionPath =
    ${dartString(profileDecisionFuturePath.outgoingSubcollectionPath)};

const schemaDefaultProfilePromptIds = <String>[
${defaultPromptIds}
];

const schemaProfilePromptCatalog = <SchemaProfilePromptDefinition>[
${profilePrompts}
];

const schemaPhotoPromptCatalog = <SchemaPhotoPromptDefinition>[
${photoPrompts}
];

const schemaPersonFieldCatalog = <SchemaPersonFieldDefinition>[
${personFields}
];

const schemaPersonFieldIdByNormalizedAlias = <String, String>{
${personFieldAliases}
};

String? schemaPersonFieldIdForNormalizedAlias(String alias) =>
    schemaPersonFieldIdByNormalizedAlias[alias];

SchemaPersonFieldDefinition? schemaPersonFieldForId(String id) {
  for (final field in schemaPersonFieldCatalog) {
    if (field.id == id) return field;
  }
  return null;
}

const schemaProfilePromptAnswerSchema = ${dartLiteral(profilePromptSchema)};

const schemaPhotoPromptAnswerSchema = ${dartLiteral(photoPromptSchema)};

const schemaProfilePhotoSchema = ${dartLiteral(profilePhotoSchema)};

const schemaUpdateUserProfileCallablePayloadSchema =
    ${dartLiteral(updateUserProfileSchema)};
`;
}

// Retired output: Dart tests read contracts/ directly. Check mode still
// reports leftovers here and publishing removes the directory.
const DART_SCHEMA_OUTPUT_DIR = "lib/platform/schema_contracts/generated/schemas";

function renderDartFieldConstraints({schemaSpecs, schemaMap, bindings}) {
  const projected = [];
  for (const spec of schemaSpecs) {
    const schema = schemaMap.get(spec.name);
    if (!schema) continue;

    const patchConfig = schema["x-callable-shape"] === "patch" ?
      dartPatchClassConfig(spec.name) :
      null;
    const rootName = lowerCamelCase(patchConfig?.className ?? spec.name);
    const rootSchema = patchConfig ? schema.properties?.fields : schema;
    if (!rootSchema || typeof rootSchema !== "object") continue;
    collectFieldConstraints({
      schema: rootSchema,
      rootName,
      segments: [],
      constraints: projected,
    });
  }

  projected.sort((a, b) => a.path.localeCompare(b.path));
  // Names are settled against every projected field so a binding keeps the
  // same constant name however many other fields are declared.
  disambiguateFieldConstraintNames(projected);
  const constraints = boundFieldConstraints(projected, bindings);
  const declarations = constraints.map((entry) => {
    const args = [
      `path: ${dartString(entry.path)}`,
      entry.maxLength == null ? null : `maxLength: ${entry.maxLength}`,
      entry.minLength == null ? null : `minLength: ${entry.minLength}`,
      entry.required ? "required: true" : null,
      entry.valueTypes == null ? null :
        `valueTypes: <String>[${entry.valueTypes.map(dartString).join(", ")}]`,
      entry.format == null ? null : `format: ${dartString(entry.format)}`,
      entry.pattern == null ? null : `pattern: ${dartString(entry.pattern)}`,
      entry.enumValues == null ? null :
        `enumValues: <String>[${entry.enumValues.map(dartString).join(", ")}]`,
      entry.itemValueTypes == null ? null :
        `itemValueTypes: <String>[${
          entry.itemValueTypes.map(dartString).join(", ")
        }]`,
      entry.itemEnumValues == null ? null :
        `itemEnumValues: <String>[${
          entry.itemEnumValues.map(dartString).join(", ")
        }]`,
      entry.minItems == null ? null : `minItems: ${entry.minItems}`,
      entry.maxItems == null ? null : `maxItems: ${entry.maxItems}`,
      entry.uniqueItems ? "uniqueItems: true" : null,
      entry.minimum == null ? null : `minimum: ${entry.minimum}`,
      entry.maximum == null ? null : `maximum: ${entry.maximum}`,
      entry.multipleOf == null ? null : `multipleOf: ${entry.multipleOf}`,
    ].filter(Boolean);
    return `  static const ${entry.constName} = CatchContractFieldConstraints(\n` +
      `${args.map((arg) => `    ${arg},`).join("\n")}\n` +
      "  );";
  }).join("\n\n");
  const allEntries = constraints.map((entry) =>
    `    ${dartString(entry.path)}: ${entry.constName},`
  ).join("\n");

  return `${dartGeneratedHeader()}
import 'package:catch_ui/catch_ui.dart' show CatchContractFieldConstraints;

/// App-owned field constraints for the schema fields that app forms bind to,
/// as declared in contracts/forms/field_constraint_bindings.json.

abstract final class CatchContractConstraints {
${declarations}

  static const all = <String, CatchContractFieldConstraints>{
${allEntries}
  };
}
`;
}

/**
 * Keeps the projected constraints a form binds to. Bindings are the declared
 * source of truth, so the generator never reads app code; an undeclared field
 * fails the app's analyzer, and a binding that names no schema field fails
 * here.
 */
export function boundFieldConstraints(projected, bindings) {
  const byPath = new Map(projected.map((entry) => [entry.path, entry]));
  const bound = new Map();
  const unresolved = [];
  for (const [root, fieldPaths] of Object.entries(bindings.fields ?? {})) {
    for (const fieldPath of fieldPaths) {
      const entry = byPath.get(`${root}.${fieldPath}`);
      if (entry) bound.set(entry.path, entry);
      else unresolved.push(`${root}.${fieldPath}`);
    }
  }
  for (const prefix of bindings.lookupPrefixes ?? []) {
    const matches = projected.filter((entry) => entry.path.startsWith(prefix));
    if (matches.length === 0) unresolved.push(`${prefix}*`);
    for (const entry of matches) bound.set(entry.path, entry);
  }
  if (unresolved.length > 0) {
    throw new Error(
      "contracts/forms/field_constraint_bindings.json names fields no " +
      `schema projects:\n${unresolved.map((item) => `- ${item}`).join("\n")}`
    );
  }
  return [...bound.values()].sort((a, b) => a.path.localeCompare(b.path));
}

function disambiguateFieldConstraintNames(constraints) {
  const entriesByName = new Map();
  for (const entry of constraints) {
    const entries = entriesByName.get(entry.constName) ?? [];
    entries.push(entry);
    entriesByName.set(entry.constName, entries);
  }

  const usedNames = new Set(
    constraints
      .filter((entry) => entriesByName.get(entry.constName)?.length === 1)
      .map((entry) => entry.constName),
  );
  for (const entries of entriesByName.values()) {
    if (entries.length === 1) continue;
    for (const entry of entries) {
      const pathSuffix = entry.segments.map(pascalCase).join("Property");
      const candidate = `${entry.constName}At${pathSuffix}`;
      let uniqueName = candidate;
      let suffix = 2;
      while (usedNames.has(uniqueName)) {
        uniqueName = `${candidate}${suffix}`;
        suffix += 1;
      }
      entry.constName = uniqueName;
      usedNames.add(uniqueName);
    }
  }
}

function collectFieldConstraints({schema, rootName, segments, constraints}) {
  const objectSchema = constraintObjectSchema(schema);
  const properties = objectSchema?.properties;
  if (!properties || typeof properties !== "object") return;
  const requiredFields = new Set(objectSchema.required ?? []);

  for (const [fieldName, fieldSchema] of Object.entries(properties)) {
    const nextSegments = [...segments, fieldName];
    const nestedObject = constraintObjectSchema(fieldSchema);
    if (nestedObject?.properties) {
      collectFieldConstraints({
        schema: nestedObject,
        rootName,
        segments: nextSegments,
        constraints,
      });
      continue;
    }

    const projected = projectFieldConstraint(
      fieldSchema,
      requiredFields.has(fieldName)
    );
    if (projected) {
      const path = `${rootName}.${nextSegments.join(".")}`;
      constraints.push({
        ...projected,
        path,
        segments: nextSegments,
        constName: `${rootName}${nextSegments.map(pascalCase).join("")}`,
      });
    }

    const itemObject = constraintObjectSchema(fieldSchema?.items);
    if (itemObject?.properties) {
      collectFieldConstraints({
        schema: itemObject,
        rootName,
        segments: [...nextSegments, "items"],
        constraints,
      });
    } else if (fieldSchema?.items && typeof fieldSchema.items === "object") {
      const itemConstraint = projectFieldConstraint(fieldSchema.items, true);
      if (itemConstraint) {
        const itemSegments = [...nextSegments, "items"];
        constraints.push({
          ...itemConstraint,
          path: `${rootName}.${itemSegments.join(".")}`,
          segments: itemSegments,
          constName: `${rootName}${itemSegments.map(pascalCase).join("")}`,
        });
      }
    }
  }
}

function constraintObjectSchema(schema) {
  if (!schema || typeof schema !== "object") return null;
  if (schema.type === "object" || schema.properties) return schema;
  const objectBranches = [...(schema.anyOf ?? []), ...(schema.oneOf ?? [])]
    .filter((branch) => branch?.type === "object" || branch?.properties);
  if (objectBranches.length === 0) return null;
  return {
    properties: Object.assign(
      {},
      ...objectBranches.map((branch) => branch.properties ?? {}),
    ),
    required: [...new Set(
      objectBranches.flatMap((branch) => branch.required ?? []),
    )],
  };
}

function projectFieldConstraint(schema, parentRequired) {
  const branches = [schema, ...(schema?.anyOf ?? []), ...(schema?.oneOf ?? [])]
    .filter((branch) => branch && typeof branch === "object");
  const values = (key) => branches
    .map((branch) => branch[key])
    .filter((value) => value != null);
  const numberValue = (key, choose) => {
    const candidates = values(key).filter((value) => typeof value === "number");
    return candidates.length === 0 ? null : choose(...candidates);
  };
  const stringValues = values("pattern")
    .filter((value) => typeof value === "string");
  const patterns = [...new Set(stringValues)];
  const enumValues = [...new Set(
    branches.flatMap((branch) => Array.isArray(branch.enum) ? branch.enum : [])
      .filter((value) => typeof value === "string")
  )];
  const types = [...new Set(branches.flatMap((branch) => Array.isArray(branch.type) ?
    branch.type :
    [branch.type]
  ).filter((value) => typeof value === "string"))];
  const valueTypes = types.filter((type) => type !== "null");
  const formats = [...new Set(values("format")
    .filter((value) => typeof value === "string"))];
  const itemBranches = branches.flatMap((branch) => {
    const items = branch.items;
    if (!items || Array.isArray(items) || typeof items !== "object") return [];
    return [items, ...(items.anyOf ?? []), ...(items.oneOf ?? [])]
      .filter((item) => item && typeof item === "object");
  });
  const itemValueTypes = [...new Set(itemBranches.flatMap((item) =>
    Array.isArray(item.type) ? item.type : [item.type]
  ).filter((value) => typeof value === "string" && value !== "null"))];
  const itemEnumValues = [...new Set(itemBranches.flatMap((item) =>
    Array.isArray(item.enum) ? item.enum : []
  ).filter((value) => typeof value === "string"))];
  const allowsNull = types.includes("null") ||
    branches.some((branch) => branch.const === null);
  const allowsEmpty = branches.some((branch) => branch.const === "") ||
    branches.some((branch) => branch.minLength === 0);
  const minLength = numberValue("minLength", Math.min);
  const maxLength = numberValue("maxLength", Math.max);
  const required = (parentRequired || (minLength ?? 0) > 0) &&
    !allowsNull && !allowsEmpty;
  const result = {
    maxLength,
    minLength,
    required,
    valueTypes: valueTypes.length > 0 ? valueTypes : null,
    format: formats.length === 1 ? formats[0] : null,
    pattern: patterns.length === 1 ? patterns[0] : null,
    enumValues: enumValues.length > 0 ? enumValues : null,
    itemValueTypes: itemValueTypes.length > 0 ? itemValueTypes : null,
    itemEnumValues: itemEnumValues.length > 0 ? itemEnumValues : null,
    minItems: numberValue("minItems", Math.min),
    maxItems: numberValue("maxItems", Math.max),
    uniqueItems: values("uniqueItems").includes(true),
    minimum: numberValue("minimum", Math.min),
    maximum: numberValue("maximum", Math.max),
    multipleOf: numberValue("multipleOf", Math.min),
  };
  return Object.values(result).some((value) => value != null && value !== false) ?
    result :
    null;
}

function lowerCamelCase(value) {
  const converted = pascalCase(value);
  return converted.length === 0 ? converted :
    `${converted[0].toLowerCase()}${converted.slice(1)}`;
}

function renderGeneratedIndex({dartCallableRequests, runtimeModules}) {
  const tsRows = schemaSpecs.filter((spec) => runtimeModules.types.has(spec.name))
    .map((spec) =>
      `| ${spec.name} | \`${spec.source}\` | \`${spec.typeOutput}\` | ` +
      `${runtimeModules.validators.has(spec.name) ? "yes" : "no"} |`
    ).join("\n");
  const callableRows = dartCallableRequests.generatedClasses.length === 0 ?
    "| _None_ | _None_ | _None_ | _None_ |" :
    dartCallableRequests.generatedClasses.map((entry) =>
      `| ${entry.className} | ${entry.schemaName} | ` +
      `\`${entry.source}\` | \`${entry.output}\` |`
    ).join("\n");
  const ungenerableRows = dartCallableRequests.ungenerable.length === 0 ?
    "| _None_ | _None_ |" :
    dartCallableRequests.ungenerable.map((entry) =>
      `| ${entry.name} | ${entry.reason} |`
    ).join("\n");

  return `${markdownGeneratedHeader()}# Generated Schema Contracts Index

This file is generated by \`tool/contracts/generate_schema_contracts.mjs\`.
Do not edit it by hand.

## Functions Runtime Types

Only the contracts declared in \`contracts/functions/runtime_modules.json\`
(and the types they depend on) are emitted. Tests read the others at test time.

| Generated Type | Source Schema | Output | Validator Module |
|---|---|---|---|
${tsRows}

## Dart Callable Classes

| Generated Class | Schema Name | Source Schema | Output |
|---|---|---|---|
${callableRows}

## Callable Schemas Still Hand-Written In Dart

| Schema | Reason |
|---|---|
${ungenerableRows}

## Registry And Validator Outputs

| Output | Purpose |
|---|---|
| \`functions/src/shared/generated/schemas/*.ts\`, \`validators/*.ts\` | One schema constant and lazy Ajv validator per declared runtime validator. |
| \`functions/src/shared/generated/schemaValidationRuntime.ts\` | Shared Ajv options, formats and lazy compilation for those validators. |
| \`functions/src/shared/generated/firestoreAdminTypes.ts\` | Admin SDK Timestamp-aware Firestore projection types. |
| \`functions/src/shared/generated/schemaPaths.ts\` | Generated storage/path constants for migrated logical paths. |
| \`tool/contracts/generated/schema_contract_registry.mjs\` | Node-side schema registry for validation tooling. |
| \`tool/contracts/generated/schema_contract_validators.mjs\` | Node-side Ajv validators for contract checks. |
| \`lib/platform/schema_contracts/generated/profile_schema_contracts.g.dart\` | Dart profile catalog and storage policy constants. |
| \`lib/platform/schema_contracts/generated/field_constraints.g.dart\` | UI constraints for the schema fields declared in \`contracts/forms/field_constraint_bindings.json\`. |
| \`lib/platform/schema_contracts/generated/callable_request_dtos.g.dart\` | Generated Dart callable request and patch helper barrel. |
| \`lib/platform/schema_contracts/generated/callables/*.g.dart\` | One generated Dart callable request or patch helper file per schema-owned class. |
`;
}

// ────────────────────────────────────────────────────────────────────────────
// Dart callable request DTO generation.
//
// Walks every callable payload schema (and the update_user_profile patch),
// emits a Dart class with constructor, fields, and toJson(). Classes for
// schemas that are still too rich (nested objects without inline class
// emission yet, anyOf with multiple non-null branches, etc.) are skipped and
// reported via the `dartUngenerable` list returned alongside the rendered
// text — the caller logs it so contributors see what's still hand-written.
// ────────────────────────────────────────────────────────────────────────────

// Callable schemas whose generated patch helper owns the callable wrapper via
// toCallableJson(), so emitting a separate *CallableRequest would duplicate the
// same payload shape:
//   - schemas with x-callable-shape: patch
//
// Callable schemas where the generator's projection would shadow a
// hand-written class that adds behavior the generator can't reproduce:
//   - EventBookingCallablePayload / CreateRazorpayOrderCallablePayload:
//     hand-written DTOs apply `inviteCode?.trim()` at serialization time.
//     The schemas exist for validation and as the contract source of truth;
//     the Dart classes stay hand-written so the trim normalization remains
//     attached to the boundary.
const DART_CALLABLE_REQUEST_SKIP = new Set([
  "EventBookingCallablePayload",
  "CreateRazorpayOrderCallablePayload",
]);

const DART_CALLABLE_REQUEST_OUTPUT_DIR =
  "lib/platform/schema_contracts/generated/callables";

const DART_CALLABLE_FIELD_OVERRIDES = new Map([
  [
    "CreateClubCallableRequest.hostDefaults",
    {
      dartType: "OrganizerHostDefaults",
      imports: [
        "import 'package:catch_dating_app/contexts/organizers/domain/organizer_host_defaults.dart';",
      ],
      jsonExpression: (name) => `${name}.toJson()`,
      nullableJsonExpression: (name) => `${name}?.toJson()`,
    },
  ],
  [
    "CreateEventCallableRequest.meetingLocation",
    {
      dartType: "EventMeetingLocation",
      imports: [
        "import 'package:catch_dating_app/contexts/events/domain/event_meeting_location.dart';",
      ],
      jsonExpression: (name) => `${name}.toJson()`,
      nullableJsonExpression: (name) => `${name}?.toJson()`,
    },
  ],
  [
    "CreateEventCallableRequest.eventPolicy",
    {
      dartType: "EventPolicyBundle",
      imports: [
        "import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';",
      ],
      jsonExpression: (name) => `${name}.toJson()`,
      nullableJsonExpression: (name) => `${name}?.toJson()`,
    },
  ],
  [
    "CreateEventCallableRequest.privateAccess",
    {
      dartType: "CreateEventPrivateAccess",
      jsonExpression: (name) => `${name}.toJson()`,
      nullableJsonExpression: (name) => `${name}?.toJson()`,
    },
  ],
  [
    "CreateEventCallableRequest.eventFormat",
    {
      dartType: "EventFormatSnapshot",
      imports: [
        "import 'package:catch_dating_app/kernel/activity_taxonomy.dart';",
      ],
      jsonExpression: (name) => `${name}.toJson()`,
      nullableJsonExpression: (name) => `${name}?.toJson()`,
    },
  ],
  [
    "CreateEventCallableRequest.eventSuccessDefaults",
    {
      dartType: "EventSuccessDefaults",
      imports: [
        "import 'package:catch_dating_app/contexts/formats/domain/event_success_defaults.dart';",
      ],
      jsonExpression: (name) => `${name}.toJson()`,
      nullableJsonExpression: (name) => `${name}?.toJson()`,
    },
  ],
  [
    "CreateEventCallableRequest.constraints",
    {
      dartType: "EventConstraints",
      imports: [
        "import 'package:catch_dating_app/contexts/events/domain/event_constraints.dart';",
      ],
      jsonExpression: (name) => `${name}.toJson()`,
      nullableJsonExpression: (name) => `${name}?.toJson()`,
    },
  ],
]);

function renderDartCallableRequestClasses({schemaSpecs, schemaMap, commonSchema}) {
  const files = [];
  const barrelExports = [];
  const ungenerable = [];
  const generatedClasses = [];
  const enumTypesBySignature = dartProfileEnumTypesBySignature(commonSchema);

  for (const spec of schemaSpecs) {
    if (!isCallableRequestSpec(spec)) continue;
    const schema = schemaMap.get(spec.name);
    if (!schema) continue;

    const callableShape = schema["x-callable-shape"];
    const isPatchShape = callableShape === "patch";

    if (isPatchShape) {
      if (!isPatchCallableSchema(schema)) {
        ungenerable.push({
          name: `${spec.name}Patch`,
          reason: "x-callable-shape patch requires a top-level required fields object",
        });
      } else {
        const patchResult = tryEmitDartPatchClass(
          spec,
          schema,
          enumTypesBySignature
        );
        if (patchResult.ok) {
          const output = dartCallableRequestOutputPath(patchResult.className);
          files.push({
            path: output,
            content: renderDartCallableRequestClassFile({
              imports: patchResult.imports,
              schemaSource: spec.source,
              body: patchResult.text,
            }),
          });
          barrelExports.push(dartGeneratedExportPath(output));
          generatedClasses.push({
            className: patchResult.className,
            schemaName: spec.name,
            source: spec.source,
            output,
          });
        } else {
          ungenerable.push({
            name: `${spec.name}Patch`,
            reason: patchResult.reason,
          });
        }
      }
    }

    if (isPatchShape || DART_CALLABLE_REQUEST_SKIP.has(spec.name)) continue;

    const result = tryEmitDartCallableClass(spec, schema);
    if (result.ok) {
      const output = dartCallableRequestOutputPath(result.className);
      files.push({
        path: output,
        content: renderDartCallableRequestClassFile({
          imports: result.imports,
          schemaSource: spec.source,
          body: result.text,
        }),
      });
      barrelExports.push(dartGeneratedExportPath(output));
      for (const className of result.classNames) {
        generatedClasses.push({
          className,
          schemaName: spec.name,
          source: spec.source,
          output,
        });
      }
    } else {
      ungenerable.push({name: spec.name, reason: result.reason});
    }
  }

  const body = barrelExports.length === 0 ?
    "// No callable request classes are currently generatable.\n" :
    [...new Set(barrelExports)]
      .sort()
      .map((item) => `export '${item}';`)
      .join("\n");
  const text = `${dartGeneratedHeader()}
// Typed callable request DTOs emitted from contracts/callables/ and
// contracts/patches/. The toJson() output of each class is validated against
// the corresponding JSON Schema by test/core/callable_dto_contracts_test.dart.
// Patch helper classes are emitted for schemas with x-callable-shape: patch.
// This file is a stable barrel; individual generated classes live under
// lib/platform/schema_contracts/generated/callables/.
//
// Hand-written callable request/response helpers may still exist for schemas
// that need custom normalization or response parsing beyond generated request
// toJson() classes.

${body}
`;

  return {text, files, ungenerable, generatedClasses};
}

function dartCallableRequestOutputPath(className) {
  return `${DART_CALLABLE_REQUEST_OUTPUT_DIR}/${snakeCase(className)}.g.dart`;
}

function dartGeneratedExportPath(outputPath) {
  return outputPath.replace("lib/platform/schema_contracts/generated/", "");
}

function renderDartCallableRequestClassFile({imports, schemaSource, body}) {
  const importBlock = [...(imports ?? [])].sort().join("\n");
  const normalizedBody = body.trimEnd();
  return `${dartGeneratedHeader()}${importBlock ? `${importBlock}\n\n` : ""}
// Typed callable request DTO emitted from ${schemaSource}.
// Re-exported by lib/platform/schema_contracts/generated/callable_request_dtos.g.dart.

${normalizedBody}
`;
}

function isCallableRequestSpec(spec) {
  if (typeof spec.source !== "string") return false;
  if (spec.source.startsWith("callables/")) return true;
  if (spec.source === "patches/update_user_profile.schema.json") return true;
  return false;
}

function isPatchCallableSchema(schema) {
  return schema?.type === "object" &&
    schema?.properties?.fields?.type === "object" &&
    schema?.properties?.fields?.properties &&
    schema?.required?.includes("fields");
}

function tryEmitDartCallableClass(spec, schema) {
  if (schema.type !== "object" || !schema.properties) {
    return {ok: false, reason: "not an object schema"};
  }

  // BlockUserCallablePayload → BlockUserCallableRequest
  // CreateOrganizerCallablePayload → CreateOrganizerCallableRequest
  const className = spec.name.replace(/Payload$/, "Request");
  const required = new Set(schema.required ?? []);

  const fields = [];
  const imports = new Set();
  for (const [fieldName, prop] of Object.entries(schema.properties)) {
    const override = dartCallableFieldOverride(className, fieldName);
    const mapped = override?.dartType ?? mapDartType(prop);
    if (mapped === null) {
      return {
        ok: false,
        reason: `cannot map field "${fieldName}" (${describeSchemaType(prop)})`,
      };
    }
    for (const item of override?.imports ?? []) imports.add(item);
    const isRequired = required.has(fieldName);
    // Optional schema fields ("not in required") map to nullable Dart fields,
    // even when the schema type itself is non-null. JSON-side "omitted" is
    // Dart-side null. The map literal uses `?name` to drop entries when null.
    const dartType = isRequired || mapped.endsWith("?") ? mapped : `${mapped}?`;
    fields.push({
      name: fieldName,
      dartType,
      isRequired,
      jsonExpression: override?.jsonExpression?.(fieldName),
      nullableJsonExpression: override?.nullableJsonExpression?.(fieldName),
    });
  }

  if (fields.length === 0) {
    return {ok: false, reason: "no properties"};
  }

  const extraText = dartCallableExtraClassText(className);
  const text = formatDartCallableClass(className, fields, schema.description);
  const extraClassNames = dartCallableExtraClassNames(className);

  return {
    ok: true,
    className,
    imports,
    classNames: [...extraClassNames, className],
    text: extraText ? `${extraText}\n\n${text}` : text,
  };
}

function dartCallableFieldOverride(className, fieldName) {
  return DART_CALLABLE_FIELD_OVERRIDES.get(`${className}.${fieldName}`) ?? null;
}

function dartCallableExtraClassText(className) {
  if (className !== "CreateEventCallableRequest") return "";
  return `/// Nested private-access payload accepted by createEvent.
final class CreateEventPrivateAccess {
  const CreateEventPrivateAccess({this.inviteCode});

  final String? inviteCode;

  Map<String, Object?> toJson() => {
    'inviteCode': ?inviteCode,
  };
}`;
}

function dartCallableExtraClassNames(className) {
  if (className !== "CreateEventCallableRequest") return [];
  return ["CreateEventPrivateAccess"];
}

function tryEmitDartPatchClass(spec, schema, enumTypesBySignature) {
  const config = dartPatchClassConfig(spec.name);
  if (!config) {
    return {ok: false, reason: "no Dart patch config"};
  }
  const fieldsSchema = schema.properties.fields;
  const patchProperties = fieldsSchema.properties;
  if (!patchProperties || Object.keys(patchProperties).length === 0) {
    return {ok: false, reason: "patch fields object has no properties"};
  }

  const fields = [];
  for (const [fieldName, prop] of Object.entries(patchProperties)) {
    const mapped = mapDartPatchField(fieldName, prop, enumTypesBySignature, config);
    if (mapped === null) {
      return {
        ok: false,
        reason: `cannot map patch field "${fieldName}" (${describeSchemaType(prop)})`,
      };
    }
    fields.push({name: fieldName, ...mapped});
  }

  const callableFields = [];
  const callableRequired = new Set(schema.required ?? []);
  for (const [fieldName, prop] of Object.entries(schema.properties ?? {})) {
    if (fieldName === "fields") continue;
    const mapped = mapDartType(prop);
    if (mapped === null) {
      return {
        ok: false,
        reason: `cannot map callable wrapper field "${fieldName}" (${describeSchemaType(prop)})`,
      };
    }
    const isRequired = callableRequired.has(fieldName);
    const dartType = isRequired || mapped.endsWith("?") ? mapped : `${mapped}?`;
    callableFields.push({
      name: fieldName,
      dartType,
      isRequired,
    });
  }

  return {
    ok: true,
    className: config.className,
    imports: config.imports,
    text: formatDartPatchClass(config, fields, callableFields, schema.description),
  };
}

function dartPatchClassConfig(specName) {
  const className = specName
    .replace(/CallablePayload$/, "")
    .replace(/Payload$/, "") + "Patch";
  switch (specName) {
    case "UpdateUserProfileCallablePayload":
      return {
        className,
        sentinelName: "unsetSentinel",
        jsonValueHelperName: "_updateUserProfilePatchJsonValue",
        includeTimestampJsonHelper: true,
        imports: [
          "import 'package:catch_dating_app/kernel/sentinels.dart';",
          "import 'package:catch_dating_app/contexts/profiles/domain/profile_photo.dart';",
          "import 'package:catch_dating_app/contexts/profiles/domain/profile_prompts.dart';",
          "import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';",
          "import 'package:cloud_firestore/cloud_firestore.dart';",
        ],
        objectFields: new Map([["activityPreferences", "ActivityPreferences"]]),
        listObjectFields: new Map([
          ["profilePrompts", "ProfilePromptAnswer"],
          ["profilePhotos", "ProfilePhoto"],
        ]),
      };
    case "UpdateClubCallablePayload":
      return {
        className,
        sentinelName: "unsetSentinel",
        jsonValueHelperName: "_updateClubPatchJsonValue",
        includeTimestampJsonHelper: false,
        imports: [
          "import 'package:catch_dating_app/kernel/sentinels.dart';",
          "import 'package:catch_dating_app/contexts/organizers/domain/organizer_host_defaults.dart';",
        ],
        objectFields: new Map([["hostDefaults", "OrganizerHostDefaults"]]),
        listObjectFields: new Map(),
      };
    default:
      return null;
  }
}

function dartProfileEnumTypesBySignature(commonSchema) {
  const definitions = commonSchema?.definitions ?? {};
  const typesBySignature = new Map();
  for (const [name, definition] of Object.entries(definitions)) {
    if (!Array.isArray(definition?.enum)) continue;
    const values = definition.enum.filter((value) => value !== null);
    if (values.length === 0 || !values.every((value) => typeof value === "string")) {
      continue;
    }
    typesBySignature.set(enumSignature(values), pascalCase(name));
  }
  return typesBySignature;
}

function mapDartPatchField(fieldName, prop, enumTypesBySignature, config) {
  if (!prop || typeof prop !== "object") return null;
  const nullable = schemaAllowsNull(prop);
  const enumType = dartEnumTypeForSchema(prop, enumTypesBySignature);
  const dateTime = isMillisSinceEpochInteger(prop);
  const list = prop.type === "array" ? mapDartPatchListField(
    fieldName,
    prop,
    enumTypesBySignature,
    config
  ) : null;
  const objectType = config.objectFields.get(fieldName);

  if (list) {
    return {
      paramType: `${list.dartType}?`,
      nullable,
      jsonExpression: `${fieldName}.map((e) => ${list.itemJsonExpression("e")}).toList()`,
      usesJsonValueHelper: list.usesJsonValueHelper,
    };
  }
  if (enumType) {
    return {
      paramType: nullable ? "Object?" : `${enumType}?`,
      nullable,
      jsonExpression: nullable ?
        `(${fieldName} as ${enumType}?)?.name` :
        `${fieldName}.name`,
    };
  }
  if (dateTime) {
    return {
      paramType: "DateTime?",
      nullable,
      jsonExpression: `${fieldName}.millisecondsSinceEpoch`,
    };
  }
  if (objectType) {
    return {
      paramType: `${objectType}?`,
      nullable,
      jsonExpression: `${fieldName}.toJson()`,
    };
  }

  const scalarType = dartScalarPatchType(prop);
  if (scalarType) {
    return {
      paramType: nullable ? "Object?" : `${scalarType}?`,
      nullable,
      jsonExpression: nullable ? fieldName : fieldName,
    };
  }

  return null;
}

function mapDartPatchListField(fieldName, prop, enumTypesBySignature, config) {
  const items = prop.items;
  if (!items || typeof items !== "object") return null;
  const enumType = dartEnumTypeForSchema(items, enumTypesBySignature);
  if (enumType) {
    return {
      dartType: `List<${enumType}>`,
      itemJsonExpression: (value) => `${value}.name`,
    };
  }
  const objectType = config.listObjectFields.get(fieldName);
  if (objectType) {
    return {
      dartType: `List<${objectType}>`,
      itemJsonExpression: (value) =>
        `${config.jsonValueHelperName}(${value}.toJson())`,
      usesJsonValueHelper: true,
    };
  }
  const scalarType = dartScalarPatchType(items);
  if (scalarType) {
    return {
      dartType: `List<${scalarType}>`,
      itemJsonExpression: (value) => value,
    };
  }
  return null;
}

function dartScalarPatchType(prop) {
  if (!prop || typeof prop !== "object") return null;
  if (Array.isArray(prop.type)) {
    const nonNull = prop.type.filter((value) => value !== "null");
    if (nonNull.length !== 1) return null;
    return dartScalarPatchType({...prop, type: nonNull[0]});
  }
  if (Array.isArray(prop.anyOf) && !prop.type) {
    const nonNull = prop.anyOf.filter((item) => item?.type !== "null");
    const scalarTypes = new Set(nonNull.map(dartScalarPatchType).filter(Boolean));
    return scalarTypes.size === 1 ? [...scalarTypes][0] : null;
  }
  if (Object.hasOwn(prop, "const")) {
    if (typeof prop.const === "string") return "String";
    if (typeof prop.const === "number") {
      return Number.isInteger(prop.const) ? "int" : "double";
    }
    if (typeof prop.const === "boolean") return "bool";
  }
  switch (prop.type) {
    case "string": return "String";
    case "integer": return "int";
    case "number": return "double";
    case "boolean": return "bool";
    default: return null;
  }
}

function dartEnumTypeForSchema(prop, enumTypesBySignature) {
  if (!prop || typeof prop !== "object") return null;
  if (Array.isArray(prop.enum)) {
    const values = prop.enum.filter((value) => value !== null);
    if (values.length > 0 && values.every((value) => typeof value === "string")) {
      return enumTypesBySignature.get(enumSignature(values)) ?? null;
    }
  }
  if (Array.isArray(prop.anyOf)) {
    for (const item of prop.anyOf) {
      const type = dartEnumTypeForSchema(item, enumTypesBySignature);
      if (type) return type;
    }
  }
  return null;
}

function schemaAllowsNull(prop) {
  if (!prop || typeof prop !== "object") return false;
  if (Array.isArray(prop.type) && prop.type.includes("null")) return true;
  if (Array.isArray(prop.enum) && prop.enum.includes(null)) return true;
  if (Array.isArray(prop.anyOf)) return prop.anyOf.some(schemaAllowsNull);
  return prop.type === "null";
}

function isMillisSinceEpochInteger(prop) {
  if (!prop || typeof prop !== "object") return false;
  const type = Array.isArray(prop.type) ?
    prop.type.filter((value) => value !== "null")[0] :
    prop.type;
  return type === "integer" &&
    typeof prop.description === "string" &&
    /milliseconds since epoch/i.test(prop.description);
}

function enumSignature(values) {
  return values.join("\u0000");
}

function pascalCase(value) {
  return String(value)
    .split(/[^A-Za-z0-9]+/)
    .flatMap((part) => part.split(/(?=[A-Z])/))
    .filter(Boolean)
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join("");
}

function snakeCase(value) {
  return String(value)
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function formatDartPatchClass(config, fields, callableFields, description) {
  const helperBlock = fields.some((field) => field.usesJsonValueHelper) ?
    `\n${formatDartPatchJsonValueHelper(config)}` :
    "";
  const ctorParams = fields.map((field) => {
    const defaultValue = field.nullable ? ` = ${config.sentinelName}` : "";
    return `    ${field.paramType} ${field.name}${defaultValue},`;
  }).join("\n");

  const jsonEntries = fields.map((field) => {
    if (field.nullable) {
      return `         if (!identical(${field.name}, ${config.sentinelName}))
           ${dartString(field.name)}: ${field.jsonExpression},`;
    }
    return `         if (${field.name} != null)
           ${dartString(field.name)}: ${field.jsonExpression},`;
  }).join("\n");

  const docComment = description ?
    `/// Typed patch helper generated from ${description}\n` :
    "/// Typed patch helper generated from the updateUserProfile schema.\n";
  const callableJsonMethod = formatDartPatchCallableJsonMethod(callableFields);

  return `${docComment}final class ${config.className} {
  ${config.className}({
${ctorParams}
  }) : _fields = {
${jsonEntries}
       };

  /// Escape hatch for callers that compute the field key dynamically.
  /// Prefer the typed constructor for app presentation and repository code.
  ${config.className}.raw(Map<String, Object?> fields)
    : _fields = Map<String, Object?>.from(fields);

  final Map<String, Object?> _fields;

  Iterable<String> get keys => _fields.keys;

  bool get isEmpty => _fields.isEmpty;
  bool get isNotEmpty => _fields.isNotEmpty;

  Map<String, Object?> toFieldsJson() =>
      Map<String, Object?>.unmodifiable(_fields);
${callableJsonMethod}
}

${helperBlock}
`;
}

function formatDartPatchCallableJsonMethod(callableFields) {
  const params = callableFields.map((field) =>
    `    ${field.isRequired ? "required " : ""}${field.dartType} ${field.name},`
  ).join("\n");
  const signature = callableFields.length === 0 ?
    "toCallableJson()" :
    `toCallableJson({\n${params}\n  })`;
  const wrapperEntries = callableFields.map((field) => {
    const value = field.isRequired ? field.name : `?${field.name}`;
    return `    ${dartString(field.name)}: ${value},`;
  }).join("\n");
  const entries = [
    wrapperEntries,
    "    'fields': toFieldsJson(),",
  ].filter(Boolean).join("\n");
  return `
  Map<String, Object?> ${signature} => {
${entries}
  };`;
}

function formatDartPatchJsonValueHelper(config) {
  return `Object? ${config.jsonValueHelperName}(Object? value) {
  ${config.includeTimestampJsonHelper ? "if (value is Timestamp) return value.millisecondsSinceEpoch;\n  " : ""}if (value is DateTime) return value.millisecondsSinceEpoch;
  if (value is Iterable) {
    return value.map(${config.jsonValueHelperName}).toList();
  }
  if (value is Map) {
    return value.map(
      (key, child) => MapEntry(key, ${config.jsonValueHelperName}(child)),
    );
  }
  return value;
}`;
}

function mapDartType(prop) {
  if (!prop || typeof prop !== "object") return null;

  // Type union including null → nullable scalar.
  if (Array.isArray(prop.type)) {
    const isNullable = prop.type.includes("null");
    const nonNull = prop.type.filter((t) => t !== "null");
    if (nonNull.length !== 1) return null;
    const base = mapDartType({...prop, type: nonNull[0]});
    if (!base) return null;
    const baseStripped = base.endsWith("?") ? base.slice(0, -1) : base;
    return isNullable ? `${baseStripped}?` : base;
  }

  // anyOf with a "null" branch → nullable of the single non-null branch.
  if (Array.isArray(prop.anyOf) && !prop.type) {
    const hasNull = prop.anyOf.some((s) => s && s.type === "null");
    const nonNull = prop.anyOf.filter((s) => s && s.type !== "null");
    if (nonNull.length !== 1) return null;
    const inner = mapDartType(nonNull[0]);
    if (!inner) return null;
    const innerStripped = inner.endsWith("?") ? inner.slice(0, -1) : inner;
    return hasNull ? `${innerStripped}?` : inner;
  }

  // Enum (string with const list of values) → String for now.
  // The JSON Schema validates the value; Dart side stays String.

  switch (prop.type) {
    case "string": return "String";
    case "integer": return "int";
    case "number": return "double";
    case "boolean": return "bool";
    case "array": {
      if (!prop.items || typeof prop.items !== "object") return null;
      const innerType = mapDartType(prop.items);
      if (!innerType) return null;
      // Dart Lists drop the inner nullability suffix for the element type.
      const innerStripped = innerType.endsWith("?") ?
        innerType.slice(0, -1) :
        innerType;
      return `List<${innerStripped}>`;
    }
    case "object": {
      // Strictly-typed nested objects would ideally each get their own emitted
      // Dart class. For now, project them as Map<String, Object?> — matching
      // the choice the hand-written DTOs make for nested payloads. This keeps
      // the toJson() output schema-conformant while losing field-level Dart
      // typing for the nested shape. Future work: emit nested classes.
      return "Map<String, Object?>";
    }
    default: return null;
  }
}

function describeSchemaType(prop) {
  if (!prop || typeof prop !== "object") return "non-object";
  if (Array.isArray(prop.type)) return `type=[${prop.type.join(", ")}]`;
  if (Array.isArray(prop.anyOf)) return "anyOf";
  if (prop.type === "object" && prop.properties) return "nested object";
  return prop.type ? `type=${prop.type}` : "no type";
}

function formatDartCallableClass(className, fields, description) {
  const ctorParams = fields.map((f) =>
    f.isRequired ?
      `    required this.${f.name},` :
      `    this.${f.name},`
  ).join("\n");

  const fieldDecls = fields.map((f) =>
    `  final ${f.dartType} ${f.name};`
  ).join("\n");

  const jsonEntries = fields.map((f) => {
    const jsonExpression = f.jsonExpression ?? f.name;
    const nullableJsonExpression = f.nullableJsonExpression ?? jsonExpression;
    return f.isRequired ?
      `    ${dartString(f.name)}: ${jsonExpression},` :
      `    ${dartString(f.name)}: ?${nullableJsonExpression},`;
  }).join("\n");

  const docComment = description ?
    `/// ${description}\n` :
    "";

  return `${docComment}final class ${className} {
  const ${className}({
${ctorParams}
  });

${fieldDecls}

  Map<String, Object?> toJson() => {
${jsonEntries}
  };
}`;
}

function profileDecisionPathParts(schemaOrPath) {
  const pathTemplate = typeof schemaOrPath === "string" ?
    schemaOrPath :
    schemaOrPath?.["x-firestore-path"];
  if (typeof pathTemplate !== "string") {
    throw new Error("Profile decision path template is missing.");
  }
  const parts = pathTemplate.split("/");
  if (parts.length !== 4 || parts[2] !== "outgoing") {
    throw new Error(
      `Unexpected profile decision path template: ${pathTemplate}`
    );
  }
  return {
    pathTemplate,
    triggerPath: pathTemplate
      .replace("{userId}", "{swiperId}")
      .replace("{targetId}", "{targetId}"),
    collectionPath: parts[0],
    outgoingSubcollectionPath: parts[2],
  };
}

function bundleSchema(file) {
  const absoluteFile = path.resolve(file);
  const schema = readJsonFile(absoluteFile);
  return resolveRefs(schema, absoluteFile, true);
}

function resolveRefs(node, currentFile, keepSchemaMeta) {
  if (Array.isArray(node)) {
    return node.map((item) => resolveRefs(item, currentFile, false));
  }
  if (!node || typeof node !== "object") return node;

  if (typeof node.$ref === "string") {
    const {$ref, ...siblings} = node;
    const resolved = resolveReference($ref, currentFile);
    const merged = {
      ...stripSchemaMeta(resolveRefs(resolved.value, resolved.file, false)),
      ...resolveRefs(siblings, currentFile, false),
    };
    return Object.keys(merged).length === 0 ? true : merged;
  }

  const result = {};
  for (const [key, value] of Object.entries(node)) {
    if (!keepSchemaMeta && (key === "$schema" || key === "$id")) continue;
    result[key] = resolveRefs(value, currentFile, false);
  }
  return result;
}

function resolveReference(ref, currentFile) {
  if (/^[a-z]+:\/\//i.test(ref)) {
    throw new Error(`Remote schema refs are not supported by this generator: ${
      ref
    }`);
  }
  const [target, pointer = ""] = ref.split("#");
  const file = target ?
    path.resolve(path.dirname(currentFile), target) :
    currentFile;
  const json = readJsonFile(file);
  return {file, value: resolveJsonPointer(json, pointer)};
}

function resolveJsonPointer(document, pointer) {
  if (!pointer || pointer === "/") return document;
  if (!pointer.startsWith("/")) {
    throw new Error(`Unsupported JSON pointer: #${pointer}`);
  }
  return pointer
    .slice(1)
    .split("/")
    .reduce((value, token) => {
      const key = token.replace(/~1/g, "/").replace(/~0/g, "~");
      if (value === undefined || value === null ||
          !Object.prototype.hasOwnProperty.call(value, key)) {
        throw new Error(`JSON pointer segment not found: ${key}`);
      }
      return value[key];
    }, document);
}

function stripSchemaMeta(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const {$schema, $id, ...rest} = value;
  return rest;
}

function readContractJson(relativePath) {
  return readJsonFile(path.join(contractRoot, relativePath));
}

function readJsonFile(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function tsGeneratedHeader() {
  return `/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

`;
}

function mjsGeneratedHeader() {
  return `// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

`;
}

function dartGeneratedHeader() {
  return `// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements
`;
}

function markdownGeneratedHeader() {
  return `<!--
GENERATED CODE - DO NOT MODIFY BY HAND.
Regenerate with: node tool/contracts/generate_schema_contracts.mjs
-->

`;
}

function jsonForTs(value) {
  return `${JSON.stringify(value, null, 2)} as const`;
}

function jsonForJs(value) {
  return JSON.stringify(value, null, 2);
}

function dartLiteral(value) {
  if (value === null) return "null";
  if (typeof value === "string") return dartString(value);
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "<Object?>[]";
    return `<Object?>[
${value.map((item) => indent(dartLiteral(item), 2)).join(",\n")},
]`;
  }
  const entries = Object.entries(value).map(([key, item]) =>
    `${indent(`${dartString(key)}: ${dartLiteral(item)}`, 2)}`
  );
  if (entries.length === 0) return "<String, Object?>{}";
  return `<String, Object?>{
${entries.join(",\n")},
}`;
}

function dartString(value) {
  return `'${String(value)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\$/g, "\\$")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")}'`;
}

function indent(value, spaces) {
  const pad = " ".repeat(spaces);
  return String(value)
    .split("\n")
    .map((line) => `${pad}${line}`)
    .join("\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}

/** Render capability policy for every client from the same authored catalog. */
export function profileRequirementsOutputs(catalog, userSchema) {
  if (catalog.schemaVersion !== 1 || catalog.kind !== "profileRequirements") {
    throw new Error("Unsupported profile requirements catalog");
  }
  const fields = new Set(Object.keys(userSchema.properties));
  const resolve = (key, ancestors = []) => {
    const entry = catalog.capabilities[key];
    if (!entry || ancestors.includes(key)) {
      throw new Error(`Invalid profile capability inheritance: ${key}`);
    }
    const required = [...new Set([
      ...(entry.extends ? resolve(entry.extends, [...ancestors, key]) : []),
      ...entry.required,
    ])];
    for (const field of required) {
      if (!fields.has(field)) throw new Error(`Unknown profile field: ${field}`);
    }
    return required;
  };
  const capabilities = Object.fromEntries(Object.keys(catalog.capabilities)
    .map((key) => [key, resolve(key)]));
  for (const field of [...catalog.optionalAccountFields,
    ...Object.values(catalog.eventRequirements).flat()]) {
    if (!fields.has(field)) throw new Error(`Unknown profile field: ${field}`);
  }
  if (catalog.optionalAccountFields.some((field) =>
    capabilities.account.includes(field))) {
    throw new Error("Optional account fields cannot be required");
  }
  const header = "// GENERATED from contracts/catalogs/profile_requirements.json. Do not edit.\n";
  const json = (value) => JSON.stringify(value, null, 2);
  const ts = `${header}
export const profileRequiredFields = ${json(capabilities)} as const;
export const eventProfileRequirements = ${json(catalog.eventRequirements)} as const;
export const optionalAccountFields = ${json(catalog.optionalAccountFields)} as const;
export const eventAgePolicy = ${json(catalog.eventAgePolicy)} as const;
export type ProfileCapability = keyof typeof profileRequiredFields;
export type EventProfileRequirement = keyof typeof eventProfileRequirements;
export type ProfileRequirementField =
  (typeof profileRequiredFields)[ProfileCapability][number];

export function missingProfileFields(
  capability: ProfileCapability,
  hasField: (field: ProfileRequirementField) => boolean,
  eventRequirements: readonly EventProfileRequirement[] = [],
): ProfileRequirementField[] {
  const fields = new Set<ProfileRequirementField>(profileRequiredFields[capability]);
  if (capability === "eventBooking") {
    for (const requirement of eventRequirements) {
      for (const field of eventProfileRequirements[requirement]) fields.add(field);
    }
  }
  return [...fields].filter((field) => !hasField(field));
}
`;
  const dartMap = (value) => Object.entries(value).map(([key, values]) => {
    const prefix = `  '${key}': <String>[`;
    const line = `${prefix}${values.map((v) => `'${v}'`).join(', ')}],`;
    return line.length <= 80 ? line :
      `${prefix}\n${values.map((v) => `    '${v}',`).join('\n')}\n  ],`;
  }).join('\n');
  const dart = `${header}
const unrestrictedEventMinimumAge = ${catalog.eventAgePolicy.unrestrictedMinimum};
const openEndedEventMaximumAge = ${catalog.eventAgePolicy.openEndedMaximum};
const profileRequiredFields = <String, List<String>>{
${dartMap(capabilities)}
};
const eventProfileRequirements = <String, List<String>>{
${dartMap(catalog.eventRequirements)}
};
const optionalAccountFields = <String>[${catalog.optionalAccountFields.map((v) => `'${v}'`).join(', ')}];

List<String> missingProfileFields(
  String capability,
  bool Function(String field) hasField, {
  Iterable<String> eventRequirements = const [],
}) {
  final required = profileRequiredFields[capability];
  if (required == null) throw ArgumentError.value(capability, 'capability');
  final fields = <String>{...required};
  if (capability == 'eventBooking') {
    for (final requirement in eventRequirements) {
      final extra = eventProfileRequirements[requirement];
      if (extra == null) throw ArgumentError.value(requirement, 'requirement');
      fields.addAll(extra);
    }
  }
  return fields.where((field) => !hasField(field)).toList(growable: false);
}
`;
  return [
    {path: "functions/src/shared/generated/profileRequirements.ts", content: ts},
    {path: "website/src/shared/contracts/generated/profileRequirements.ts", content: ts},
    {path: "lib/platform/schema_contracts/generated/profile_requirements.g.dart", content: dart},
  ];
}
