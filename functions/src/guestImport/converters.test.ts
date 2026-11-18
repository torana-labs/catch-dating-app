import assert from "node:assert/strict";
import test from "node:test";

import {readGuestTable} from "./registry";
import {parseCsvMatrix} from "./table";

// Header layouts follow each platform's export; every name, number and
// address below is fictional.

function read(csv: string) {
  return readGuestTable(parseCsvMatrix(csv));
}

test("Google Forms responses: names and phones come from the questions",
  () => {
    const result = read(
      "Timestamp,Email Address,Your full name,What's your WhatsApp number?," +
      "Instagram handle name\n" +
      "2026/11/01 10:00:00 AM GMT+5:30,mira@example.com,Mira Fictional," +
      "98765 43210,mira.fixture\n");
    assert.equal(result.adapter.adapterId, "google-forms-v1");
    assert.deepEqual(result.rows[0].value, {rowId: "2",
      displayName: "Mira Fictional", phone: "98765 43210",
      email: "mira@example.com", externalReference: null,
      arrivalGroup: null, ticketType: null, status: "registered"});
    assert.deepEqual(result.rows[0].fields.phone,
      {column: 3, header: "What's your WhatsApp number?"});
  });

test("Google Forms: a brand or friend's name question is not the guest's",
  () => {
    const result = read(
      "Timestamp,Company name,Name of the friend who referred you," +
      "Name,Phone\n" +
      "2026/11/01,Sandbar Fixture Co,Ravi Sample,Asha Sample,9876543210\n");
    assert.equal(result.rows[0].value.displayName, "Asha Sample");
  });

test("Typeform: response id is the reference, first and last are joined",
  () => {
    const result = read(
      "#,First name,Last name,Phone number,Email,Response Type," +
      "Start Date (UTC),Stage Date (UTC),Submit Date (UTC),Network ID,Tags\n" +
      "r7fixture,Asha,Sample,+919876543210,asha@example.com,completed," +
      "2026-11-01 10:00:00,2026-11-01 10:02:00,2026-11-01 10:02:00," +
      "net1,\n");
    assert.equal(result.adapter.adapterId, "typeform-v1");
    assert.equal(result.rows[0].value.displayName, "Asha Sample");
    assert.equal(result.rows[0].value.externalReference, "r7fixture");
    assert.equal(result.rows[0].fields.externalReference?.header,
      "Response ID");
  });

test("Townscript: the booking groups attendees, the ticket is the reference",
  () => {
    const result = read(
      "Booking Id,Booking Date,Ticket Name,Ticket Number,Attendee Name," +
      "Email Id,Mobile No\n" +
      "TS-1,2026-11-01,Early bird,T-1,Asha Sample,asha@example.com," +
      "9876543210\n" +
      "TS-1,2026-11-01,Early bird,T-2,Ravi Sample,ravi@example.com," +
      "9876543211\n");
    assert.equal(result.adapter.adapterId, "townscript-v1");
    assert.deepEqual(result.rows.map((row) => [row.value.displayName,
      row.value.externalReference, row.value.arrivalGroup,
      row.value.email, row.value.phone, row.value.ticketType]), [
      ["Asha Sample", "T-1", "TS-1", "asha@example.com", "9876543210",
        "Early bird"],
      ["Ravi Sample", "T-2", "TS-1", "ravi@example.com", "9876543211",
        "Early bird"],
    ]);
  });

test("Instamojo: failed payments are skipped with a reason", () => {
  const result = read(
    "Payment ID,Link/Purpose,Buyer Name,Buyer Phone,Buyer Email,Quantity," +
    "Amount,Status,Created At\n" +
    "MOJO1,Moonmoth Social,Asha Sample,+919876543210,asha@example.com,1," +
    "499.00,Credit,2026-11-01\n" +
    "MOJO2,Moonmoth Social,Ravi Sample,+919876543211,ravi@example.com,1," +
    "499.00,Failed,2026-11-01\n");
  assert.equal(result.adapter.adapterId, "instamojo-v1");
  assert.deepEqual(result.rows.map((row) => [row.value.displayName,
    row.value.externalReference, row.value.arrivalGroup,
    row.value.email]), [["Asha Sample", "MOJO1", null, "asha@example.com"]]);
  assert.deepEqual(result.skipped.map((row) =>
    [row.sourceRowNumber, row.reason]), [[3, "excluded-status"]]);
});

test("existing converters keep winning their own exports", () => {
  assert.equal(read("Name,Approval Status,Registration Date,Ticket Type," +
    "Guest Key\nAsha Sample,approved,2026-11-01,General,g-1\n")
    .adapter.adapterId, "luma-v1");
  assert.equal(read("Name,RSVP Status,Phone Number,Email\n" +
    "Asha Sample,Going,9876543210,asha@example.com\n").adapter.adapterId,
  "partiful-v1");
});

test("a reader records per-field provenance and skipped rows", () => {
  const result = read("Name,Phone,Status\nAsha Sample,9876543210,\n" +
    ",9876543211,\n");
  assert.deepEqual(result.rows[0].fields, {
    displayName: {column: 0, header: "Name"},
    phone: {column: 1, header: "Phone"},
  });
  assert.deepEqual(result.rows[0].rawCells, ["Asha Sample", "9876543210",
    ""]);
  assert.deepEqual(result.skipped.map((row) => row.reason),
    ["missing-name"]);
  assert.equal(result.truncatedCount, 0);
});
