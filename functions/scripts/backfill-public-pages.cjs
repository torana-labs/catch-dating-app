#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {parseArgs: parseNodeArgs} = require("node:util");

const usage = `Usage: node scripts/backfill-public-pages.cjs --project <id> [options]

Builds the public page read models (organizerPublicPage and eventPublicPage)
for every published organizer and every organizer that already has pages,
using the same rebuild the Functions triggers run. A dry run, the default,
reads everything and prints what each organizer's rebuild would create,
update or delete without writing. Build first: npm --prefix functions run
build.

Options:
  --project <id>     Firebase project id (required).
  --organizer <id>   Limit the run to one organizer.
  --check            Exit 1 while any organizer's pages are out of date.
  --apply            Rebuild and write the pages.
  --allow-prod       Required with --apply against the prod project.
  -h, --help         Show this help.
`;

function parseArgs(argv) {
  const {values} = parseNodeArgs({
    args: argv,
    options: {
      "project": {type: "string"},
      "organizer": {type: "string"},
      "check": {type: "boolean", default: false},
      "apply": {type: "boolean", default: false},
      "allow-prod": {type: "boolean", default: false},
      "help": {type: "boolean", short: "h", default: false},
    },
    strict: true,
  });
  const args = {
    project: values.project ?? null,
    organizer: values.organizer ?? null,
    check: values.check,
    apply: values.apply,
    allowProd: values["allow-prod"],
    help: values.help,
  };
  if (args.help) return args;
  if (typeof args.project !== "string" || !/^[a-z0-9-]+$/.test(args.project)) {
    throw new Error("Provide an explicit --project id.");
  }
  if (args.organizer !== null &&
      !/^[A-Za-z0-9][A-Za-z0-9_-]{0,179}$/.test(args.organizer)) {
    throw new Error("--organizer must be an organizer document id.");
  }
  if (args.apply && args.check) {
    throw new Error("Use --check or --apply, not both.");
  }
  return args;
}

function prodProjectId(
  firebaseRcPath = path.resolve(__dirname, "../../.firebaserc")
) {
  try {
    return JSON.parse(fs.readFileSync(firebaseRcPath, "utf8")).projects?.prod ??
      null;
  } catch {
    return null;
  }
}

function loadRebuild() {
  try {
    return require("../lib/publicPages/rebuild");
  } catch (error) {
    throw new Error(
      "Could not load lib/publicPages/rebuild.js. " +
        `Run npm --prefix functions run build first. ${error.message}`
    );
  }
}

async function run(argv, {db, prodProject, rebuild = loadRebuild(),
  now = Date.now, log = console.log}) {
  const args = parseArgs(argv);
  if (args.apply && args.project === prodProject && !args.allowProd) {
    throw new Error("--apply against the prod project requires --allow-prod.");
  }
  const ids = args.organizer ?
    [args.organizer] : await rebuild.listPublicPageScopes(db);
  if (!args.apply) {
    const plans = [];
    for (const id of ids) plans.push(await rebuild.planOrganizerScope(db, id, now()));
    const pending = plans.filter(rebuild.planChanges);
    log(JSON.stringify({project: args.project, mode: args.check ? "check" : "dry-run",
      scopes: plans.length, pending: pending.length, plans: pending}, null, 2));
    return args.check && pending.length > 0 ? 1 : 0;
  }
  const results = {};
  const failed = [];
  for (const id of ids) {
    try {
      // The final pass rebuilds every page, so no per-page rail fan-out.
      results[id] = await rebuild.rebuildOrganizerScope(db, id, {fanOut: false});
    } catch (error) {
      failed.push({organizerId: id, error: error.message});
    }
  }
  log(JSON.stringify({project: args.project, mode: "apply", scopes: ids.length,
    failed, results}, null, 2));
  return failed.length > 0 ? 1 : 0;
}

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(usage);
    return;
  }
  const admin = require("firebase-admin");
  const app = admin.initializeApp({projectId: args.project});
  try {
    process.exitCode = await run(argv, {db: app.firestore(),
      prodProject: prodProjectId()});
  } finally {
    await app.delete();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {main, parseArgs, prodProjectId, run};
