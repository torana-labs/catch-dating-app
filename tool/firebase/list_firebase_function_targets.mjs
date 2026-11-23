#!/usr/bin/env node
import fs from "node:fs";
import {createRequire} from "node:module";
import path from "node:path";
import {fileURLToPath} from "node:url";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = path.resolve(toolDir, "../..");

// These Functions remain implemented and testable, but Catch's bounded deploy
// path must not recreate their recurring infrastructure until product usage and
// an explicit operating budget justify activation.
export const dormantFirebaseFunctionTargets = Object.freeze([
  "functions:eventAssistanceSmsDeliveryWebhook",
  "functions:onAssistanceEventChanged",
  "functions:onAssistancePlanChangeChanged",
  "functions:onAssistanceRosterChanged",
  "functions:onAssistanceStaffChanged",
  "functions:onAssistanceCheckpointChanged",
  "functions:onAssistanceRuntimeChanged",
  "functions:onAssistanceGuestChanged",
  "functions:onAssistanceSettingChanged",
  "functions:onAssistanceRuntimeConfigChanged",
  "functions:onAssistanceProgressChanged",
  "functions:onAssistanceMembershipChanged",
  "functions:onAssistanceMessageChanged",
  "functions:onAssistanceSmsSenderChanged",
  "functions:onAssistanceWhatsappSenderChanged",
  "functions:onAssistanceWhatsappPolicyChanged",
  "functions:onAssistanceWhatsappTemplateChanged",
  "functions:onAssistanceWhatsappStopChanged",
  "functions:onAssistanceWhatsappSuppressionChanged",
  "functions:onAssistanceWorkChanged",
  "functions:evaluateDueEventAssistanceWork",
  "functions:dispatchPendingOrganizerFollowerUpdates",
  "functions:dispatchScheduledOrganizerCampaigns",
  "functions:expireCrossPathsInvitations",
  "functions:expireCrossPathsPairHolds",
  "functions:expireEventRehearsals",
  "functions:expireEventWaitlistOffers",
]);

// functions/scripts/functionExports.cjs is the one reader of the entry
// point's export list. It needs no installed packages and never executes
// the source, so historical source roots are read statically too.
const {FunctionEntryError, functionExports} = createRequire(import.meta.url)(
  "../../functions/scripts/functionExports.cjs");

/** Deploy targets for every Function a source checkout exports, in source order. */
export function listFirebaseFunctionExports(sourceRoot = defaultRepoRoot) {
  const functionsDir = path.join(path.resolve(sourceRoot), "functions");
  try {
    return functionExports({root: functionsDir}).map(({name}) => `functions:${name}`);
  } catch (error) {
    if (error instanceof FunctionEntryError && error.rule === "empty") {
      throw new Error(`No Firebase function exports found in ${path.join(functionsDir, error.file)}`);
    }
    throw error;
  }
}

// Reads a source checkout's dormant list without evaluating it. Verification
// replays deliveries against a historical source root whose tool files may be
// older than the control plane's; extracting the frozen string array keeps
// that read static instead of executing arbitrary historical module code.
export function readDormantFirebaseFunctionTargets(
  sourceRoot = defaultRepoRoot,
) {
  const toolPath = path.join(
    path.resolve(sourceRoot),
    "tool/firebase/list_firebase_function_targets.mjs",
  );
  const stat = fs.lstatSync(toolPath);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error(
      `Dormant function target list must be a regular file: ${toolPath}`,
    );
  }
  const source = fs.readFileSync(toolPath, "utf8");
  const block = source.match(
    /dormantFirebaseFunctionTargets\s*=\s*Object\.freeze\(\s*\[([\s\S]*?)\]\s*\)/,
  );
  if (!block) {
    throw new Error(
      `Dormant function target list is missing its frozen array literal: ${toolPath}`,
    );
  }
  return [...block[1].matchAll(/"([^"\n]*)"|'([^'\n]*)'/g)].map(
    (entry) => entry[1] ?? entry[2],
  );
}

export function listFirebaseFunctionTargets(sourceRoot = defaultRepoRoot) {
  const dormantTargets = new Set(dormantFirebaseFunctionTargets);
  return listFirebaseFunctionExports(sourceRoot)
    .filter((target) => !dormantTargets.has(target));
}

function main() {
  const args = new Set(process.argv.slice(2));
  for (const arg of args) {
    if (arg !== "--all-exports" && arg !== "--csv") {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  const targets = args.has("--all-exports") ?
    listFirebaseFunctionExports() :
    listFirebaseFunctionTargets();
  const output = args.has("--csv") ? targets.join(",") : `${targets.join("\n")}\n`;
  process.stdout.write(output);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
