#!/usr/bin/env node
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import {createRequire} from "node:module";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";
import {
  DEFAULT_DEMO_OPS_PREFIX,
  DEFAULT_SEED_PREFIX,
  SUVBOT_ACCESS_COLLECTION,
  applyDeletePlan,
  applyDocPlan,
  buildCheckInEventPlan,
  buildDemoChecklist,
  buildHostAccountPlan,
  buildLaunchCleanupPlan,
  buildMakeEventFullPlan,
  buildPromoteWaitlistPlan,
  buildRefundPlan,
  buildStaleEventCleanupPlan,
  buildUnreadMessagePlan,
  buildValidateDemoStateReport,
  demoOperationId,
  listScenarioConfigs,
  loadGoldenAccounts,
  loadScenarioConfig,
  loadFirebaseAdmin,
  normalizePhone,
  resolveUserByPhone,
  splitCsv,
  timestampFromDate,
  writeManifest,
} from "./demo_ops_core.mjs";
import {isFirebaseProductionTarget, resolveFirebaseProjectId} from "../lib/firebase_project.mjs";
import {
  applyEventAggregateRepairPlan,
  buildEventAggregateRepairPlan,
} from "../data/recompute_event_aggregate_counts.mjs";
import {
  applyMemberCountRepairPlan,
  buildMemberCountRepairPlan,
} from "../data/recompute_organizer_member_counts.mjs";
import {
  DEFAULT_PERSONA_CATALOG_PATH,
  DEFAULT_PHOTO_ACTIVITY_TAXONOMY_PATH,
  DEFAULT_PHOTO_COMPOSITION_INDEX_PATH,
  DEFAULT_PERSONA_PROFILE_PROJECTION_PATH,
  formatPersonaPhotoGenerationPlanMarkdown,
  loadPhotoActivityTaxonomy,
  loadPhotoCompositionIndex,
  personaProfileProjection,
  personaPhotoGenerationPlan,
  personaCatalogSummary,
  validatePersonaCatalog,
} from "./demo_persona_catalog.mjs";
import {
  DEFAULT_CROSS_PATHS_DEMO_CANDIDATE_COUNT,
  assertProductionCrossPathsFixtureRequest,
  buildCrossPathsDemoPlan,
  ensureCrossPathsDemoTestLogin,
  verifyCrossPathsDemoPlan,
} from "./cross_paths_demo_core.mjs";
import {
  DEFAULT_PERSONA_IMAGE_OUTPUT_DIR,
  DEFAULT_PERSONA_IMAGE_PILOT_PATH,
  buildPersonaImageGenerationBatch,
  formatPersonaImageGenerationBatchJsonl,
  formatPersonaImageGenerationBatchMarkdown,
  generatePersonaImageBatch,
  loadPersonaImagePilotConfig,
} from "./demo_persona_image_generation.mjs";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const admin = loadFirebaseAdmin();
const requireFromFunctions = createRequire(
  path.join(path.resolve(toolDir, "../.."), "functions/package.json")
);

if (isMain()) {
  await main();
}

export async function main(argv = process.argv.slice(2)) {
  const {command, args} = parseArgs(argv);
  if (!command || args.help) {
    printHelp();
    return;
  }
  if (command === "list-commands") {
    printCommands();
    return;
  }
  if (command === "scenario-info") {
    printScenarioInfo(args);
    return;
  }
  if (command === "list-golden-accounts") {
    printGoldenAccounts(args);
    return;
  }
  if (command === "validate-persona-catalog") {
    printPersonaCatalogValidation(args);
    return;
  }
  if (command === "persona-photo-plan") {
    printPersonaPhotoPlan(args);
    return;
  }
  if (command === "persona-profile-projection") {
    printPersonaProfileProjection(args);
    return;
  }
  if (command === "persona-image-generate") {
    await runPersonaImageGenerate(args);
    return;
  }
  if (command === "seed-world" || command === "append-user") {
    runSeedCommand(command, args);
    return;
  }
  if (command === "suvbot-actions") {
    await printSuvbotActions(args);
    return;
  }

  if (args.emulatorHost) {
    process.env.FIRESTORE_EMULATOR_HOST = args.emulatorHost;
  }
  const projectId = resolveFirebaseProjectId({env: args.env, project: args.project});
  guardProdWrite({args, projectId});
  admin.initializeApp({projectId});
  const db = admin.firestore();

  if (command === "match-phones") {
    await runMatchPhones({db, args, projectId});
  } else if (command === "suvbot") {
    await runSuvbot({db, args, projectId});
  } else if (command === "suvbot-enable") {
    await runSuvbotEnable({db, args, projectId});
  } else if (command === "warm-user") {
    await runWarmUser({db, args, projectId});
  } else if (command === "warm-group") {
    await runWarmGroup({db, args, projectId});
  } else if (command === "reset-user-demo-state") {
    await runResetUserDemoState({db, args, projectId});
  } else if (command === "validate-demo-state") {
    await runValidateDemoState({db, args, projectId});
  } else if (command === "demo-checklist") {
    await runDemoChecklist({db, args, projectId});
  } else if (command === "cleanup-demo-data") {
    await runCleanupDemoData({db, args, projectId});
  } else if (command === "cleanup-stale-events") {
    await runCleanupStaleEvents({db, args, projectId});
  } else if (command === "seed-cross-paths") {
    await runSeedCrossPaths({db, args, projectId});
  } else if (command === "make-event-full") {
    await runWritePlan({
      db,
      args,
      projectId,
      title: "Demo make event full plan",
      plan: await buildMakeEventFullPlan({
        db,
        admin,
        eventId: requireArg(args, "eventId", "--event-id"),
        seedPrefix: args.seedPrefix,
      }),
      repair: true,
    });
  } else if (command === "mark-attended") {
    throw new Error(
      "mark-attended is retired. Start the tester's demo world at the live " +
      "or after moment instead: suvbot --phone <phone> --action " +
      "startDemoWorld --world <worldId> --moment live"
    );
  } else if (command === "promote-waitlist") {
    await runWritePlan({
      db,
      args,
      projectId,
      title: "Demo promote waitlist plan",
      plan: await buildPromoteWaitlistPlan({
        db,
        admin,
        phone: requireArg(args, "phone", "--phone"),
        eventId: requireArg(args, "eventId", "--event-id"),
        seedPrefix: args.seedPrefix,
      }),
      repair: true,
    });
  } else if (command === "create-unread-message") {
    await runWritePlan({
      db,
      args,
      projectId,
      title: "Demo unread message plan",
      plan: await buildUnreadMessagePlan({
        db,
        admin,
        fromPhone: requireArg(args, "fromPhone", "--from-phone"),
        toPhone: requireArg(args, "toPhone", "--to-phone"),
        text: args.text ?? undefined,
        seedPrefix: args.seedPrefix,
      }),
    });
  } else if (command === "create-refund") {
    await runWritePlan({
      db,
      args,
      projectId,
      title: "Demo refund payment plan",
      plan: await buildRefundPlan({
        db,
        admin,
        phone: requireArg(args, "phone", "--phone"),
        eventId: requireArg(args, "eventId", "--event-id"),
        seedPrefix: args.seedPrefix,
      }),
    });
  } else if (command === "create-host-account") {
    await runWritePlan({
      db,
      args,
      projectId,
      title: "Demo host account plan",
      plan: await buildHostAccountPlan({
        db,
        admin,
        phone: requireArg(args, "phone", "--phone"),
        latitude: args.lat,
        longitude: args.lng,
        meetingPoint: args.meetingPoint,
        seedPrefix: args.seedPrefix,
      }),
      repair: true,
    });
  } else if (command === "create-check-in-event") {
    await runWritePlan({
      db,
      args,
      projectId,
      title: "Demo check-in event plan",
      plan: await buildCheckInEventPlan({
        db,
        admin,
        phone: requireArg(args, "phone", "--phone"),
        latitude: args.lat,
        longitude: args.lng,
        meetingPoint: args.meetingPoint,
        seedPrefix: args.seedPrefix,
      }),
      repair: true,
    });
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
}

// Per-user demo state is owned by the Suvbot backend
// (functions/src/demoOps/suvbot.ts). These commands only choose the Suvbot
// action, so the CLI and the in-app chat cannot drift apart.
async function runMatchPhones({db, args, projectId}) {
  if (args.viaSwipes || args.withMessages || args.eventId) {
    throw new Error(
      "match-phones no longer takes --via-swipes, --with-messages or " +
      "--event-id: those needed a shared seeded event. Each tester now has " +
      "a private demo world; Suvbot's tester match is the only pair match."
    );
  }
  const userA = await resolveUserByPhone(db, requireArg(args, "phoneA", "--phone-a"));
  await runSuvbotOperations({
    db,
    args,
    projectId,
    title: "Demo match phone plan",
    command: "match-phones",
    requireAccess: false,
    operations: [{
      uid: userA.uid,
      phone: userA.phoneNumber,
      action: "matchTesterByPhone",
      targetPhone: normalizePhone(requireArg(args, "phoneB", "--phone-b")),
    }],
  });
}

async function runWarmUser({db, args, projectId}) {
  const user = await resolveSuvbotUser({db, args});
  await runSuvbotOperations({
    db,
    args,
    projectId,
    title: "Demo warm user plan",
    command: "warm-user",
    requireAccess: false,
    operations: [{
      uid: user.uid,
      phone: user.phoneNumber ?? null,
      ...worldActionFromArgs(args, "warmChatState"),
    }],
  });
}

async function runWarmGroup({db, args, projectId}) {
  const phones = [...new Set(phonesFromArgs(args).map(normalizePhone))];
  if (phones.length < 2) throw new Error("warm-group requires at least two phones.");
  const operations = [];
  for (let i = 0; i < phones.length; i += 1) {
    const user = await resolveUserByPhone(db, phones[i]);
    for (let j = i + 1; j < phones.length; j += 1) {
      operations.push({
        uid: user.uid,
        phone: user.phoneNumber,
        action: "matchTesterByPhone",
        targetPhone: phones[j],
      });
    }
  }
  await runSuvbotOperations({
    db,
    args,
    projectId,
    title: "Demo warm group plan",
    command: "warm-group",
    requireAccess: false,
    operations,
  });
}

async function runResetUserDemoState({db, args, projectId}) {
  const user = await resolveSuvbotUser({db, args});
  await runSuvbotOperations({
    db,
    args,
    projectId,
    title: "Demo reset user state plan",
    command: "reset-user-demo-state",
    requireAccess: false,
    operations: [{
      uid: user.uid,
      phone: user.phoneNumber ?? null,
      action: "clearDemoState",
    }],
  });
}

async function runValidateDemoState({db, args, projectId}) {
  const phones = args.phone ? [args.phone] : phonesFromArgs(args);
  const reports = [];
  if (args.uid) {
    reports.push(await buildValidateDemoStateReport({db, uid: args.uid}));
  }
  for (const phone of phones) {
    reports.push(await buildValidateDemoStateReport({db, phone}));
  }
  if (reports.length === 0) {
    throw new Error("validate-demo-state requires --phone, --phones, --phone-file, or --uid.");
  }
  printPlan({
    args,
    projectId,
    title: "Demo state validation",
    plan: {
      command: "validate-demo-state",
      reports,
      readyCount: reports.filter((report) => report.demoReady).length,
      issueCount: reports.reduce((sum, report) => sum + report.issues.length, 0),
    },
    manifest: null,
    appliedSummary: null,
  });
}

async function runDemoChecklist({db, args, projectId}) {
  const phones = args.phone ? [args.phone] : phonesFromArgs(args);
  const reports = [];
  if (args.uid) reports.push(await buildDemoChecklist({db, uid: args.uid}));
  for (const phone of phones) {
    reports.push(await buildDemoChecklist({db, phone}));
  }
  if (reports.length === 0) {
    throw new Error("demo-checklist requires --phone, --phones, --phone-file, or --uid.");
  }
  printPlan({
    args,
    projectId,
    title: "Demo checklist",
    plan: {
      command: "demo-checklist",
      reports,
    },
    manifest: null,
    appliedSummary: null,
  });
}

async function runCleanupDemoData({db, args, projectId}) {
  const plan = await buildLaunchCleanupPlan({
    db,
    seedPrefixes: args.seedPrefixes.length > 0 ?
      args.seedPrefixes :
      undefined,
    keepSeedPrefixes: args.keepSeedPrefixes,
  });
  if (args.apply) await applyDeletePlan({db, paths: plan.paths});
  printPlan({
    args,
    projectId,
    title: "Demo cleanup plan",
    plan,
    manifest: {pathCount: plan.paths.length},
    appliedSummary: args.apply ? {deleted: plan.paths.length} : null,
  });
}

async function runCleanupStaleEvents({db, args, projectId}) {
  const plan = await buildStaleEventCleanupPlan({
    db,
    seedPrefixes: args.seedPrefixes.length > 0 ?
      args.seedPrefixes :
      undefined,
    includePast: args.cleanupPast,
    includeCancelled: args.cleanupCancelled,
  });
  let aggregateSummary = null;
  if (args.apply) {
    await applyDeletePlan({db, paths: plan.paths});
    aggregateSummary = await repairAggregates(db);
  }
  printPlan({
    args,
    projectId,
    title: "Demo stale event cleanup plan",
    plan,
    manifest: {pathCount: plan.paths.length},
    appliedSummary: args.apply ? {deleted: plan.paths.length, aggregateSummary} : null,
  });
}

async function runSeedCrossPaths({db, args, projectId}) {
  assertProductionCrossPathsFixtureRequest({
    projectId,
    emulatorHost: args.emulatorHost,
    apply: args.apply,
    allowProd: args.allowProd,
    allowProdCrossPathsFixture: args.allowProdCrossPathsFixture,
    configureTestLogin: args.configureTestLogin,
    seedPrefix: args.seedPrefix,
    viewerUid: args.uid,
    eventId: args.eventId,
    organizerId: args.organizerId,
    candidateCount: args.candidateCount,
    testPhone: args.testPhone,
    testCode: args.testCode,
  });
  if (args.configureTestLogin && !args.apply) {
    throw new Error("--configure-test-login requires --apply.");
  }
  if (args.configureTestLogin && (!args.testPhone || !args.testCode)) {
    throw new Error(
      "--configure-test-login requires --test-phone and --test-code."
    );
  }
  const plan = await buildCrossPathsDemoPlan({
    db,
    admin,
    seedPrefix: args.seedPrefix,
    viewerUid: args.uid,
    eventId: args.eventId,
    organizerId: args.organizerId,
    candidateCount: args.candidateCount,
    testPhone: args.configureTestLogin ? args.testPhone : null,
  });
  let writeSummary = null;
  let verification = null;
  let testLogin = null;
  if (args.apply) {
    writeSummary = await applyDocPlan({db, docs: plan.docs});
    verification = await verifyCrossPathsDemoPlan({db, plan});
    if (!verification.ready) {
      throw new Error(
        "Cross Paths fixture read-back failed: " +
          JSON.stringify(verification)
      );
    }
    if (args.configureTestLogin) {
      testLogin = await ensureCrossPathsDemoTestLogin({
        admin,
        projectId,
        viewerUid: plan.viewerUid,
        phoneNumber: args.testPhone,
        smsCode: args.testCode,
      });
    }
  }
  const manifest = await writeManifest({
    db,
    admin,
    plan,
    apply: args.apply,
  });
  printPlan({
    args,
    projectId,
    title: "Cross Paths synthetic fixture plan",
    plan,
    manifest,
    appliedSummary: args.apply ? {
      written: writeSummary.written,
      verification,
      testLogin,
    } : null,
  });
}

async function runWritePlan({db, args, projectId, title, plan, repair = false}) {
  let aggregateSummary = null;
  if (args.apply) {
    await applyDocPlan({db, docs: plan.docs});
    if (repair) aggregateSummary = await repairAggregates(db);
  }
  const manifest = await writeManifest({db, admin, plan, apply: args.apply});
  printPlan({
    args,
    projectId,
    title,
    plan,
    manifest,
    appliedSummary: args.apply ? {written: plan.docs.length, aggregateSummary} : null,
  });
}

async function repairAggregates(db) {
  const eventPlan = await buildEventAggregateRepairPlan(db);
  const organizerPlan = await buildMemberCountRepairPlan(db);
  await applyEventAggregateRepairPlan(db, eventPlan);
  await applyMemberCountRepairPlan(db, organizerPlan);
  return {
    eventRepairs: eventPlan.summary.repairsNeeded,
    eventWarnings: eventPlan.summary.warnings.length,
    organizerRepairs: organizerPlan.summary.repairsNeeded,
    organizerWarnings: organizerPlan.summary.warnings.length,
  };
}

async function runSuvbotEnable({db, args, projectId}) {
  const suvbot = loadSuvbotFunctionsModule(args);
  const targets = await resolveSuvbotEnableTargets({db, args});
  if (targets.length === 0) {
    throw new Error("suvbot-enable requires --phone, --phones, --phone-file, or --uid.");
  }

  const now = new Date();
  const operationId = demoOperationId({
    command: "suvbot-enable",
    seedPrefix: args.seedPrefix,
    subject: String(now.getTime()),
  });
  const accessCollection =
    suvbot.SUVBOT_ACCESS_COLLECTION ?? SUVBOT_ACCESS_COLLECTION;
  const accessDocs = [];
  const threadPaths = new Set([`publicProfiles/${suvbot.SUVBOT_UID ?? "suvbot"}`]);
  const timestamp = timestampFromDate(admin, now);

  for (const target of targets) {
    const accessPath = `${accessCollection}/${target.uid}`;
    const accessSnap = await db.doc(accessPath).get();
    const accessData = accessSnap.data();
    const matchId = suvbot.suvbotMatchId(target.uid);
    target.matchId = matchId;
    target.accessPreviouslyEnabled = accessData?.enabled === true;
    threadPaths.add(`matches/${matchId}`);
    threadPaths.add(`matches/${matchId}/messages/suvbot_welcome`);

    accessDocs.push({
      path: accessPath,
      data: {
        demoOps: true,
        demoOpsCommand: "suvbot-enable",
        demoOpsId: operationId,
        seedPrefix: args.seedPrefix,
        synthetic: true,
        uid: target.uid,
        enabled: true,
        source: "demo_ops",
        updatedAt: timestamp,
        ...(!accessSnap.exists || !accessData?.createdAt ? {createdAt: timestamp} : {}),
      },
    });
  }

  let appliedSummary = null;
  if (args.apply) {
    const accessSummary = await applyDocPlan({db, docs: accessDocs});
    const threadResults = [];
    for (const target of targets) {
      const thread = await suvbot.ensureSuvbotThread(
        db,
        target.uid,
        suvbotDeps(db)
      );
      threadResults.push({uid: target.uid, ...thread});
    }
    const verification = await verifySuvbotEnablement({
      db,
      targets,
      accessCollection,
    });
    appliedSummary = {
      accessDocsWritten: accessSummary.written,
      threadsCreated: threadResults.filter((item) => item.created).length,
      threadsVerified: verification.filter((item) =>
        item.accessEnabled &&
        item.matchExists &&
        item.welcomeMessageExists
      ).length,
      verification,
    };
  }

  const plan = {
    command: "suvbot-enable",
    operationId,
    phones: targets.map((target) => target.phoneNumber).filter(Boolean),
    users: targets.map((target) => target.uid),
    targets: targets.map((target) => ({
      uid: target.uid,
      phone: target.phoneNumber ?? null,
      matchId: target.matchId,
      accessPreviouslyEnabled: target.accessPreviouslyEnabled,
    })),
    docs: accessDocs,
    threadPaths: [...threadPaths].sort(),
    backendSource: "functions/src/demoOps/suvbot.ts",
  };
  const manifest = await writeManifest({db, admin, plan, apply: args.apply});
  printPlan({
    args,
    projectId,
    title: "Suvbot enablement",
    plan,
    manifest,
    appliedSummary,
  });
}

async function runSuvbot({db, args, projectId}) {
  const action = requireArg(args, "action", "--action");
  const resolvedUser = await resolveSuvbotUser({db, args});
  await runSuvbotOperations({
    db,
    args,
    projectId,
    title: "Suvbot operation",
    command: "suvbot",
    requireAccess: !args.bypassSuvbotAccess,
    operations: [{
      uid: resolvedUser.uid,
      phone: resolvedUser.phoneNumber ?? null,
      ...(action === "startDemoWorld" ?
        worldActionFromArgs(args, action) :
        {action, text: args.text ?? undefined}),
      targetPhone: args.targetPhone ?? undefined,
    }],
  });
}

/**
 * Suvbot action for a demo world: Start a demo when --world is given,
 * otherwise the fallback preset (which starts the tester's home world).
 */
function worldActionFromArgs(args, fallbackAction) {
  if (!args.world) {
    if (fallbackAction === "startDemoWorld") {
      throw new Error("startDemoWorld requires --world <worldId>.");
    }
    return {action: fallbackAction};
  }
  return {
    action: "startDemoWorld",
    text: `${args.world} ${args.moment ?? "after"}`,
  };
}

async function runSuvbotOperations({
  db,
  args,
  projectId,
  title,
  command,
  requireAccess,
  operations,
}) {
  const suvbot = loadSuvbotFunctionsModule(args);
  for (const operation of operations) {
    if (!suvbot.isSuvbotAction(operation.action)) {
      throw new Error(`Unsupported Suvbot action: ${operation.action}`);
    }
  }
  const planned = operations.map((operation) => ({
    ...operation,
    descriptor: suvbot.suvbotActionCatalog()
      .find((item) => item.id === operation.action) ?? {id: operation.action},
  }));
  if (!args.apply) {
    printPlan({
      args,
      projectId,
      title,
      plan: {
        command,
        ...singleOperationFields(planned),
        operations: planned,
        backendSource: "functions/src/demoOps/suvbot.ts",
      },
      manifest: null,
      appliedSummary: null,
    });
    return;
  }

  const results = [];
  for (const operation of operations) {
    const result = await suvbot.runSuvbotDemoOperationForUser({
      uid: operation.uid,
      action: operation.action,
      text: operation.text,
      targetPhone: operation.targetPhone,
      deps: suvbotDeps(db),
      options: {skipConfirmation: true, requireAccess},
    });
    results.push({
      uid: operation.uid,
      phone: operation.phone ?? null,
      action: operation.action,
      matchId: result.matchId,
      reply: result.reply,
    });
  }
  printPlan({
    args,
    projectId,
    title,
    plan: {command, ...singleOperationFields(results), operations: results},
    manifest: null,
    appliedSummary: {
      ok: true,
      operations: results.length,
      source: "functions/src/demoOps/suvbot.ts",
    },
  });
}

function singleOperationFields(operations) {
  if (operations.length !== 1) return {};
  const [operation] = operations;
  return {
    uid: operation.uid,
    phone: operation.phone ?? null,
    action: operation.action,
    ...(operation.matchId ? {matchId: operation.matchId} : {}),
    ...(operation.reply ? {reply: operation.reply} : {}),
  };
}

async function printSuvbotActions(args) {
  const suvbot = loadSuvbotFunctionsModule(args);
  const actions = suvbot.suvbotActionCatalog();
  if (args.json) {
    console.log(JSON.stringify({actions}, null, 2));
    return;
  }
  console.log("Suvbot actions:");
  for (const action of actions) {
    const markers = [
      action.destructive ? "destructive" : null,
      action.requiresText ? "requires text" : null,
    ].filter(Boolean);
    const suffix = markers.length > 0 ? ` (${markers.join(", ")})` : "";
    console.log(`- ${action.id}: ${action.label}${suffix}`);
    console.log(`  ${action.description}`);
  }
}

function loadSuvbotFunctionsModule(args) {
  if (!args.skipFunctionsBuild) buildFunctions();
  return requireFromFunctions("./lib/demoOps/suvbot.js");
}

function buildFunctions() {
  const result = spawnSync("npm", ["--prefix", "functions", "run", "build"], {
    cwd: path.resolve(toolDir, "../.."),
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error("functions build failed; Suvbot module was not loaded.");
  }
}

async function resolveSuvbotUser({db, args}) {
  if (args.uid) return {uid: args.uid, phoneNumber: args.phone ?? null};
  if (!args.phone) throw new Error("suvbot requires --phone or --uid.");
  return resolveUserByPhone(db, args.phone);
}

async function resolveSuvbotEnableTargets({db, args}) {
  const targets = [];
  const phones = [];
  if (args.phone) phones.push(args.phone);
  phones.push(...phonesFromArgs(args));

  const seenPhones = new Set();
  for (const phone of phones) {
    const normalizedPhone = normalizePhone(phone);
    if (seenPhones.has(normalizedPhone)) continue;
    seenPhones.add(normalizedPhone);
    targets.push(await resolveUserByPhone(db, normalizedPhone));
  }

  if (args.uid) {
    targets.push({uid: args.uid, phoneNumber: args.phone ?? null, data: null});
  }

  const byUid = new Map();
  for (const target of targets) {
    const existing = byUid.get(target.uid);
    if (!existing) {
      byUid.set(target.uid, target);
      continue;
    }
    if (!existing.phoneNumber && target.phoneNumber) {
      existing.phoneNumber = target.phoneNumber;
    }
  }
  return [...byUid.values()];
}

function suvbotDeps(db) {
  return {
    firestore: () => db,
    serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
    timestampFromDate: (date) => admin.firestore.Timestamp.fromDate(date),
    now: () => new Date(),
  };
}

async function verifySuvbotEnablement({db, targets, accessCollection}) {
  const verification = [];
  for (const target of targets) {
    const [accessSnap, matchSnap, profileSnap, welcomeSnap] = await Promise.all([
      db.doc(`${accessCollection}/${target.uid}`).get(),
      db.doc(`matches/${target.matchId}`).get(),
      db.doc("publicProfiles/suvbot").get(),
      db.doc(`matches/${target.matchId}/messages/suvbot_welcome`).get(),
    ]);
    verification.push({
      uid: target.uid,
      phone: target.phoneNumber ?? null,
      matchId: target.matchId,
      accessEnabled: accessSnap.data()?.enabled === true,
      profileExists: profileSnap.exists,
      matchExists: matchSnap.exists,
      welcomeMessageExists: welcomeSnap.exists,
    });
  }
  return verification;
}

function runSeedCommand(command, args) {
  const seedArgs = [];
  if (command === "append-user" &&
    !args.anchorFile &&
    args.anchorUsers.length === 0 &&
    args.anchorPhones.length === 0 &&
    !args.phone &&
    args.phones.length === 0) {
    throw new Error("append-user requires --phone, --phones, --anchor-phones, --anchor-users, or --anchor-file.");
  }
  if (args.env) seedArgs.push("--env", args.env);
  if (args.project) seedArgs.push("--project", args.project);
  if (args.scenario) seedArgs.push("--scenario", args.scenario);
  if (args.seedPrefix) seedArgs.push("--seed-prefix", args.seedPrefix);
  if (args.anchorFile) seedArgs.push("--anchor-file", args.anchorFile);
  if (args.anchorUsers.length > 0) seedArgs.push("--anchor-users", args.anchorUsers.join(","));
  if (args.personaProfileProjection) {
    seedArgs.push("--persona-profile-projection", args.personaProfileProjection);
  }
  const seedAnchorPhones = [...args.anchorPhones];
  if (command === "append-user" && args.phone) seedAnchorPhones.push(args.phone);
  if (command === "append-user") seedAnchorPhones.push(...args.phones);
  if (seedAnchorPhones.length > 0) seedArgs.push("--anchor-phones", seedAnchorPhones.join(","));
  if (args.emulatorHost) seedArgs.push("--emulator-host", args.emulatorHost);
  if (args.apply) seedArgs.push("--apply");
  if (args.allowProd) seedArgs.push("--allow-prod");
  if (args.resetSynthetic) seedArgs.push("--reset-synthetic");
  if (args.json) seedArgs.push("--json");
  if (command === "append-user") seedArgs.push("--append-anchors");

  const result = spawnSync(
    process.execPath,
    [path.join(toolDir, "seed_demo_data.mjs"), ...seedArgs],
    {stdio: "inherit"}
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function parseArgs(argv) {
  const args = {
    env: null,
    project: null,
    scenario: "beta-full",
    seedPrefix: DEFAULT_DEMO_OPS_PREFIX,
    anchorUsers: [],
    anchorPhones: [],
    anchorFile: null,
    phone: null,
    phones: [],
    phoneFile: null,
    phoneA: null,
    phoneB: null,
    fromPhone: null,
    toPhone: null,
    uid: null,
    action: null,
    targetPhone: null,
    eventId: null,
    organizerId: null,
    lat: null,
    lng: null,
    meetingPoint: undefined,
    text: null,
    world: null,
    moment: null,
    candidateCount: DEFAULT_CROSS_PATHS_DEMO_CANDIDATE_COUNT,
    testPhone: null,
    testCode: null,
    seedPrefixes: [],
    keepSeedPrefixes: [],
    cleanupPast: true,
    cleanupCancelled: true,
    goldenFile: null,
    personaProfileProjection: null,
    personaCatalog: null,
    photoTaxonomy: null,
    photoComposition: null,
    photoPlanFormat: "text",
    assetStatuses: null,
    output: null,
    imagePilotConfig: null,
    imageProvider: null,
    imageModel: null,
    imageFallbackModel: null,
    imageSize: null,
    imageQuality: null,
    imageFormat: null,
    imageOutputDir: null,
    personas: [],
    requirePublishedAssets: false,
    allowEmpty: false,
    demoScenario: null,
    apply: false,
    update: false,
    check: false,
    allowProd: false,
    allowProdCrossPathsFixture: false,
    resetSynthetic: false,
    viaSwipes: false,
    viaSwipesOnly: false,
    withMessages: false,
    emulatorHost: null,
    skipFunctionsBuild: false,
    bypassSuvbotAccess: false,
    configureTestLogin: false,
    json: false,
    help: false,
  };
  const command = argv[0];
  for (let i = 1; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") args.help = true;
    else if (arg === "--json") args.json = true;
    else if (arg === "--apply") args.apply = true;
    else if (arg === "--update") args.update = true;
    else if (arg === "--check") args.check = true;
    else if (arg === "--allow-prod") args.allowProd = true;
    else if (arg === "--allow-prod-cross-paths-fixture") {
      args.allowProdCrossPathsFixture = true;
    }
    else if (arg === "--reset-synthetic") args.resetSynthetic = true;
    else if (arg === "--via-swipes") args.viaSwipes = true;
    else if (arg === "--with-messages") args.withMessages = true;
    else if (arg === "--skip-functions-build") args.skipFunctionsBuild = true;
    else if (arg === "--bypass-suvbot-access") args.bypassSuvbotAccess = true;
    else if (arg === "--configure-test-login") args.configureTestLogin = true;
    else if (arg === "--require-published-assets") args.requirePublishedAssets = true;
    else if (arg === "--allow-empty") args.allowEmpty = true;
    else if (arg === "--via-swipes-only") {
      args.viaSwipes = true;
      args.viaSwipesOnly = true;
      args.withMessages = false;
    } else if (arg === "--no-messages") args.withMessages = false;
    else if (arg === "--keep-past-events") args.cleanupPast = false;
    else if (arg === "--keep-cancelled-events") args.cleanupCancelled = false;
    else if (arg === "--emulator") args.emulatorHost = "127.0.0.1:8080";
    else if (arg === "--emulator-host") args.emulatorHost = requireValue(argv, ++i, arg);
    else if (arg === "--env") args.env = requireValue(argv, ++i, arg);
    else if (arg === "--project") args.project = requireValue(argv, ++i, arg);
    else if (arg === "--scenario") args.scenario = requireValue(argv, ++i, arg);
    else if (arg === "--seed-prefix") args.seedPrefix = requireValue(argv, ++i, arg);
    else if (arg === "--anchor-file") args.anchorFile = requireValue(argv, ++i, arg);
    else if (arg === "--anchor-users") args.anchorUsers = splitCsv(requireValue(argv, ++i, arg));
    else if (arg === "--anchor-phones") args.anchorPhones = splitCsv(requireValue(argv, ++i, arg));
    else if (arg === "--phone") args.phone = requireValue(argv, ++i, arg);
    else if (arg === "--phones") args.phones = splitCsv(requireValue(argv, ++i, arg));
    else if (arg === "--phone-file") args.phoneFile = requireValue(argv, ++i, arg);
    else if (arg === "--phone-a") args.phoneA = requireValue(argv, ++i, arg);
    else if (arg === "--phone-b") args.phoneB = requireValue(argv, ++i, arg);
    else if (arg === "--from-phone") args.fromPhone = requireValue(argv, ++i, arg);
    else if (arg === "--to-phone") args.toPhone = requireValue(argv, ++i, arg);
    else if (arg === "--uid") args.uid = requireValue(argv, ++i, arg);
    else if (arg === "--action") args.action = requireValue(argv, ++i, arg);
    else if (arg === "--target-phone") args.targetPhone = requireValue(argv, ++i, arg);
    else if (arg === "--test-phone") args.testPhone = requireValue(argv, ++i, arg);
    else if (arg === "--test-code") args.testCode = requireValue(argv, ++i, arg);
    else if (arg === "--event-id") args.eventId = requireValue(argv, ++i, arg);
    else if (arg === "--organizer-id") args.organizerId = requireValue(argv, ++i, arg);
    else if (arg === "--lat") args.lat = requireValue(argv, ++i, arg);
    else if (arg === "--lng") args.lng = requireValue(argv, ++i, arg);
    else if (arg === "--meeting-point") args.meetingPoint = requireValue(argv, ++i, arg);
    else if (arg === "--text") args.text = requireValue(argv, ++i, arg);
    else if (arg === "--world") args.world = requireValue(argv, ++i, arg);
    else if (arg === "--moment") args.moment = requireValue(argv, ++i, arg);
    else if (arg === "--seed-prefixes") args.seedPrefixes = splitCsv(requireValue(argv, ++i, arg));
    else if (arg === "--keep-seed-prefixes") args.keepSeedPrefixes = splitCsv(requireValue(argv, ++i, arg));
    else if (arg === "--golden-file") args.goldenFile = requireValue(argv, ++i, arg);
    else if (arg === "--persona-profile-projection") args.personaProfileProjection = requireValue(argv, ++i, arg);
    else if (arg === "--persona-catalog") args.personaCatalog = requireValue(argv, ++i, arg);
    else if (arg === "--photo-taxonomy") args.photoTaxonomy = requireValue(argv, ++i, arg);
    else if (arg === "--photo-composition") args.photoComposition = requireValue(argv, ++i, arg);
    else if (arg === "--format") args.photoPlanFormat = requireValue(argv, ++i, arg);
    else if (arg === "--asset-statuses") args.assetStatuses = splitCsv(requireValue(argv, ++i, arg));
    else if (arg === "--output") args.output = requireValue(argv, ++i, arg);
    else if (arg === "--image-pilot-config") args.imagePilotConfig = requireValue(argv, ++i, arg);
    else if (arg === "--image-provider") args.imageProvider = requireValue(argv, ++i, arg);
    else if (arg === "--image-model") args.imageModel = requireValue(argv, ++i, arg);
    else if (arg === "--image-fallback-model") args.imageFallbackModel = requireValue(argv, ++i, arg);
    else if (arg === "--image-size") args.imageSize = requireValue(argv, ++i, arg);
    else if (arg === "--image-quality") args.imageQuality = requireValue(argv, ++i, arg);
    else if (arg === "--image-format") args.imageFormat = requireValue(argv, ++i, arg);
    else if (arg === "--image-output-dir") args.imageOutputDir = requireValue(argv, ++i, arg);
    else if (arg === "--personas") args.personas = splitCsv(requireValue(argv, ++i, arg));
    else if (arg === "--demo-scenario") args.demoScenario = requireValue(argv, ++i, arg);
    else if (arg === "--synthetic-matches") {
      throw new Error(
        "--synthetic-matches is retired: warm-user starts a demo world, " +
        "whose After moment brings 2-3 catches."
      );
    } else if (arg === "--candidate-count") {
      args.candidateCount = Number(requireValue(argv, ++i, arg));
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (
    command === "seed-world" ||
    command === "append-user" ||
    command === "seed-cross-paths"
  ) {
    args.seedPrefix = args.seedPrefix === DEFAULT_DEMO_OPS_PREFIX ?
      DEFAULT_SEED_PREFIX :
      args.seedPrefix;
  }
  if (args.update && args.check) {
    throw new Error("--update and --check cannot be used together.");
  }
  return {command, args};
}

function printScenarioInfo(args) {
  const scenarios = args.demoScenario ?
    [loadScenarioConfig(args.demoScenario)] :
    listScenarioConfigs();
  if (args.json) {
    console.log(JSON.stringify({scenarios}, null, 2));
    return;
  }
  console.log("Demo scenarios:");
  for (const scenario of scenarios) {
    console.log(`- ${scenario.id}: ${scenario.label}`);
    console.log(`  ${scenario.description}`);
  }
}

function printGoldenAccounts(args) {
  const accounts = loadGoldenAccounts(args.goldenFile ?? undefined);
  if (args.json) {
    console.log(JSON.stringify({accounts}, null, 2));
    return;
  }
  console.log("Golden demo accounts:");
  for (const account of accounts) {
    console.log(`- ${account.role}: ${account.phone} (${account.scenario})`);
  }
}

function printPersonaCatalogValidation(args) {
  const {catalog, result, summary} = validatePersonaCatalogFromArgs(args);
  if (!result.valid) {
    if (args.json) {
      console.log(JSON.stringify({valid: false, summary, issues: result.issues}, null, 2));
    } else {
      console.error("Persona catalog invalid");
      for (const issue of result.issues) console.error(`- ${issue}`);
    }
    process.exitCode = 1;
    return;
  }
  if (args.json) {
    console.log(JSON.stringify({valid: true, summary}, null, 2));
    return;
  }
  console.log("Persona catalog valid");
  console.log(`Catalog: ${summary.id}`);
  console.log(`Personas: ${summary.personaCount}`);
  console.log(`Photos: ${summary.photoCount}`);
  console.log(`Uploaded photos: ${summary.uploadedPhotoCount}`);
  console.log(`Running photos: ${summary.runningPhotoCount}`);
  console.log(`Cities: ${JSON.stringify(summary.cityCounts)}`);
  console.log(`Genders: ${JSON.stringify(summary.genderCounts)}`);
  console.log(`Photo categories: ${JSON.stringify(summary.categoryCounts)}`);
  console.log(`Category shares: ${JSON.stringify(summary.categoryShares)}`);
  console.log(`Activity shares: ${JSON.stringify(summary.activityShares)}`);
  if (summary.cityPhotoComposition) {
    console.log(`City composition: ${JSON.stringify(summary.cityPhotoComposition)}`);
  }
  if (summary.cohortPhotoComposition) {
    console.log(`Cohort composition: ${JSON.stringify(summary.cohortPhotoComposition)}`);
  }
  void catalog;
}

function printPersonaPhotoPlan(args) {
  const {catalog, result, summary, photoTaxonomy, photoCompositionIndex} =
    validatePersonaCatalogFromArgs(args);
  if (!result.valid) {
    if (args.json) {
      console.log(JSON.stringify({valid: false, summary, issues: result.issues}, null, 2));
    } else {
      console.error("Persona catalog invalid");
      for (const issue of result.issues) console.error(`- ${issue}`);
    }
    process.exitCode = 1;
    return;
  }
  const plan = personaPhotoGenerationPlan(catalog, {
    photoTaxonomy,
    photoCompositionIndex,
  });
  if (args.json) {
    console.log(JSON.stringify({valid: true, plan}, null, 2));
    return;
  }
  if (args.photoPlanFormat === "markdown") {
    process.stdout.write(formatPersonaPhotoGenerationPlanMarkdown(plan));
    return;
  }
  if (args.photoPlanFormat !== "text") {
    throw new Error("--format must be text or markdown.");
  }
  console.log("Persona photo generation plan");
  console.log(`Catalog: ${plan.catalogId}`);
  console.log(`Photos: ${plan.photos.length}`);
  console.log(`Categories: ${JSON.stringify(plan.summary.categoryCounts)}`);
  console.log(`Activities: ${JSON.stringify(plan.summary.activityCounts)}`);
  for (const photo of plan.photos) {
    console.log(
      `- ${photo.displayName} #${photo.position}: ${photo.categoryId}/${photo.activityId}`
    );
    console.log(`  ${photo.scene}`);
  }
}

function printPersonaProfileProjection(args) {
  const {catalog, result, summary, photoTaxonomy, photoCompositionIndex} =
    validatePersonaCatalogFromArgs(args);
  if (!result.valid) {
    if (args.json) {
      console.log(JSON.stringify({valid: false, summary, issues: result.issues}, null, 2));
    } else {
      console.error("Persona catalog invalid");
      for (const issue of result.issues) console.error(`- ${issue}`);
    }
    process.exitCode = 1;
    return;
  }
  if (!args.assetStatuses || args.assetStatuses.length === 0) {
    console.error(
      "persona-profile-projection requires --asset-statuses planned, generated, uploaded, or all."
    );
    process.exitCode = 64;
    return;
  }

  const projection = personaProfileProjection(catalog, {
    assetStatuses: args.assetStatuses,
    photoTaxonomy,
    photoCompositionIndex,
  });
  if (projection.projectedPhotoCount === 0 && !args.allowEmpty) {
    console.error(
      "Sales demo persona profile seed projection has zero profile photos for the selected asset statuses."
    );
    console.error(
      "Use --asset-statuses planned/generated/all, or pass --allow-empty when auditing an intentionally empty status slice."
    );
    process.exitCode = 1;
    return;
  }
  const outputPath = args.output ?
    path.resolve(path.resolve(toolDir, "../.."), args.output) :
    DEFAULT_PERSONA_PROFILE_PROJECTION_PATH;

  if (args.check) {
    const expected = stableJson(projection);
    const actual = fs.existsSync(outputPath) ?
      fs.readFileSync(outputPath, "utf8") :
      null;
    if (actual !== expected) {
      console.error("Sales demo persona profile seed projection artifact is stale.");
      console.error(`Run: node tool/demo/demo_ops.mjs persona-profile-projection --asset-statuses ${projection.assetStatuses.join(",")} --output ${path.relative(path.resolve(toolDir, "../.."), outputPath)} --update`);
      process.exitCode = 1;
    } else if (!args.json) {
      console.log(`Sales demo persona profile seed projection artifact is current: ${path.relative(path.resolve(toolDir, "../.."), outputPath)}`);
    }
    return;
  }

  if (args.update) {
    fs.mkdirSync(path.dirname(outputPath), {recursive: true});
    fs.writeFileSync(outputPath, stableJson(projection));
    if (!args.json) {
      console.log(`Wrote ${path.relative(path.resolve(toolDir, "../.."), outputPath)}`);
    }
    return;
  }

  if (args.json) {
    console.log(JSON.stringify({valid: true, projection}, null, 2));
    return;
  }

  console.log("Sales demo persona profile seed projection");
  console.log(`Catalog: ${projection.catalogId}`);
  console.log(`Asset statuses: ${projection.assetStatuses.join(", ")}`);
  console.log(`Personas: ${projection.personaCount}`);
  console.log(`Projected profile photos: ${projection.projectedPhotoCount}`);
  console.log("Use --json to emit the app-ready projection payload.");
}

async function runPersonaImageGenerate(args) {
  const {catalog, result, summary} = validatePersonaCatalogFromArgs(args);
  if (!result.valid) {
    if (args.json) {
      console.log(JSON.stringify({valid: false, summary, issues: result.issues}, null, 2));
    } else {
      console.error("Persona catalog invalid");
      for (const issue of result.issues) console.error(`- ${issue}`);
    }
    process.exitCode = 1;
    return;
  }

  const pilotConfig = loadPersonaImagePilotConfig(
    args.imagePilotConfig ?? DEFAULT_PERSONA_IMAGE_PILOT_PATH
  );
  const batch = buildPersonaImageGenerationBatch(catalog, {
    pilotConfig,
    personaIds: args.personas,
    provider: args.imageProvider ?? undefined,
    model: args.imageModel ?? undefined,
    fallbackModel: args.imageFallbackModel ?? undefined,
    size: args.imageSize ?? undefined,
    quality: args.imageQuality ?? undefined,
    imageFormat: args.imageFormat ?? undefined,
    outputDir: args.imageOutputDir ?? DEFAULT_PERSONA_IMAGE_OUTPUT_DIR,
  });

  if (args.json && !args.apply) {
    console.log(JSON.stringify({valid: true, apply: false, batch}, null, 2));
    return;
  }
  if (args.photoPlanFormat === "markdown" && !args.apply) {
    process.stdout.write(formatPersonaImageGenerationBatchMarkdown(batch));
    return;
  }
  if (args.photoPlanFormat === "jsonl" && !args.apply) {
    process.stdout.write(formatPersonaImageGenerationBatchJsonl(batch));
    return;
  }
  if (!["text", "markdown", "jsonl"].includes(args.photoPlanFormat)) {
    throw new Error("--format must be text, markdown, or jsonl.");
  }

  if (!args.json) printPersonaImageBatchSummary(batch, args.apply);
  if (!args.apply) {
    console.log("\nDry run only. Re-run with --apply to generate local images.");
    return;
  }

  let manifest;
  try {
    manifest = await generatePersonaImageBatch(batch, {
      onProgress: args.json ? null : ({event, persona, photo, result}) => {
        if (event === "start") {
          console.log(`Generating ${persona.displayName} #${photo.position + 1} (${photo.requestKind})...`);
        } else if (event === "complete") {
          console.log(`Generated ${persona.displayName} #${photo.position + 1} with ${result.model}.`);
        }
      },
    });
  } catch (error) {
    if (args.json) {
      console.log(JSON.stringify({
        valid: false,
        apply: true,
        error: {
          message: error.message,
          status: error.status ?? null,
          code: error.code ?? null,
          type: error.type ?? null,
          manifestPath: error.manifestPath ?? null,
        },
      }, null, 2));
    } else {
      console.error(`\nImage generation failed: ${error.message}`);
      if (error.code) console.error(`${batch.provider} code: ${error.code}`);
      if (error.manifestPath) console.error(`Failure manifest: ${error.manifestPath}`);
    }
    process.exitCode = 1;
    return;
  }
  if (args.json) {
    console.log(JSON.stringify({valid: true, apply: true, batch, manifest}, null, 2));
    return;
  }
  console.log("\nGenerated:");
  console.log(`Manifest: ${manifest.manifestPath}`);
  console.log(`Images: ${manifest.outputs.length}`);
  for (const output of manifest.outputs) {
    console.log(`- ${output.displayName} #${output.position + 1}: ${output.localPath}`);
  }
}

function printPersonaImageBatchSummary(batch, apply) {
  console.log("Persona image generation batch");
  console.log(`Mode: ${apply ? "apply" : "dry run"}`);
  console.log(`Batch: ${batch.id}`);
  console.log(`Catalog: ${batch.catalogId}`);
  console.log(`Provider: ${batch.provider}`);
  console.log(`Model: ${batch.model}`);
  console.log(`Fallback model: ${batch.fallbackModel}`);
  console.log(`Size: ${batch.size}`);
  console.log(`Quality: ${batch.quality}`);
  console.log(`Image format: ${batch.imageFormat}`);
  console.log(`Reference strategy: ${batch.referenceStrategy}`);
  console.log(`Output dir: ${batch.outputDir}`);
  console.log(`Personas: ${batch.personaCount}`);
  console.log(`Photos: ${batch.photoCount}`);
  for (const persona of batch.personas) {
    const requests = persona.photos.map((photo) =>
      `${photo.position + 1}:${photo.requestKind}`
    ).join(", ");
    console.log(`- ${persona.displayName}: ${requests}`);
  }
}

function validatePersonaCatalogFromArgs(args) {
  const catalogPath = path.resolve(
    path.resolve(toolDir, "../.."),
    args.personaCatalog ?? DEFAULT_PERSONA_CATALOG_PATH
  );
  const photoTaxonomyPath = path.resolve(
    path.resolve(toolDir, "../.."),
    args.photoTaxonomy ?? DEFAULT_PHOTO_ACTIVITY_TAXONOMY_PATH
  );
  const photoCompositionPath = path.resolve(
    path.resolve(toolDir, "../.."),
    args.photoComposition ?? DEFAULT_PHOTO_COMPOSITION_INDEX_PATH
  );
  const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  const photoTaxonomy = loadPhotoActivityTaxonomy(photoTaxonomyPath);
  const photoCompositionIndex = loadPhotoCompositionIndex(photoCompositionPath);
  const result = validatePersonaCatalog(catalog, {
    photoTaxonomy,
    photoCompositionIndex,
    requirePublishedAssets: args.requirePublishedAssets,
    source: catalogPath,
  });
  const summary = personaCatalogSummary(catalog);
  return {catalog, result, summary, photoTaxonomy, photoCompositionIndex};
}

function phonesFromArgs(args) {
  const phones = [...args.phones];
  if (args.phoneFile) {
    const raw = fs.readFileSync(args.phoneFile, "utf8");
    phones.push(
      ...raw.split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"))
    );
  }
  return phones;
}

function guardProdWrite({args, projectId}) {
  if (args.apply && isFirebaseProductionTarget({env: args.env, projectId}) && !args.allowProd) {
    throw new Error("Refusing to write to prod without --allow-prod.");
  }
}

function requireArg(args, key, flag) {
  if (!args[key]) throw new Error(`${flag} is required.`);
  return args[key];
}

function requireValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function printPlan({args, projectId, title, plan, manifest, appliedSummary}) {
  if (args.json) {
    console.log(JSON.stringify({projectId, apply: args.apply, plan, manifest, appliedSummary}, null, 2));
    return;
  }
  console.log(title);
  console.log(`Project: ${projectId}`);
  console.log(`Mode: ${args.apply ? "apply" : "dry run"}`);
  if (plan.command) console.log(`Command: ${plan.command}`);
  if (plan.operationId) console.log(`Operation: ${plan.operationId}`);
  if (plan.uid) console.log(`User: ${plan.uid}`);
  if (plan.phone) console.log(`Phone: ${plan.phone}`);
  if (plan.action) console.log(`Action: ${plan.action}`);
  if (plan.matchId) console.log(`Match: ${plan.matchId}`);
  if (plan.eventId) console.log(`Event: ${plan.eventId}`);
  if (plan.users) console.log(`Users: ${plan.users.length}`);
  if (plan.threadPaths) console.log(`Suvbot paths: ${plan.threadPaths.length}`);
  if (plan.docs) console.log(`Docs to write: ${plan.docs.length}`);
  if (plan.paths) console.log(`Docs to delete: ${plan.paths.length}`);
  if (plan.pairCount) console.log(`Pairs: ${plan.pairCount}`);
  if (manifest?.operationId) {
    console.log(`Manifest: ${manifest.operationId}`);
  }
  if (plan.reply) console.log(`Reply: ${plan.reply}`);
  if (appliedSummary) {
    console.log("\nApplied:");
    for (const [key, value] of Object.entries(appliedSummary)) {
      console.log(`- ${key}: ${JSON.stringify(value)}`);
    }
  } else if (plan.reports) {
    if (typeof plan.readyCount === "number") {
      console.log(`Ready users: ${plan.readyCount}/${plan.reports.length}`);
    }
    for (const report of plan.reports) {
      const status = report.demoReady ? "ready" : report.issues?.join("; ") ?? "review gaps";
      console.log(`- ${report.uid}: ${status}`);
      if (Array.isArray(report.canDemo)) {
        console.log(`  Can demo: ${report.canDemo.join(", ") || "nothing yet"}`);
      }
      if (Array.isArray(report.gaps) && report.gaps.length > 0) {
        console.log(`  Gaps: ${report.gaps.join(", ")}`);
      }
    }
  } else {
    console.log("\nDry run only. Re-run with --apply to write changes.");
  }
}

function printCommands() {
  console.log(`Demo ops commands:
- seed-world
- append-user
- suvbot-actions
- suvbot-enable
- suvbot
- match-phones
- warm-user
- warm-group
- reset-user-demo-state
- validate-demo-state
- demo-checklist
- cleanup-demo-data
- cleanup-stale-events
- seed-cross-paths
- make-event-full
- promote-waitlist
- create-unread-message
- create-refund
- create-host-account
- create-check-in-event
- scenario-info
- list-golden-accounts
- validate-persona-catalog
- persona-photo-plan
- persona-profile-projection
- persona-image-generate`);
}

function printHelp() {
  console.log(`Catch demo operations CLI

Usage:
  node tool/demo/demo_ops.mjs seed-world --env prod --anchor-file tool/demo/demo_seed/beta_anchors.txt --apply --reset-synthetic --allow-prod
  node tool/demo/demo_ops.mjs append-user --env prod --anchor-phones +919999999999 --apply --allow-prod
  node tool/demo/demo_ops.mjs suvbot-actions
  node tool/demo/demo_ops.mjs suvbot-enable --env prod --phones +91...,+91... --apply --allow-prod
  node tool/demo/demo_ops.mjs suvbot --env prod --phone +91... --action warmChatState --apply --allow-prod
  node tool/demo/demo_ops.mjs suvbot --env prod --phone +91... --action startDemoWorld --world host-marketing-india --moment live --apply --allow-prod
  node tool/demo/demo_ops.mjs match-phones --env prod --phone-a +91... --phone-b +91... --apply --allow-prod
  node tool/demo/demo_ops.mjs warm-user --env prod --phone +91... [--world <worldId> --moment <before|today|live|after>] --apply --allow-prod
  node tool/demo/demo_ops.mjs warm-group --env prod --phones +91...,+91...,+91... --apply --allow-prod
  node tool/demo/demo_ops.mjs reset-user-demo-state --env prod --phone +91... --apply --allow-prod
  node tool/demo/demo_ops.mjs validate-demo-state --env prod --phones +91...,+91...
  node tool/demo/demo_ops.mjs cleanup-demo-data --env prod --allow-prod
  node tool/demo/demo_ops.mjs cleanup-stale-events --env prod --apply --allow-prod
  node tool/demo/demo_ops.mjs seed-cross-paths --env dev --apply
  node tool/demo/demo_ops.mjs seed-cross-paths --env dev --apply --configure-test-login --test-phone +16505550101 --test-code 123456
  node tool/demo/demo_ops.mjs seed-cross-paths --env prod --seed-prefix cross_paths_mumbai_qa --uid cross_paths_mumbai_qa_user_002 --event-id cross_paths_mumbai_qa_run_mumbai_01_01 --organizer-id courtside --candidate-count 2 --configure-test-login --test-phone +16505550101 --test-code 123456 --apply --allow-prod --allow-prod-cross-paths-fixture
  node tool/demo/demo_ops.mjs create-check-in-event --env prod --phone +91... --lat 28.6 --lng 77.2 --apply --allow-prod
  node tool/demo/demo_ops.mjs demo-checklist --env prod --phone +91...
  node tool/demo/demo_ops.mjs scenario-info --demo-scenario investor-demo
  node tool/demo/demo_ops.mjs validate-persona-catalog --persona-catalog tool/demo/demo_seed/personas/us_nyc_sales_personas.draft.json
  node tool/demo/demo_ops.mjs persona-photo-plan --persona-catalog tool/demo/demo_seed/personas/us_nyc_sales_personas.draft.json
  node tool/demo/demo_ops.mjs persona-profile-projection --persona-catalog tool/demo/demo_seed/personas/us_nyc_sales_personas.draft.json --asset-statuses planned --json
  node tool/demo/demo_ops.mjs persona-profile-projection --asset-statuses planned --output tool/demo/demo_seed/personas/us_nyc_sales_profile_projection.planned.json --check
  node tool/demo/demo_ops.mjs persona-image-generate --persona-catalog tool/demo/demo_seed/personas/us_nyc_sales_personas.draft.json

Common options:
  --env <dev|staging|prod>       Resolve project id from .firebaserc.
  --project <firebase-project>   Explicit project id.
  --apply                        Write/delete documents. Default is dry run.
  --update                       Update local generated artifacts for commands that support it.
  --check                        Check local generated artifacts for commands that support it.
  --allow-prod                   Required for prod writes.
  --allow-prod-cross-paths-fixture
                                 Required for the exact production Mumbai QA fixture.
  --json                         Machine-readable output.
  --emulator / --emulator-host   Use Firestore emulator.
  --skip-functions-build         Use existing functions/lib Suvbot code.
  --bypass-suvbot-access         Admin-only: run Suvbot without allowlist doc.

Command options:
  --phone <phone>                One E.164 phone number.
  --phones <phone,...>           Comma-separated phone numbers.
  --phone-a / --phone-b          Pair for match-phones (both Suvbot-enabled).
  --from-phone / --to-phone      Sender and recipient for unread-message.
  --action <actionId>            Suvbot action id from suvbot-actions.
  --target-phone <phone>         Tester phone for Suvbot matchTesterByPhone.
  --event-id <eventId>           Event for make-event-full, promote-waitlist, create-refund.
  --world <worldId>              Demo world for Start a demo (see suvbot-actions / help).
  --moment <moment>              before, today, live or after. Default: after.
  --organizer-id <organizerId>   Bind the Cross Paths QA event to one organizer.
  --lat / --lng                  Event coordinates for host/check-in creation.
  --meeting-point <label>        Meeting label for host/check-in creation.
  --text <message>               Demo chat message text.
  --candidate-count <1|2>        seed-cross-paths profile count. Default: 2.
  --configure-test-login         Create/reuse the selected dev Auth user and
                                 configure its fictional Firebase test phone.
  --test-phone <phone>           Fictional +1 650-555-01xx test phone.
  --test-code <six digits>       Firebase test-phone verification code. Never
                                 commit a real person's phone or OTP.
  --seed-prefixes <prefix,...>   cleanup-demo-data prefixes.
  --keep-seed-prefixes <prefix,...>
                                 Preserve selected synthetic QA worlds during cleanup.
  --keep-past-events               cleanup-stale-events leaves past seeded events.
  --keep-cancelled-events          cleanup-stale-events leaves cancelled seeded events.
  --demo-scenario <name|path>    scenario-info target.
  --golden-file <path>           Golden account registry JSON.
  --persona-catalog <path>       Persona catalog for validate-persona-catalog.
  --photo-taxonomy <path>        Photo activity taxonomy for persona validation.
  --photo-composition <path>     Photo composition index for persona validation.
  --format <text|markdown|jsonl> persona-photo-plan/persona-image-generate output format.
  --asset-statuses <statuses>    sales demo persona profile seed projection statuses: uploaded, generated, planned, or all.
  --allow-empty                  Allow the sales demo profile seed projection to emit zero profile photos.
  --output <path>                sales demo profile seed projection artifact path.
  --require-published-assets     Require uploaded persona assets.
  --image-pilot-config <path>    Image generation pilot JSON.
  --personas <id,...>            Persona IDs for persona-image-generate.
  --image-provider <provider>    Image provider: openai or gemini. Default openai.
  --image-model <model>          Image model. Default from pilot config.
  --image-fallback-model <model> Fallback image model if the primary is unavailable.
  --image-size <size>            Image size. Default 1024x1536.
  --image-quality <quality>      Image quality. Default high.
  --image-format <jpeg|png|webp> Saved image format. Default jpeg for OpenAI, png for Gemini.
  --image-output-dir <path>      Local generated image output directory.
  --anchor-file <path>           seed-world/append-user anchor file.
  --anchor-phones <phone,...>    seed-world/append-user real users.
  --anchor-users <uid,...>       seed-world/append-user real users.
  --persona-profile-projection <path>
                                seed-world/append-user synthetic identity projection.
  --scenario <name>              seed-world/append-user scenario. Default beta-full.
  --seed-prefix <prefix>         Demo operation or world seed prefix.
`);
}

function isMain() {
  return process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href;
}
