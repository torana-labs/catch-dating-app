import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync, writeFileSync} from "node:fs";
import {room, role} from "./groupStaffTestFixtures";
import {practiceStaffProjection} from "./groupStaff";
import {practiceSettingsProjection, preparePracticeSettings,
  PracticeSettingsCommand} from "./assistanceSettings";
import type {PracticeCaseAuthority} from "./assistanceCases";
import {evaluatePracticeAutomation} from "./assistanceAutomation";
import {practiceDeparture, practicePlan} from "./assistanceTestFixtures";
import {BRAND} from "../shared/generated/brand";

test("native settings fixtures bind scope, inheritance and receipts", () => {
  const h = room(); const samples: Record<string, unknown> = {};
  const actions: Record<string, unknown>[] = [];
  const sample = (name: string,
    authority: PracticeCaseAuthority = h.authority) => {
    samples[name] = JSON.parse(JSON.stringify({
      session: {id: h.id, ...h.session,
        virtualStartedAtMillis: h.session.virtualStartedAt.toMillis(),
        virtualNowMillis: h.session.virtualNow.toMillis(),
        expiresAtMillis: h.session.expiresAt.toMillis()},
      actors: h.actors, actions, guestUrl:
        `${BRAND.web.origin}/rehearse/practicepublic1234567890`,
      canUseInternalFaults: false,
      staffReview: practiceStaffProjection(h.id, h.session, authority),
      settingsReview: practiceSettingsProjection(h.id, h.session, authority),
    }));
  };
  const change = (command: PracticeSettingsCommand, clientActionId: string) => {
    h.session.assistanceSettings = preparePracticeSettings(h.id, h.session,
      h.actors, command, h.authority);
    h.session.runtimeRevision++; h.session.actionCount++;
    actions.push({clientActionId, actorId: null, kind: "control",
      name: "settings:" + command.kind,
      runtimeRevision: h.session.runtimeRevision,
      virtualNowMillis: h.session.virtualNow.toMillis()});
  };
  const review = () => practiceSettingsProjection(h.id, h.session, h.authority);
  sample("initial");
  const p = practicePlan(h.session.virtualNow.toMillis());
  change({kind: "configure", expectedSourceHash: review().sourceHash,
    configuration: {routes: p.routes, responseDeadline: null,
      deliveryPolicy: p.deliveryPolicy, laterChoices: [],
      outcomes: [{kind: "unknown", reason: "timeout"}, {kind: "delivered"}]}},
  "practice_configure");
  sample("configured");
  change({kind: "setRule", expectedSourceHash: review().sourceHash,
    groupId: "event:whole", preference: {kind: "configured",
      template: review().suggested}}, "practice_rule");
  sample("ruleApplied");
  const departures = new Map([["easy", practiceDeparture(h.session,
    h.id, "one", "easy").record]]);
  h.actors[0] = evaluatePracticeAutomation(h.session, h.actors[0], [],
    departures).actor;
  sample("enrolled");
  change({kind: "pause", expectedSourceHash: review().sourceHash},
    "practice_pause");
  sample("paused");
  change({kind: "setRule", expectedSourceHash: review().sourceHash,
    groupId: "easy", preference: {kind: "disabled"}}, "practice_disable_group");
  sample("disabledGroup");
  change({kind: "setRule", expectedSourceHash: review().sourceHash,
    groupId: "easy", preference: {kind: "inherit"}}, "practice_inherit");
  sample("inherited");
  sample("operator", role(h));
  h.session.status = "complete";
  sample("complete");
  const path = "../test/event_rehearsal/fixtures/settings_reviews.json";
  if (process.env.UPDATE_REHEARSAL_SETTINGS_FIXTURE === "1") {
    writeFileSync(path, JSON.stringify(samples, null, 2) + "\n");
  }
  assert.deepEqual(JSON.parse(readFileSync(path, "utf8")), samples);
});
