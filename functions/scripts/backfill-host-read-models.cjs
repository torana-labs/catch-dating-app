#!/usr/bin/env node
"use strict";

const admin = require("firebase-admin");
const {backfillContactSummaries, activateContactSummaries} =
  require("../lib/hostReadModels/contactBackfill");

const {backfillSimpleSummaries, activateSimpleSummaries} =
  require("../lib/hostReadModels/simpleStore");

const {backfillResponseSummaries, activateResponseSummaries} =
  require("../lib/hostReadModels/responseStore");

const {backfillOrganizerAttention} =
  require("../lib/hostReadModels/attentionStore");

const {backfillEventSetupViews} =
  require("../lib/hostReadModels/eventSetupViewStore");

const {backfillEventSetupDefaultView} =
  require("../lib/hostReadModels/eventSetupDefaultViewStore");

const {backfillProviderConnectionView} =
  require("../lib/hostReadModels/providerConnectionViewStore");

const {backfillRosterInsights} =
  require("../lib/hostReadModels/rosterInsightViewStore");

const {backfillEventCaseViews} =
  require("../lib/hostReadModels/eventCaseViewStore");

const {backfillEventDeliveryViews} =
  require("../lib/hostReadModels/eventDeliveryViewStore");

const {backfillMovementViews, movementViewModels} =
  require("../lib/hostReadModels/movementViewBackfill");

// Read models every environment rebuilds under the clean-schema mandate:
// the client reads them unconditionally, so they have no activation marker.
const evaluatedModels = {
  "attention": backfillOrganizerAttention,
  "event-setup": backfillEventSetupViews,
  "event-setup-defaults": backfillEventSetupDefaultView,
  "provider-connections": backfillProviderConnectionView,
  "roster-insights": backfillRosterInsights,
  "case-views": backfillEventCaseViews,
  "delivery-views": backfillEventDeliveryViews,
};

async function main(argv = process.argv.slice(2)) {
  const args = new Map();
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    if (["--apply", "--activate"].includes(flag)) args.set(flag, true);
    else if (["--project", "--organizer", "--model"].includes(flag)) {
      args.set(flag, argv[++index]);
    } else throw new Error(`Unknown argument: ${flag}`);
  }
  const projectId = args.get("--project");
  const organizerId = args.get("--organizer");
  if (typeof projectId !== "string" || !/^[a-z0-9-]+$/.test(projectId) ||
      typeof organizerId !== "string" || !/^[A-Za-z0-9_-]+$/.test(organizerId)) {
    throw new Error("Provide explicit --project and --organizer identifiers.");
  }
  const model = args.get("--model") ?? "contacts";
  const movement = movementViewModels.includes(model);
  if (!["contacts", "forms", "events", "groups", "responses",
    ...Object.keys(evaluatedModels), ...movementViewModels].includes(model)) {
    throw new Error("Use --model contacts, forms, events, groups, responses, " +
      "attention, event-setup, event-setup-defaults, provider-connections, " +
      "roster-insights, case-views, delivery-views, " +
      movementViewModels.join(", ") + ".");
  }
  const apply = args.get("--apply") === true;
  if ((model in evaluatedModels || movement) && args.has("--activate")) {
    throw new Error(`The ${model} model has no activation; omit --activate.`);
  }
  if (args.has("--activate") && !apply) {
    throw new Error("Activation requires --apply and successful parity.");
  }
  const app = admin.initializeApp({projectId});
  try {
    const db = app.firestore();
    if (model in evaluatedModels) {
      const report = await evaluatedModels[model](db, organizerId, apply);
      console.log(JSON.stringify({projectId, organizerId, model, apply,
        ...report}));
      return;
    }
    // The live console's movement views: the organizer's events that have
    // not ended, and their departure rosters.
    if (movement) {
      const report = await backfillMovementViews(db, organizerId, model,
        apply);
      console.log(JSON.stringify({projectId, organizerId, model, apply,
        ...report}));
      return;
    }
    const scanned = model === "contacts" ?
      await backfillContactSummaries(db, organizerId, apply) :
      model === "responses" ?
        await backfillResponseSummaries(db, organizerId, apply) :
        await backfillSimpleSummaries(db, model, organizerId, apply);
    const activated = args.has("--activate") ?
      (model === "contacts" ? await activateContactSummaries(db, organizerId) :
        model === "responses" ? await activateResponseSummaries(db, organizerId) :
          await activateSimpleSummaries(db, model, organizerId)) : null;
    console.log(JSON.stringify({projectId, organizerId, model, apply, scanned,
      activated}));
  } finally {
    await app.delete();
  }
}
if (require.main === module) main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
module.exports = {main};
