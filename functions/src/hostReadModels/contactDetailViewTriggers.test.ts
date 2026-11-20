import assert from "node:assert/strict";
import test from "node:test";
import {
  contactDetailContactChanged,
  contactDetailContactsForEdge,
  contactDetailEventChanged,
  contactDetailPayersForPayment,
} from "./contactDetailViewTriggers";

test("only fields the view reads re-evaluate a contact", () => {
  const contact = {organizerId: "org", linkedUid: "zoya",
    identityState: "verified", deletedAt: null, hiddenAt: null,
    displayName: "Zoya", revision: 2};
  assert.equal(contactDetailContactChanged(contact,
    {...contact, displayName: "Zoya M", revision: 3}), false);
  assert.equal(contactDetailContactChanged(contact,
    {...contact, linkedUid: null, identityState: "unlinked"}), true);
  assert.equal(contactDetailContactChanged(contact,
    {...contact, hiddenAt: 5}), true);
  assert.equal(contactDetailContactChanged(undefined, contact), true);
  assert.equal(contactDetailContactChanged(contact, undefined), true);
});

test("an edge write re-evaluates the contact before and after", () => {
  const edge = {contactId: "c1", eventId: "e1", status: "registered"};
  assert.deepEqual(contactDetailContactsForEdge(edge, edge), []);
  assert.deepEqual(contactDetailContactsForEdge(edge,
    {...edge, status: "checkedIn"}), ["c1"]);
  assert.deepEqual(contactDetailContactsForEdge(edge,
    {...edge, contactId: "c2"}), ["c1", "c2"]);
  assert.deepEqual(contactDetailContactsForEdge(undefined, edge), ["c1"]);
});

test("a payment re-evaluates its payer only when revenue facts move", () => {
  const payment = {purpose: "booking", userId: "zoya", eventId: "e1",
    status: "pending", amountMinor: 5000, currency: "INR", updatedAt: 1};
  assert.deepEqual(contactDetailPayersForPayment(payment,
    {...payment, updatedAt: 2}), []);
  assert.deepEqual(contactDetailPayersForPayment(payment,
    {...payment, status: "completed"}), ["zoya"]);
  assert.deepEqual(contactDetailPayersForPayment(undefined, payment),
    ["zoya"]);
});

test("an event's title and origin re-evaluate its contacts", () => {
  const event = {name: "Supper", bookedCount: 3,
    eventOrigin: {mode: "native", provider: null}};
  assert.equal(contactDetailEventChanged(event,
    {...event, bookedCount: 4}), false);
  assert.equal(contactDetailEventChanged(event,
    {...event, name: "Long Supper"}), true);
  assert.equal(contactDetailEventChanged(undefined, event), false);
  assert.equal(contactDetailEventChanged(event, undefined), true);
});
