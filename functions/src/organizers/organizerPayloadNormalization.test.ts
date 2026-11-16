import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeCreateOrganizerPayload,
  normalizeOrganizerIdPayload,
  normalizeUpdateOrganizerPayload,
} from "./organizerPayloadNormalization";

test("create organizer normalization trims canonical fields", () => {
  assert.deepEqual(
    normalizeCreateOrganizerPayload({
      organizerId: " organizer-1 ",
      name: " Catch Runners ",
      description: " Weekly social runs ",
      location: " Bengaluru ",
      area: " Indiranagar ",
      organizerType: " community ",
      email: " hello@example.com ",
      phoneNumber: null,
    }),
    {
      organizerId: "organizer-1",
      name: "Catch Runners",
      description: "Weekly social runs",
      location: "bengaluru",
      area: "Indiranagar",
      organizerType: "community",
      email: "hello@example.com",
      phoneNumber: null,
    }
  );
});

test("update organizer normalization trims patch fields and tag values", () => {
  assert.deepEqual(
    normalizeUpdateOrganizerPayload({
      organizerId: " organizer-1 ",
      fields: {
        name: " New name ",
        location: " Mumbai ",
        organizerType: " venue ",
        tags: [" running ", " social ", 4],
      },
    }),
    {
      organizerId: "organizer-1",
      fields: {
        name: "New name",
        location: "mumbai",
        organizerType: "venue",
        tags: ["running", "social", 4],
      },
    }
  );
});

test("organizer id normalization preserves non-object inputs",
  () => {
    assert.deepEqual(
      normalizeOrganizerIdPayload({organizerId: " organizer-1 "}),
      {organizerId: "organizer-1"}
    );
    assert.equal(normalizeCreateOrganizerPayload(null), null);
    assert.deepEqual(normalizeUpdateOrganizerPayload([]), []);
  });
