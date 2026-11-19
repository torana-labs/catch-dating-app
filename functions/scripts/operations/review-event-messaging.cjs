#!/usr/bin/env node
"use strict";

const path = require("node:path");
const {pathToFileURL} = require("node:url");
const {MESSAGE_PURPOSES} = require(
  "../../lib/eventSuccess/operations/messageContactability.js");

function parseFlags(argv) {
  const names = ["environment", "project", "event", "organizer", "route",
    "sender", "purpose"];
  const flags = {};
  for (let i = 0; i < argv.length; i += 2) {
    const name = argv[i].slice(2);
    const value = argv[i + 1];
    if (argv[i] !== `--${name}` || !names.includes(name) || flags[name] ||
        !value || value.startsWith("--")) throw new Error("Invalid review arguments");
    flags[name] = value;
  }
  if (names.some((name) => !flags[name]) ||
      !["dev", "prod"].includes(flags.environment) ||
      !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(flags.project) ||
      !["catchEventSms", "catchEventRcs", "organizerEventWhatsapp"].includes(flags.route) ||
      !MESSAGE_PURPOSES.includes(flags.purpose) ||
      [flags.event, flags.organizer, flags.sender].some((id) =>
        !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(id))) {
    throw new Error("An explicit environment, project, event, organizer, route, sender and purpose are required");
  }
  return flags;
}

async function main(argv) {
  const flags = parseFlags(argv);
  const {readFirebaseProjectAliases} = await import(pathToFileURL(path.resolve(
    __dirname, "../../../tool/lib/firebase_project.mjs")).href);
  validateTarget(flags, readFirebaseProjectAliases());
  const {initializeApp, deleteApp} = require("firebase-admin/app");
  const {getFirestore} = require("firebase-admin/firestore");
  const {reviewEventMessageSetup} = require(
    "../../lib/eventSuccess/operations/messageSetupReview.js");
  const app = initializeApp({projectId: flags.project}, "event-messaging-review");
  try {
    const review = await reviewEventMessageSetup(getFirestore(app), {
      context: {mode: "live", eventId: flags.event, organizerId: flags.organizer},
      routeId: flags.route, senderId: flags.sender, purpose: flags.purpose,
    });
    process.stdout.write(JSON.stringify({schemaVersion: 1, projectId: flags.project,
      environment: flags.environment,
      backend: process.env.FIRESTORE_EMULATOR_HOST ? "firestoreEmulator" : "firestore",
      review}, null, 2) + "\n");
  } finally {
    await deleteApp(app);
  }
}

if (require.main === module) {
  main(process.argv.slice(2)).catch(() => {
    // SDK exceptions can contain private document or credential context.
    process.stderr.write(JSON.stringify({ok: false,
      error: "Event messaging setup could not be reviewed. Check the explicit scope, environment and read access."}) + "\n");
    process.exitCode = 1;
  });
}

function validateTarget(flags, aliases) {
  if (aliases[flags.environment] !== flags.project) {
    throw new Error("The project must match the selected Firebase environment");
  }
}

module.exports = {parseFlags, validateTarget, main};
