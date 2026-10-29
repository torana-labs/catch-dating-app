#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {pathToFileURL} from "node:url";

import {repoRoot} from "../lib/repo_paths.mjs";

export const adminReviewBridgeChannels = [
  {
    id: "organizer_publication",
    callableName: "adminDecideOrganizerIntake",
    adminApiWrapper: "decideOrganizerIntake",
    payloadType: "AdminDecideOrganizerIntakePayload",
    responseType: "AdminDecideOrganizerIntakeResponse",
    handlerFile: "functions/src/admin/organizerIntake.ts",
    handlerTest: "functions/src/admin/organizerIntake.test.ts",
    payloadSchema:
      "contracts/callables/admin_decide_organizer_intake_payload.schema.json",
    firestoreSchema:
      "contracts/firestore/organizer_intake_review_decisions.schema.json",
    generatedPayload:
      "functions/src/shared/generated/adminDecideOrganizerIntakeCallablePayload.ts",
    generatedDocument:
      "functions/src/shared/generated/organizerIntakeReviewDecisionDocument.ts",
    firestoreCollection: "organizerIntakeReviewDecisions",
  },
  {
    id: "organizer_curation",
    callableName: "adminRecordOrganizerCuration",
    adminApiWrapper: "recordOrganizerCuration",
    payloadType: "AdminRecordOrganizerCurationPayload",
    responseType: "AdminRecordOrganizerCurationResponse",
    handlerFile: "functions/src/admin/organizerCuration.ts",
    handlerTest: "functions/src/admin/organizerCuration.test.ts",
    payloadSchema:
      "contracts/callables/admin_record_organizer_curation_payload.schema.json",
    firestoreSchema:
      "contracts/firestore/organizer_intake_curation_decisions.schema.json",
    generatedPayload:
      "functions/src/shared/generated/adminRecordOrganizerCurationCallablePayload.ts",
    generatedDocument:
      "functions/src/shared/generated/organizerIntakeCurationDecisionDocument.ts",
    firestoreCollection: "organizerIntakeCurationDecisions",
  },
  {
    id: "organizer_policy_gap_review",
    callableName: "adminDecideOrganizerPolicyGap",
    adminApiWrapper: "decideOrganizerPolicyGap",
    payloadType: "AdminDecideOrganizerPolicyGapPayload",
    responseType: "AdminDecideOrganizerPolicyGapResponse",
    handlerFile: "functions/src/admin/organizerPolicyGap.ts",
    handlerTest: "functions/src/admin/organizerPolicyGap.test.ts",
    payloadSchema:
      "contracts/callables/admin_decide_organizer_policy_gap_payload.schema.json",
    firestoreSchema:
      "contracts/firestore/organizer_policy_gap_review_decisions.schema.json",
    generatedPayload:
      "functions/src/shared/generated/adminDecideOrganizerPolicyGapCallablePayload.ts",
    generatedDocument:
      "functions/src/shared/generated/organizerPolicyGapReviewDecisionDocument.ts",
    firestoreCollection: "organizerPolicyGapReviewDecisions",
  },
];

const sharedFiles = {
  adminApi: "admin/src/shared/api/adminApi.ts",
  adminRepository:
    "admin/src/features/intake/organizer/api/organizerIntakeRepository.ts",
  adminController:
    "admin/src/features/intake/organizer/controllers/useOrganizerIntakeController.ts",
  adminLoader:
    "admin/src/features/intake/organizer/controllers/loadOrganizerIntakeBridge.ts",
  adminTypes: "admin/src/shared/types/adminTypes.ts",
  functionsIndex: "functions/src/index.ts",
  intakeOperationsHandler: "functions/src/admin/intakeOperations.ts",
  intakeOperationsTest: "functions/src/admin/intakeOperations.test.ts",
};

const retiredOperationalSnapshots = [
  "admin/src/features/intake/organizer/generated/organizerIntakeBridge.json",
  "admin/src/generated/eventIntakeBridge.json",
  "admin/src/generated/marketingOpsBridge.json",
];

export function checkAdminReviewBridge({
  root = repoRoot,
  channels = adminReviewBridgeChannels,
} = {}) {
  const errors = [];
  const fileCache = new Map();

  for (const [label, file] of Object.entries(sharedFiles)) {
    requireFile({root, file, label, errors});
  }
  for (const file of retiredOperationalSnapshots) {
    rejectFile({root, file, errors});
  }

  checkFirestoreIntakeReadPath({root, errors, fileCache});
  for (const channel of channels) {
    checkChannel({root, channel, errors, fileCache});
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings: [],
    summary: {
      channels: channels.length,
      readyChannels: channels.length -
        channelsWithErrors({root, channels, fileCache}).length,
      firestoreCollections: channels
        .map((channel) => channel.firestoreCollection)
        .sort(),
      source: "firestore",
      retiredOperationalSnapshots: retiredOperationalSnapshots.length,
    },
    channels: channels.map((channel) => ({
      id: channel.id,
      callableName: channel.callableName,
      firestoreCollection: channel.firestoreCollection,
    })),
  };
}

function checkFirestoreIntakeReadPath({root, errors, fileCache}) {
  const expectations = [
    [sharedFiles.adminApi, '"adminListIntakeOperations"', "admin callable"],
    [sharedFiles.adminLoader, "listIntakeOperations", "Firestore loader"],
    [sharedFiles.adminLoader, 'workflowId: "supply-intake"', "workflow filter"],
    [sharedFiles.adminLoader, 'runStatus: "completed"', "completed-run filter"],
    [sharedFiles.adminLoader, "latestRunPerLaunchMarket", "market selection"],
    [sharedFiles.functionsIndex, "adminListIntakeOperations", "function export"],
    [
      sharedFiles.intakeOperationsHandler,
      "repository.listRuns",
      "run collection repository",
    ],
    [
      sharedFiles.intakeOperationsHandler,
      "repository.listWorkItems",
      "work-item collection repository",
    ],
    [
      sharedFiles.intakeOperationsHandler,
      '"adminListIntakeOperations"',
      "read rate limit",
    ],
  ];
  for (const [file, token, label] of expectations) {
    mustContain({
      root,
      file,
      token,
      label: `organizer-intake-read:${label}`,
      errors,
      fileCache,
    });
  }
}

function checkChannel({root, channel, errors, fileCache}) {
  const requiredFiles = [
    channel.handlerFile,
    channel.handlerTest,
    channel.payloadSchema,
    channel.firestoreSchema,
    channel.generatedPayload,
    channel.generatedDocument,
  ];
  for (const file of requiredFiles) {
    requireFile({root, file, label: `${channel.id}:${file}`, errors});
  }

  const expectations = [
    [sharedFiles.functionsIndex, channel.callableName, "functions export"],
    [
      sharedFiles.adminApi,
      `function ${channel.adminApiWrapper}`,
      "admin API wrapper",
    ],
    [
      sharedFiles.adminApi,
      `"${channel.callableName}"`,
      "admin API callable name",
    ],
    [
      sharedFiles.adminRepository,
      channel.adminApiWrapper,
      "feature repository export",
    ],
    [
      sharedFiles.adminController,
      channel.controllerMutationToken ??
        `mutationFn: ${channel.adminApiWrapper}`,
      "React Query mutation",
    ],
    [
      sharedFiles.adminTypes,
      `interface ${channel.payloadType}`,
      "admin payload type",
    ],
    [
      sharedFiles.adminTypes,
      `interface ${channel.responseType}`,
      "admin response type",
    ],
    [
      channel.handlerFile,
      `"${channel.callableName}"`,
      "rate-limit action",
    ],
    [
      channel.handlerFile,
      "setAdminAuditLogInTransaction",
      "audit log",
    ],
  ];
  for (const [file, token, label] of expectations) {
    mustContain({
      root,
      file,
      token,
      label: `${channel.id}:${label}`,
      errors,
      fileCache,
    });
  }
  mustContainAny({
    root,
    file: channel.handlerFile,
    tokens: [
      `const decisionCollection = "${channel.firestoreCollection}"`,
      `const curationCollection = "${channel.firestoreCollection}"`,
    ],
    label: `${channel.id}:Firestore collection constant`,
    errors,
    fileCache,
  });
}

function channelsWithErrors({root, channels, fileCache}) {
  return channels.filter((channel) => {
    const errors = [];
    checkChannel({root, channel, errors, fileCache});
    return errors.length > 0;
  });
}

function requireFile({root, file, label, errors}) {
  if (!fs.existsSync(path.resolve(root, file))) {
    errors.push(`${label}: missing ${file}`);
  }
}

function rejectFile({root, file, errors}) {
  if (fs.existsSync(path.resolve(root, file))) {
    errors.push(`legacy-snapshot: retire ${file}; operational state belongs in Firestore`);
  }
}

function mustContain({root, file, token, label, errors, fileCache}) {
  const source = readText({root, file, fileCache});
  if (source === null) {
    errors.push(`${label}: cannot read ${file}`);
    return;
  }
  if (!source.includes(token)) {
    errors.push(`${label}: ${file} does not contain ${token}`);
  }
}

function mustContainAny({
  root,
  file,
  tokens,
  label,
  errors,
  fileCache,
}) {
  const source = readText({root, file, fileCache});
  if (source === null) {
    errors.push(`${label}: cannot read ${file}`);
    return;
  }
  if (!tokens.some((token) => source.includes(token))) {
    errors.push(`${label}: ${file} does not contain ${tokens.join(" or ")}`);
  }
}

function readText({root, file, fileCache}) {
  const absolutePath = path.resolve(root, file);
  if (fileCache.has(absolutePath)) return fileCache.get(absolutePath);
  if (!fs.existsSync(absolutePath)) {
    fileCache.set(absolutePath, null);
    return null;
  }
  const source = fs.readFileSync(absolutePath, "utf8");
  fileCache.set(absolutePath, source);
  return source;
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    printHelp();
    return;
  }
  const result = checkAdminReviewBridge();
  if (args.json) console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    console.error("Organizer Firestore review-path validation failed:");
    for (const error of result.errors) console.error(`- ${error}`);
    process.exit(1);
  }
  if (!args.json) {
    console.log(
      "Organizer Firestore review path ok: " +
        `${result.summary.channels} write channel(s), ` +
        `${result.summary.firestoreCollections.length} decision collection(s), ` +
        "operationRuns + operationWorkItems read source, no Admin JSON snapshots."
    );
  }
}

function parseArgs(argv) {
  const parsed = {help: false, json: false};
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--json") parsed.json = true;
    else fail(`Unknown argument: ${arg}`);
  }
  return parsed;
}

function printHelp() {
  console.log(`Usage: node tool/web/check_admin_review_bridge.mjs [options]

Validates that Organizer Intake reads operationRuns and operationWorkItems
through adminListIntakeOperations, writes decisions through audited Admin
callables, and does not retain the retired Admin operational JSON snapshots.

Options:
  --json      Print the channel manifest and validation result.
  -h, --help  Show this help.
`);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function isMain() {
  return Boolean(process.argv[1]) &&
    import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isMain()) main();
