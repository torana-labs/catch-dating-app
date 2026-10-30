#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = path.resolve(toolDir, "../..");

// These Functions remain implemented and testable, but Catch's bounded deploy
// path must not recreate their recurring infrastructure until product usage and
// an explicit operating budget justify activation.
export const dormantFirebaseFunctionTargets = Object.freeze([
  // Irreversible archived-program scrubbing needs explicit runtime approval.
  // This prevents new deployment; it does not disable an existing scheduler.
  "functions:anonymizeDueProgramsSweep",
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
  "functions:onAssistanceSmsPermissionChanged",
  "functions:onAssistanceWhatsappPermissionChanged",
  "functions:onAssistanceSmsSenderChanged",
  "functions:onAssistanceSmsBudgetChanged",
  "functions:onAssistanceWhatsappSenderChanged",
  "functions:onAssistanceWhatsappPolicyChanged",
  "functions:onAssistanceWhatsappTemplateChanged",
  "functions:onAssistanceWhatsappBudgetChanged",
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
  "functions:reconcileRazorpayOrders",
]);

export function listFirebaseFunctionExports(sourceRoot = defaultRepoRoot) {
  const indexPath = path.join(path.resolve(sourceRoot), "functions/src/index.ts");
  const stat = fs.lstatSync(indexPath);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error(`Functions export source must be a regular file: ${indexPath}`);
  }
  const source = fs.readFileSync(indexPath, "utf8");
  const names = [];

  for (const match of source.matchAll(/export\s*\{([\s\S]*?)\}\s*from\s*["']/g)) {
    const exportsBlock = match[1];
    for (const rawPart of exportsBlock.split(",")) {
      const part = rawPart.trim();
      if (!part) continue;

      const aliasMatch = part.match(/\s+as\s+([A-Za-z_$][\w$]*)$/);
      const name = aliasMatch?.[1] ?? part.match(/^([A-Za-z_$][\w$]*)/)?.[1];
      if (!name) {
        throw new Error(`Could not parse exported function target from: ${part}`);
      }
      names.push(name);
    }
  }

  if (names.length === 0) {
    throw new Error(`No Firebase function exports found in ${indexPath}`);
  }
  return names.map((name) => `functions:${name}`);
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
