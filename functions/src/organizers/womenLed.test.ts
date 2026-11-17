import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {
  adminEventWomenLed,
  adminOrganizerWomenLed,
  eventWomenLed,
  hostEventWomenLed,
  hostOrganizerWomenLed,
  hostWomenLedRole,
  organizerWomenLed,
  womenLedLocked,
} from "./womenLed";
import {contractFixture} from "../shared/contractFixtures";
import {validateOrganizerDocument} from
  "../shared/generated/validators/organizerDocument";
import {validateEventDocument} from
  "../shared/generated/validators/eventDocument";
import {validatePublicOrganizerDocument} from
  "../shared/generated/validators/publicOrganizerDocument";
import {validateUpdateOrganizerCallablePayload} from
  "../shared/generated/validators/updateOrganizerInput";
import {validateUpdateEventCallablePayload} from
  "../shared/generated/validators/updateEventInput";
import {validateAdminUpdateOrganizerDetailsCallablePayload} from
  "../shared/generated/validators/adminUpdateOrganizerDetailsInput";
import {validateAdminUpdateEventDetailsCallablePayload} from
  "../shared/generated/validators/adminUpdateEventDetailsInput";
import {validateExploreSearchCallablePayload} from
  "../shared/generated/validators/exploreSearchInput";

const now = Timestamp.fromMillis(Date.parse("2026-11-16T10:00:00.000Z"));
const owner = {uid: "host-1", role: "owner" as const};
const manager = {uid: "manager-1", role: "manager" as const};

const declared = (value: boolean, overrides = {}) => ({
  value, setByUid: "host-1", setByRole: "owner" as const, setAt: now,
  lockedByAdmin: false, ...overrides,
});
const locked = () => ({value: false, setByUid: "admin-1",
  setByRole: "admin" as const, setAt: now, lockedByAdmin: true});

test("the label resolves from the event override, else the organizer",
  () => {
    assert.equal(organizerWomenLed({}), false);
    assert.equal(organizerWomenLed({womenLed: declared(true)}), true);
    assert.equal(organizerWomenLed({womenLed: declared(false)}), false);
    assert.equal(organizerWomenLed({womenLed: locked()}), false);

    const organizer = {womenLed: declared(true)};
    assert.equal(eventWomenLed(organizer), true, "imported events inherit");
    assert.equal(eventWomenLed(organizer, {}), true);
    assert.equal(eventWomenLed(organizer, {womenLed: {...declared(true),
      value: null}}), true);
    assert.equal(eventWomenLed(organizer, {womenLed: declared(false)}),
      false);
    assert.equal(eventWomenLed({}, {womenLed: declared(true)}), true);
  });

test("an admin lock on the organizer or the event clears the label", () => {
  assert.equal(eventWomenLed({womenLed: declared(true)},
    {womenLed: locked()}), false);
  assert.equal(eventWomenLed({womenLed: locked()},
    {womenLed: declared(true)}), false);
  assert.equal(womenLedLocked(locked()), true);
  assert.equal(womenLedLocked(declared(true)), false);
  assert.equal(womenLedLocked(undefined), false);
});

test("Host organizer edits record who set the label, in which role, when",
  () => {
    assert.equal(hostWomenLedRole(true), "owner");
    assert.equal(hostWomenLedRole(false), "manager");
    assert.deepEqual(hostOrganizerWomenLed(undefined, true, owner, now),
      {value: true, setByUid: "host-1", setByRole: "owner", setAt: now,
        lockedByAdmin: false});
    assert.deepEqual(hostOrganizerWomenLed(declared(true), false, manager,
      now), {value: false, setByUid: "manager-1", setByRole: "manager",
      setAt: now, lockedByAdmin: false});
    // A repeated value is not a new declaration.
    assert.equal(hostOrganizerWomenLed(declared(true), true, manager, now),
      null);
  });

test("Host edits cannot lift an admin lock", () => {
  assert.throws(() => hostOrganizerWomenLed(locked(), true, owner, now),
    /admin reviewed/);
  assert.equal(hostOrganizerWomenLed(locked(), false, owner, now), null);
  assert.throws(() => hostEventWomenLed(locked(), true, false, owner, now),
    /admin reviewed/);
  assert.throws(() => hostEventWomenLed(undefined, true, true, owner, now),
    /admin reviewed/);
  assert.equal(hostEventWomenLed(locked(), null, false, owner, now), null);
  assert.equal(hostEventWomenLed(locked(), false, false, owner, now), null);
  // Following or declining under an organizer lock is harmless.
  assert.deepEqual(hostEventWomenLed(undefined, false, true, manager, now),
    {value: false, setByUid: "manager-1", setByRole: "manager", setAt: now,
      lockedByAdmin: false});
});

test("Host event edits override or follow the organizer default", () => {
  assert.deepEqual(hostEventWomenLed(undefined, true, false, manager, now),
    {value: true, setByUid: "manager-1", setByRole: "manager", setAt: now,
      lockedByAdmin: false});
  assert.deepEqual(hostEventWomenLed(declared(true), null, false, owner, now),
    {value: null, setByUid: "host-1", setByRole: "owner", setAt: now,
      lockedByAdmin: false});
  assert.equal(hostEventWomenLed(undefined, null, false, owner, now), null);
});

test("admin set, clear and release are audited as admin", () => {
  assert.deepEqual(adminOrganizerWomenLed(undefined, "set", "admin-1", now),
    {value: true, setByUid: "admin-1", setByRole: "admin", setAt: now,
      lockedByAdmin: false});
  assert.deepEqual(adminOrganizerWomenLed(declared(true), "clear", "admin-1",
    now), locked());
  assert.deepEqual(adminOrganizerWomenLed(locked(), "release", "admin-2",
    now), {value: false, setByUid: "admin-2", setByRole: "admin",
    setAt: now, lockedByAdmin: false});
  assert.equal(adminOrganizerWomenLed(declared(true), "release", "admin-2",
    now).value, true);
  assert.deepEqual(adminEventWomenLed("clear", "admin-1", now), locked());
  assert.deepEqual(adminEventWomenLed("release", "admin-1", now),
    {value: null, setByUid: "admin-1", setByRole: "admin", setAt: now,
      lockedByAdmin: false});
  assert.equal(adminEventWomenLed("set", "admin-1", now).value, true);
});

test("contracts accept declarations with audit fields only", () => {
  const organizer = contractFixture("organizer_doc");
  const event = contractFixture("event_doc");
  const errors = (validate: {errors?: unknown}) =>
    JSON.stringify(validate.errors);
  assert.equal(validateOrganizerDocument({...organizer,
    womenLed: declared(true)}), true, errors(validateOrganizerDocument));
  assert.equal(validateOrganizerDocument({...organizer, womenLed: locked()}),
    true, errors(validateOrganizerDocument));
  assert.equal(validateEventDocument({...event, womenLed: {...declared(true),
    value: null}}), true, errors(validateEventDocument));
  // A bare boolean, a missing audit field or a null organizer value fail.
  assert.equal(validateOrganizerDocument({...organizer, womenLed: true}),
    false);
  const {setByUid: _setByUid, ...withoutAuditUid} = declared(true);
  void _setByUid;
  assert.equal(validateOrganizerDocument({...organizer,
    womenLed: withoutAuditUid}), false);
  assert.equal(validateOrganizerDocument({...organizer,
    womenLed: {...declared(true), value: null}}), false);
  assert.equal(validateEventDocument({...event,
    womenLed: {...declared(true), setByRole: "guest"}}), false);
  // The public projection holds the resolved boolean, never the audit.
  const publicOrganizer = contractFixture("public_organizer_doc");
  assert.equal(publicOrganizer.womenLed, true);
  assert.equal(validatePublicOrganizerDocument(publicOrganizer), true,
    errors(validatePublicOrganizerDocument));
  assert.equal(validatePublicOrganizerDocument({...publicOrganizer,
    womenLed: declared(true)}), false);
});

test("callable contracts take the Host value and the admin action", () => {
  const organizerPayload = contractFixture("update_organizer_payload");
  assert.equal(organizerPayload.fields.womenLed, true);
  assert.equal(validateUpdateOrganizerCallablePayload(organizerPayload), true);
  assert.equal(validateUpdateOrganizerCallablePayload({organizerId: "club-1",
    fields: {womenLed: null}}), false);
  const eventPayload = contractFixture("update_event_payload");
  assert.equal(eventPayload.fields.womenLed, null);
  assert.equal(validateUpdateEventCallablePayload(eventPayload), true);
  assert.equal(validateUpdateEventCallablePayload({eventId: "event-1",
    fields: {womenLed: "yes"}}), false);
  for (const action of ["set", "clear", "release"]) {
    assert.equal(validateAdminUpdateOrganizerDetailsCallablePayload({
      organizerId: "club-1", fields: {womenLed: action},
      reviewNote: "Moderation."}), true, action);
    assert.equal(validateAdminUpdateEventDetailsCallablePayload({
      eventId: "event-1", fields: {womenLed: action},
      reviewNote: "Moderation."}), true, action);
  }
  assert.equal(validateAdminUpdateOrganizerDetailsCallablePayload({
    organizerId: "club-1", fields: {womenLed: true}}), false);
  assert.equal(validateAdminUpdateEventDetailsCallablePayload({
    eventId: "event-1", fields: {womenLed: "lock"}}), false);
  assert.equal(validateExploreSearchCallablePayload({query: "run",
    womenLedOnly: true}), true);
  assert.equal(validateExploreSearchCallablePayload({query: "run",
    womenLedOnly: "true"}), false);
});
