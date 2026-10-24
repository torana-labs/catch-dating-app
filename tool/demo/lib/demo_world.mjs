// Demo world scenarios (schemaVersion 2): one fictional world per file whose
// per-moment state is derived from timestamped guest records, never stored.
// See docs/plans/demo_world_scenarios_spec.md.
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolDir, "../../..");
const schemaPath = path.join(toolDir, "..", "demo_seed", "schema", "demo_world.schema.json");
const eventCommonPath = path.join(repoRoot, "contracts", "shared", "event_common.schema.json");

// Doors open before the start time; a check-in earlier than this is an error.
const doorsOpenMinutes = 30;

let worldSchema;

export function isDemoWorld(config) {
  return config?.schemaVersion === 2;
}

export function validateDemoWorld(world, label = world?.id ?? "demo world") {
  worldSchema ??= JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  const errors = schemaErrors(world, worldSchema, worldSchema, "");
  if (errors.length) {
    throw new Error(`${label} does not match the demo world schema: ${errors.join("; ")}`);
  }
  const problems = invariantProblems(world);
  if (problems.length) throw new Error(`${label} breaks demo world invariants:\n  - ${problems.join("\n  - ")}`);
  return world;
}

/** Guest state for one event at one named moment, derived from attendance. */
export function eventStateAt(world, eventId, moment) {
  const event = requireEvent(world, eventId);
  const at = requireMoment(world, moment);
  const active = event.attendance.filter((record) =>
    record.bookedAt <= at && !(record.cancelledAt && record.cancelledAt <= at));
  const start = `${event.civilDate}T${event.startTime}:00`;
  const end = `${event.civilDate}T${event.endTime}:00`;
  return {
    booked: active.length,
    checkedIn: active.filter((record) => record.checkedInAt && record.checkedInAt <= at).length,
    capacity: event.capacity,
    phase: at < start ? "upcoming" : at < end ? "live" : "ended",
  };
}

/** The values website copy may quote about an event at a moment. */
export function demoWorldFacts(world, eventId, moment) {
  const event = requireEvent(world, eventId);
  const venue = world.venues.find((item) => item.id === event.venueId);
  return {
    eventName: event.name,
    organizerName: world.organizer.name,
    venueName: venue.name,
    area: venue.area,
    civilDate: event.civilDate,
    startTime: event.startTime,
    endTime: event.endTime,
    priceInPaise: event.priceInPaise,
    currency: world.currency,
    ...eventStateAt(world, eventId, moment),
  };
}

// A dependency-free check of the JSON Schema keywords demo_world.schema.json
// uses (Demo Ops CI installs no root packages). An unsupported keyword is an
// error, so the schema file stays the single definition of the format.
const annotationKeywords = new Set(["$schema", "$id", "title", "description"]);
const checkedKeywords = new Set(["type", "properties", "required", "additionalProperties", "items", "minItems",
  "uniqueItems", "enum", "const", "pattern", "minLength", "minimum", "maximum", "minProperties", "propertyNames",
  "$ref", "$defs"]);

function schemaErrors(value, schema, root, at) {
  for (const keyword of Object.keys(schema)) {
    if (!annotationKeywords.has(keyword) && !checkedKeywords.has(keyword)) {
      throw new Error(`demo_world.schema.json uses unsupported keyword ${keyword} at ${at || "/"}`);
    }
  }
  if (schema.$ref) {
    const name = schema.$ref.replace(/^#\/\$defs\//, "");
    if (!root.$defs?.[name]) throw new Error(`demo_world.schema.json has no $defs/${name}`);
    return schemaErrors(value, root.$defs[name], root, at);
  }
  const where = at || "/";
  const kind = Array.isArray(value) ? "array" : value === null ? "null" :
    Number.isInteger(value) ? "integer" : typeof value;
  if ("const" in schema && value !== schema.const) return [`${where} must equal ${JSON.stringify(schema.const)}`];
  if (schema.enum && !schema.enum.includes(value)) return [`${where} must be one of ${schema.enum.join(", ")}`];
  if (schema.type && !(schema.type === kind || (schema.type === "number" && kind === "integer"))) {
    return [`${where} must be ${schema.type}`];
  }
  const errors = [];
  if (kind === "string") {
    if (schema.minLength != null && value.length < schema.minLength) errors.push(`${where} must not be empty`);
    if (schema.pattern && !new RegExp(schema.pattern, "u").test(value)) errors.push(`${where} must match ${schema.pattern}`);
  }
  if (kind === "integer" || kind === "number") {
    if (schema.minimum != null && value < schema.minimum) errors.push(`${where} must be at least ${schema.minimum}`);
    if (schema.maximum != null && value > schema.maximum) errors.push(`${where} must be at most ${schema.maximum}`);
  }
  if (kind === "array") {
    if (schema.minItems != null && value.length < schema.minItems) errors.push(`${where} needs at least ${schema.minItems} item(s)`);
    if (schema.uniqueItems && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) errors.push(`${where} must not repeat items`);
    if (schema.items) value.forEach((item, index) => errors.push(...schemaErrors(item, schema.items, root, `${at}/${index}`)));
  }
  if (kind === "object") {
    const keys = Object.keys(value);
    if (schema.minProperties != null && keys.length < schema.minProperties) errors.push(`${where} needs at least ${schema.minProperties} field(s)`);
    for (const key of schema.required ?? []) if (!(key in value)) errors.push(`${where} is missing ${key}`);
    for (const key of keys) {
      const child = `${at}/${key}`;
      if (schema.propertyNames) errors.push(...schemaErrors(key, schema.propertyNames, root, `${child} (name)`));
      if (schema.properties?.[key]) errors.push(...schemaErrors(value[key], schema.properties[key], root, child));
      else if (schema.additionalProperties === false) errors.push(`${child} is not a field of the demo world format`);
      else if (typeof schema.additionalProperties === "object") errors.push(...schemaErrors(value[key], schema.additionalProperties, root, child));
    }
  }
  return errors;
}

function invariantProblems(world) {
  const problems = [];
  const peopleIds = new Set(world.people.map((person) => person.id));
  const venueIds = new Set(world.venues.map((venue) => venue.id));
  const enums = productionEnums();
  duplicates(world.people.map((person) => person.id)).forEach((id) => problems.push(`person ${id} is listed twice`));
  duplicates(world.venues.map((venue) => venue.id)).forEach((id) => problems.push(`venue ${id} is listed twice`));
  duplicates(world.events.map((event) => event.id)).forEach((id) => problems.push(`event ${id} is listed twice`));

  const moments = Object.entries(world.moments);
  for (let index = 1; index < moments.length; index += 1) {
    if (moments[index][1] <= moments[index - 1][1]) {
      problems.push(`moment ${moments[index][0]} is not after ${moments[index - 1][0]}`);
    }
  }

  for (const event of world.events) {
    const label = `event ${event.id}`;
    if (!venueIds.has(event.venueId)) problems.push(`${label} uses unknown venue ${event.venueId}`);
    if (!enums.activityKind.has(event.activityKind)) problems.push(`${label} activityKind ${event.activityKind} is not a production activity kind`);
    if (!enums.interactionModel.has(event.format.interactionModel)) problems.push(`${label} interactionModel ${event.format.interactionModel} is not a production interaction model`);
    if (!enums.admissionPreset.has(event.format.admissionPreset)) problems.push(`${label} admissionPreset ${event.format.admissionPreset} is not a production admission preset`);
    if (event.endTime <= event.startTime) problems.push(`${label} ends before it starts`);
    for (const role of ["viewer", "wingmanTarget"]) {
      const personId = event.guestPerspective?.[role];
      if (personId && !peopleIds.has(personId)) problems.push(`${label} guestPerspective.${role} is unknown person ${personId}`);
    }
    duplicates(event.attendance.map((record) => record.personId)).forEach((id) => problems.push(`${label} books ${id} twice`));

    const doorsOpen = shiftMinutes(`${event.civilDate}T${event.startTime}:00`, -doorsOpenMinutes);
    const end = `${event.civilDate}T${event.endTime}:00`;
    for (const record of event.attendance) {
      const who = `${label} guest ${record.personId}`;
      if (!peopleIds.has(record.personId)) problems.push(`${who} is not in people`);
      if (record.bookedAt >= end) problems.push(`${who} books after the event ends`);
      if (record.checkedInAt) {
        if (record.checkedInAt < record.bookedAt) problems.push(`${who} checks in before booking`);
        if (record.checkedInAt < doorsOpen || record.checkedInAt > end) problems.push(`${who} checks in outside the event window`);
        if (record.cancelledAt && record.cancelledAt <= record.checkedInAt) problems.push(`${who} checks in after cancelling`);
      }
      if (record.cancelledAt && record.cancelledAt < record.bookedAt) problems.push(`${who} cancels before booking`);
    }
    for (const moment of Object.keys(world.moments)) {
      const state = eventStateAt(world, event.id, moment);
      if (state.booked > event.capacity) problems.push(`${label} is over capacity at ${moment} (${state.booked}/${event.capacity})`);
    }
  }
  return problems;
}

let enumCache;
function productionEnums() {
  if (enumCache) return enumCache;
  const schema = JSON.parse(fs.readFileSync(eventCommonPath, "utf8"));
  const definitions = schema.definitions;
  enumCache = {
    activityKind: new Set(definitions.activityKind.enum),
    interactionModel: new Set(definitions.eventInteractionModel.enum),
    admissionPreset: new Set(definitions.eventPolicyDefaults.properties.admissionPreset.enum),
  };
  return enumCache;
}

function requireEvent(world, eventId) {
  const event = world.events.find((item) => item.id === eventId);
  if (!event) throw new Error(`${world.id} has no event ${eventId}.`);
  return event;
}

function requireMoment(world, moment) {
  const at = world.moments[moment];
  if (!at) throw new Error(`${world.id} has no moment ${moment}.`);
  return at;
}

function duplicates(values) {
  const seen = new Set();
  return [...new Set(values.filter((value) => seen.has(value) || !seen.add(value)))];
}

/** Adds minutes to a civil date-time string without converting time zones. */
function shiftMinutes(civil, minutes) {
  const value = new Date(`${civil}Z`);
  value.setUTCMinutes(value.getUTCMinutes() + minutes);
  return value.toISOString().slice(0, 19);
}
