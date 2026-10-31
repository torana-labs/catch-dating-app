#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Schema-derived Dart domain class generator (CONTRACT-DART-GEN-002).
//
// Emits freezed + json_serializable Dart domain classes FROM the JSON Schemas
// under contracts/, so projected fields derive nullability and wire metadata
// from their schema rather than a parallel hand-maintained Dart declaration.
//
// Run with:
//   node tool/contracts/generate_domain_classes.mjs           # write
//   node tool/contracts/generate_domain_classes.mjs --check    # CI parity check
//
// After regenerating, run build_runner so the freezed/json_serializable parts
// pick up the new shape:
//   dart run build_runner build
//
// ── Why this is declarative, not "emit every schema field" ──────────────────
// The hand-written Dart domain classes are deliberately CURATED projections of
// the Firestore schemas, not mechanical 1:1 mirrors. For example PaymentDocument
// has provider/stripeAccountId/applicationFeeAmount fields the client Payment
// class intentionally omits, and MatchDocument requires participantIds which the
// Match class does not carry. Emitting the full schema would change the public
// API and the wire shape (toJson keys), which the conservatism rules forbid and
// which test/core/domain_fixture_parity_test.dart guards against.
//
// So each generated class is described by an explicit projection spec: an ordered
// list of fields, each tracking a schema property by name. The generator:
//   • RESOLVES the schema (with $ref bundling) and, for every declared field,
//     ASSERTS the schema still contains that property — if a schema field a
//     class depends on is renamed or removed, generation FAILS loudly (drift
//     surfaced), instead of the Dart class silently drifting.
//   • Derives Dart nullability from the schema (type union with "null", anyOf
//     null branch, or absence from `required`) so the field's nullable semantics
//     match the schema.
//   • Emits real Dart enum references, @TimestampConverter()/@NullableTimestamp
//     Converter() for timestamp fields, @JsonKey flags, and @Default(...) values.
//
// Hand-written derived getters / computed methods / label maps move to companion
// hand-written EXTENSION files (e.g. event_constraints_extensions.dart). The
// generated class is pure data shape; behavior is layered on via `extension on`.
//
// Classes that cannot be safely synthesized (custom fromJson migrations, hand-
// rolled non-freezed serialization, non-schema sentinel defaults, intertwined
// catalog helpers, union/legacy shapes) are intentionally LEFT hand-written.
// See HAND_WRITTEN_NOTES at the bottom of this file for the per-class reason.
// ─────────────────────────────────────────────────────────────────────────────
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolDir, "../..");
const contractRoot = path.join(repoRoot, "contracts");
const checkOnly = process.argv.includes("--check");

// ── Reusable shared import fragments ────────────────────────────────────────
const IMPORT_FREEZED =
  "import 'package:freezed_annotation/freezed_annotation.dart';";
const IMPORT_CONVERTERS =
  "import 'package:catch_dating_app/platform/firebase/firestore_converters.dart';";
const IMPORT_CURRENCY =
  "import 'package:catch_dating_app/kernel/country_markets.dart';";
const IMPORT_LABELLED =
  "import 'package:catch_dating_app/kernel/labelled.dart';";

// ── Class projection specs ──────────────────────────────────────────────────
//
// Each spec describes ONE generated Dart file. `classes` is an ordered list of
// freezed classes emitted into that file (first is the primary). Each field:
//   name      Dart + JSON field name (must exist as a schema property unless
//             `synthetic: true`, e.g. the document-id field injected on read).
//   dartType  Base Dart type ("String", "int", "double", "bool", or an enum /
//             nested class name). Nullability is appended by the generator from
//             the schema; pass `forceNullable`/`forceRequired` to override.
//   enumType  If set, the field is an enum: references the named Dart enum.
//   timestamp "required" | "nullable" — emits @TimestampConverter /
//             @NullableTimestampConverter and uses DateTime.
//   default   Raw Dart default expression for @Default(...). Mutually exclusive
//             with the freezed `required` keyword.
//   jsonKey   Extra @JsonKey() flags object, e.g. {includeToJson: false}.
//   emptyJsonKey  Emit a bare @JsonKey() (preserves an existing annotation).
//   unknownEnumValue  Dart expression for @JsonKey(unknownEnumValue: ...).
//   pointer   (class-level) JSON pointer into the bundled schema for a nested
//             class shape (e.g. /properties/ownerResponse).
//
// `enums` declares Dart enums emitted in the file. `imports` are extra imports.
// `extensionFile`, when set, names the hand-written companion extension file
// (NOT generated here; it must exist and is referenced for documentation only).

const SPECS = [
{
  "className": "EventMeetingLocation",
  "schema": "shared/event_common.schema.json",
  "pointer": "/definitions/eventMeetingLocation",
  "output": "lib/contexts/events/domain/event_meeting_location.dart",
  "extensionFile": "lib/contexts/events/domain/event_meeting_location_extensions.dart",
  "classes": [
    {
      "name": "EventMeetingLocation",
      "fields": [
        {
          "name": "name",
          "dartType": "String"
        },
        {
          "name": "address",
          "dartType": "String"
        },
        {
          "name": "placeId",
          "dartType": "String"
        },
        {
          "name": "latitude",
          "dartType": "double"
        },
        {
          "name": "longitude",
          "dartType": "double"
        },
        {
          "name": "notes",
          "dartType": "String"
        }
      ]
    }
  ]
},
{
  "className": "EventItineraryItem",
  "schema": "shared/event_common.schema.json",
  "pointer": "/definitions/eventItineraryItem",
  "output": "lib/contexts/events/domain/event_itinerary.dart",
  "extensionFile": "lib/contexts/events/domain/event_itinerary_extensions.dart",
  "imports": [
    "import 'package:catch_dating_app/contexts/events/domain/event_meeting_location.dart';"
  ],
  "enums": [
    {
      "name": "EventItineraryKind",
      "schemaPointer": "/definitions/eventItineraryItem/properties/kind",
      "renames": {
        "break": "breakTime"
      }
    }
  ],
  "classes": [
    {
      "name": "EventItineraryItem",
      "fields": [
        {
          "name": "id",
          "dartType": "String"
        },
        {
          "name": "kind",
          "dartType": "EventItineraryKind"
        },
        {
          "name": "offsetMinutes",
          "dartType": "int"
        },
        {
          "name": "durationMinutes",
          "dartType": "int"
        },
        {
          "name": "title",
          "dartType": "String"
        },
        {
          "name": "description",
          "dartType": "String"
        },
        {
          "name": "location",
          "dartType": "EventMeetingLocation"
        },
        {
          "name": "routeDistanceMeters",
          "dartType": "int"
        }
      ]
    }
  ]
},
  // Published/legacy Event projection: private drafts use their own contract.
  // Nullable legacy mirrors and unknown counters retain compatibility.
  {
  "className": "Event",
  "schema": "firestore/events.schema.json",
  "output": "lib/contexts/events/domain/event.dart",
  "imports": [
    "import 'package:catch_dating_app/kernel/activity_taxonomy.dart';",
    "import 'package:catch_dating_app/kernel/country_markets.dart';",
    "import 'package:catch_dating_app/platform/firebase/firestore_converters.dart';",
    "import 'package:catch_dating_app/platform/media/uploaded_photo.dart';",
    "import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';",
    "import 'package:catch_dating_app/contexts/events/domain/event_constraints.dart';",
    "import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';",
    "import 'package:catch_dating_app/contexts/events/domain/event_meeting_location.dart';",
    "import 'package:catch_dating_app/contexts/events/domain/event_types.dart';"
  ],
  "extensionFile": "lib/contexts/events/domain/event_extensions.dart",
  "exports": [
    "event_types.dart",
    "event_meeting_location.dart"
  ],
  "enums": [
  {
    "name": "PaceLevel",
    "schemaPointer": "/properties/pace",
    "labelled": true,
    "labels": {
      "easy": "Easy",
      "moderate": "Moderate",
      "fast": "Fast",
      "competitive": "Competitive"
    }
  },
  {
    "name": "EventLifecycleStatus",
    "schemaPointer": "/properties/status"
  },
  {
    "name": "EventPublicRegistrationMode",
    "schemaPointer": "/properties/publicRegistrationMode"
  },
  {
    "name": "EventOriginMode",
    "schemaPointer": "/properties/eventOrigin/properties/mode"
  },
  {
    "name": "EventBookingAuthority",
    "schemaPointer": "/properties/eventOrigin/properties/bookingAuthority",
    "renames": {
      "catch": "catchPlatform"
    }
  },
  {
    "name": "EventRosterAuthority",
    "schemaPointer": "/properties/eventOrigin/properties/rosterAuthority"
  },
  {
    "name": "ExternalBookingProvider",
    "schemaPointer": "/properties/eventOrigin/properties/provider",
    "renames": {
      "catch": "catchPlatform"
    }
  },
  {
    "name": "EventRuntimeWalkInPolicy",
    "schemaPointer": "/properties/runtimeAccess/properties/walkInPolicy"
  }
],
  "classes": [
    {
      "name": "Event",
      "requiredPointer": "/allOf/0/else/required",
      "fields": [
        {
          "name": "id",
          "dartType": "String",
          "synthetic": true,
          "forceRequired": true,
          "jsonKey": {
            "includeToJson": false
          }
        },
        {
          "name": "synthetic",
          "dartType": "bool",
          "default": "false",
          "jsonKey": {
            "includeToJson": false
          }
        },
        {
          "name": "seedPrefix",
          "dartType": "String",
          "jsonKey": {
            "includeToJson": false
          }
        },
        {
          "name": "organizerId",
          "dartType": "String",
          "forceRequired": true
        },
        {
          "name": "sourceVenueId",
          "dartType": "String",
          "jsonKey": {
            "includeIfNull": false
          }
        },
        {
          "name": "name",
          "dartType": "String",
          "default": "''"
        },
        {
          "name": "startTime",
          "timestamp": "required"
        },
        {
          "name": "eventTimezone",
          "dartType": "String",
          "jsonKey": {
            "includeIfNull": false
          }
        },
        {
          "name": "endTime",
          "timestamp": "required"
        },
        {
          "name": "meetingPoint",
          "dartType": "String"
        },
        {
          "name": "meetingLocation",
          "dartType": "EventMeetingLocation",
          "forceNullable": true,
          "jsonKey": {
            "includeIfNull": false
          }
        },
        {
          "name": "startingPointLat",
          "forceNullable": true,
          "dartType": "double"
        },
        {
          "name": "startingPointLng",
          "forceNullable": true,
          "dartType": "double"
        },
        {
          "name": "locationDetails",
          "dartType": "String"
        },
        {
          "name": "itinerary",
          "dartType": "List<EventItineraryItem>",
          "default": "[]"
        },
        {
          "name": "photoUrl",
          "dartType": "String",
          "jsonKey": {
            "includeIfNull": false
          }
        },
        {
          "name": "eventPhotos",
          "dartType": "List<UploadedPhoto>",
          "default": "[]"
        },
        {
          "name": "eventFormat",
          "dartType": "EventFormatSnapshot",
          "default": "EventFormatSnapshot.socialRun()"
        },
        {
          "name": "distanceKm",
          "dartType": "double"
        },
        {
          "name": "pace",
          "dartType": "PaceLevel"
        },
        {
          "name": "capacityLimit",
          "dartType": "int"
        },
        {
          "name": "description",
          "dartType": "String"
        },
        {
          "name": "priceInPaise",
          "dartType": "int"
        },
        {
          "name": "currency",
          "dartType": "String",
          "default": "defaultCurrencyCode"
        },
        {
          "name": "bookedCount",
          "dartType": "int",
          "forceNullable": true,
          "jsonKey": {
            "includeIfNull": false
          }
        },
        {
          "name": "checkedInCount",
          "dartType": "int",
          "forceNullable": true,
          "jsonKey": {
            "includeIfNull": false
          }
        },
        {
          "name": "waitlistedCount",
          "dartType": "int",
          "forceNullable": true,
          "jsonKey": {
            "includeIfNull": false
          }
        },
        {
          "name": "crossPathsPairHeldCount",
          "dartType": "int",
          "default": "0"
        },
        {
          "name": "crossPathsPairConfirmedCount",
          "dartType": "int",
          "default": "0"
        },
        {
          "name": "crossPathsPairHeldCohortCounts",
          "dartType": "Map<String, int>",
          "default": "{}"
        },
        {
          "name": "crossPathsDiscoveryEnabled",
          "dartType": "bool",
          "default": "false"
        },
        {
          "name": "status",
          "dartType": "EventLifecycleStatus",
          "default": "EventLifecycleStatus.active"
        },
        {
          "name": "cancelledAt",
          "timestamp": "nullable"
        },
        {
          "name": "cancellationReason",
          "dartType": "String"
        },
        {
          "name": "setupRevision",
          "dartType": "int",
          "jsonKey": {
            "includeIfNull": false
          }
        },
        {
          "name": "publicRegistrationEnabled",
          "dartType": "bool",
          "default": "false"
        },
        {
          "name": "publicRegistrationMode",
          "dartType": "EventPublicRegistrationMode",
          "jsonKey": {
            "includeIfNull": false
          },
          "unknownEnumValue": "EventPublicRegistrationMode.closed"
        },
        {
          "name": "publicRegistrationRevision",
          "dartType": "int",
          "default": "0"
        },
        {
          "name": "constraints",
          "dartType": "EventConstraints",
          "default": "EventConstraints()"
        },
        {
          "name": "eventPolicy",
          "dartType": "EventPolicyBundle",
          "jsonKey": {
            "includeIfNull": false
          }
        },
        {
          "name": "eventOrigin",
          "dartType": "EventOrigin",
          "jsonKey": {
            "includeIfNull": false
          }
        },
        {
          "name": "runtimeAccess",
          "dartType": "EventRuntimeAccess",
          "jsonKey": {
            "includeIfNull": false
          }
        },
        {
          "name": "genderCounts",
          "dartType": "Map<String, int>",
          "default": "{}"
        },
        {
          "name": "cohortCounts",
          "dartType": "Map<String, int>",
          "default": "{}"
        },
        {
          "name": "waitlistedCohortCounts",
          "dartType": "Map<String, int>",
          "default": "{}"
        }
      ]
    },
    {
      "name": "EventOrigin",
      "pointer": "/properties/eventOrigin",
      "fields": [
        {
          "name": "mode",
          "dartType": "EventOriginMode"
        },
        {
          "name": "bookingAuthority",
          "dartType": "EventBookingAuthority",
          "jsonKey": {
            "fromJson": "eventBookingAuthorityFromJson",
            "toJson": "eventBookingAuthorityToJson"
          }
        },
        {
          "name": "rosterAuthority",
          "dartType": "EventRosterAuthority"
        },
        {
          "name": "provider",
          "dartType": "ExternalBookingProvider",
          "jsonKey": {
            "fromJson": "externalBookingProviderFromJson",
            "toJson": "externalBookingProviderToJson"
          }
        },
        {
          "name": "externalEventId",
          "dartType": "String"
        },
        {
          "name": "externalEventUrl",
          "dartType": "String"
        },
        {
          "name": "sourceExternalEventId",
          "dartType": "String"
        },
        {
          "name": "adapterVersion",
          "dartType": "String"
        },
        {
          "name": "connectedAt",
          "timestamp": "nullable"
        },
        {
          "name": "connectedBy",
          "dartType": "String"
        }
      ]
    },
    {
      "name": "EventRuntimeAccess",
      "pointer": "/properties/runtimeAccess",
      "fields": [
        {
          "name": "enabled",
          "dartType": "bool"
        },
        {
          "name": "publicRuntimeId",
          "dartType": "String"
        },
        {
          "name": "walkInPolicy",
          "dartType": "EventRuntimeWalkInPolicy"
        },
        {
          "name": "termsVersion",
          "dartType": "String"
        }
      ]
    }
  ]
},
  {
    className: "Swipe",
    schema: "firestore/swipes.schema.json",
    output: "lib/contexts/connections/domain/swipe.dart",
    imports: [IMPORT_CONVERTERS],
    extensionFile: "lib/contexts/connections/domain/swipe_extensions.dart",
    enums: [
      {name: "SwipeDirection", schemaPointer: "/properties/direction"},
      {
        name: "SwipeReactionTargetType",
        schemaPointer: "/properties/reactionTargetType",
      },
    ],
    classes: [
      {
        name: "Swipe",
        fields: [
          {name: "swiperId", dartType: "String"},
          {name: "targetId", dartType: "String"},
          {name: "eventId", dartType: "String"},
          {name: "direction", enumType: "SwipeDirection"},
          {name: "reactionTargetId", dartType: "String"},
          {name: "reactionTargetType", enumType: "SwipeReactionTargetType",
            emptyJsonKey: true},
          {name: "reactionTargetLabel", dartType: "String"},
          {name: "reactionTargetPreview", dartType: "String"},
          {name: "comment", dartType: "String"},
          {name: "createdAt", timestamp: "required"},
        ],
      },
    ],
  },
  {
    className: "OrganizerMembership",
    schema: "firestore/organizer_memberships.schema.json",
    output: "lib/contexts/organizers/domain/organizer_membership.dart",
    imports: [IMPORT_CONVERTERS],
    extensionFile: "lib/contexts/organizers/domain/organizer_membership_extensions.dart",
    enums: [
      {name: "OrganizerMembershipRole", schemaPointer: "/properties/role"},
      {name: "OrganizerMembershipStatus", schemaPointer: "/properties/status"},
    ],
    classes: [
      {
        name: "OrganizerMembership",
        fields: [
          {name: "id", dartType: "String", synthetic: true,
            forceRequired: true, jsonKey: {includeToJson: false}},
          {name: "organizerId", dartType: "String"},
          {name: "uid", dartType: "String"},
          {name: "role", enumType: "OrganizerMembershipRole"},
          {name: "status", enumType: "OrganizerMembershipStatus"},
          {name: "pushNotificationsEnabled", dartType: "bool",
            default: "false"},
          {name: "joinedAt", timestamp: "required"},
          {name: "leftAt", timestamp: "nullable"},
          {name: "deletedAt", timestamp: "nullable"},
        ],
      },
    ],
  },
  {
    className: "Review",
    schema: "firestore/reviews.schema.json",
    output: "lib/contexts/reviews/domain/review.dart",
    imports: [IMPORT_CONVERTERS],
    classes: [
      {
        name: "Review",
        fields: [
          {name: "id", dartType: "String", synthetic: true,
            forceRequired: true, jsonKey: {includeToJson: false}},
          {name: "organizerId", dartType: "String"},
          {name: "eventId", dartType: "String"},
          {name: "reviewerUserId", dartType: "String"},
          {name: "reviewerName", dartType: "String"},
          {name: "rating", dartType: "int"},
          {name: "comment", dartType: "String"},
          // verificationStatus/source/moderationStatus are schema enums, but the
          // hand-written class keeps them as String with curated defaults (so a
          // new schema enum member never breaks client decode). Preserved here.
          {name: "verificationStatus", dartType: "String",
            default: "'verified'"},
          {name: "source", dartType: "String", default: "'catchEvent'"},
          {name: "moderationStatus", dartType: "String",
            default: "'published'"},
          {name: "isAnonymous", dartType: "bool", default: "false"},
          {name: "submittedFromPath", dartType: "String"},
          {name: "createdAt", timestamp: "required"},
          {name: "updatedAt", timestamp: "nullable"},
          {name: "ownerResponse", dartType: "ReviewOwnerResponse"},
        ],
      },
      {
        name: "ReviewOwnerResponse",
        pointer: "/properties/ownerResponse",
        fields: [
          {name: "hostUserId", dartType: "String"},
          {name: "hostName", dartType: "String"},
          {name: "hostAvatarUrl", dartType: "String"},
          {name: "message", dartType: "String"},
          {name: "createdAt", timestamp: "required"},
          {name: "updatedAt", timestamp: "required"},
        ],
      },
    ],
  },
  {
    className: "EventConstraints",
    schema: "shared/event_common.schema.json",
    pointer: "/definitions/eventConstraints",
    output: "lib/contexts/events/domain/event_constraints.dart",
    // No extra imports: the generated class is pure scalars. Gender (used by
    // the extension's maxForGender) is imported only by the extension file.
    extensionFile: "lib/contexts/events/domain/event_constraints_extensions.dart",
    classes: [
      {
        name: "EventConstraints",
        fields: [
          {name: "minAge", dartType: "int", default: "0"},
          {name: "maxAge", dartType: "int", default: "99"},
          {name: "maxMen", dartType: "int"},
          {name: "maxWomen", dartType: "int"},
        ],
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────

const generatedFiles = [];

function main() {
  for (const spec of SPECS) {
    const bundled = bundleSchema(path.join(contractRoot, spec.schema));
    const rootSchema = spec.pointer
      ? resolveJsonPointer(bundled, spec.pointer)
      : bundled;
    const content = renderDartDomainFile(spec, bundled, rootSchema);
    generatedFiles.push({path: spec.output, content});
  }

  const staleFiles = [];
  for (const file of generatedFiles) {
    const absolutePath = path.join(repoRoot, file.path);
    if (checkOnly) {
      const current = fs.existsSync(absolutePath)
        ? fs.readFileSync(absolutePath, "utf8")
        : null;
      if (current !== file.content) staleFiles.push(file.path);
    } else {
      fs.mkdirSync(path.dirname(absolutePath), {recursive: true});
      fs.writeFileSync(absolutePath, file.content);
    }
  }

  if (staleFiles.length > 0) {
    console.error("Generated Dart domain classes are stale:");
    for (const file of staleFiles) console.error(`- ${file}`);
    console.error(
      "Run: node tool/contracts/generate_domain_classes.mjs && " +
      "dart run build_runner build"
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    checkOnly
      ? "Generated Dart domain classes are current."
      : `Generated ${generatedFiles.length} Dart domain class files. ` +
        "Run: dart run build_runner build"
  );
}

// ── File rendering ──────────────────────────────────────────────────────────

export function renderDartDomainFile(spec, bundled, rootSchema) {
  const partBase = path.basename(spec.output, ".dart");
  const usesLabelled = (spec.enums ?? []).some((e) => e.labelled);

  const imports = new Set([IMPORT_FREEZED]);
  if (usesLabelled) imports.add(IMPORT_LABELLED);
  for (const item of spec.imports ?? []) imports.add(item);

  const importBlock = [...imports].sort().join("\n");

  const enumBlock = (spec.enums ?? [])
    .map((enumDef) => renderEnum(spec, enumDef, bundled))
    .join("\n\n");

  const classBlock = spec.classes
    .map((cls) => {
      const classSchema = cls.pointer
        ? resolveJsonPointer(bundled, cls.pointer)
        : rootSchema;
      return renderFreezedClass(spec, cls, cls.requiredPointer
        ? {...classSchema, required: [...(classSchema.required ?? []), ...resolveJsonPointer(bundled, cls.requiredPointer)]}
        : classSchema);
    })
    .join("\n\n");

  // Re-export the hand-written companion so existing consumers that
  // `import '<this file>'` keep seeing the moved getters/helpers/types without
  // churning every call site. Export directives must precede part directives.
  const exportLine = spec.extensionFile
    ? `// Hand-written derived behavior for this data shape lives in the\n` +
      `// companion file below; it is re-exported so consumers of this file\n` +
      `// keep seeing those getters/helpers/types unchanged.\n` +
      `export '${path.basename(spec.extensionFile)}';\n\n`
    : "";

  return `${dartGeneratedHeader(spec)}${importBlock}

${spec.exports ? [path.basename(spec.extensionFile), ...spec.exports].sort().map((file) => `export '${file}';\n`).join('') + '\n' : exportLine}part '${partBase}.freezed.dart';
part '${partBase}.g.dart';

${enumBlock ? `${enumBlock}\n\n` : ""}${classBlock}\n`;
}

// Resolves the ordered, non-null string enum members for an enum spec from the
// schema. So adding a value to the schema enum auto-extends the Dart enum.
function enumMemberNames(spec, enumDef, bundled) {
  if (!enumDef.schemaPointer) {
    throw new Error(`Enum ${enumDef.name} is missing a schemaPointer.`);
  }
  const node = resolveJsonPointer(bundled, enumDef.schemaPointer);
  let values = null;
  if (Array.isArray(node?.enum)) {
    values = node.enum;
  } else if (Array.isArray(node?.anyOf)) {
    const withEnum = node.anyOf.find((branch) => Array.isArray(branch?.enum));
    values = withEnum?.enum ?? null;
  }
  if (!values) {
    throw new Error(
      `${spec.className}: enum ${enumDef.name} schema ` +
      `${enumDef.schemaPointer} has no enum members.`
    );
  }
  const names = values.filter((value) => value !== null);
  if (names.length === 0 || !names.every((v) => typeof v === "string")) {
    throw new Error(
      `${spec.className}: enum ${enumDef.name} has non-string members.`
    );
  }
  return names;
}

function renderEnum(spec, enumDef, bundled) {
  const names = enumMemberNames(spec, enumDef, bundled);

  if (enumDef.renames) {
    return `enum ${enumDef.name} {\n${names.map((wire) =>
      enumDef.renames[wire] ? `  @JsonValue(${dartString(wire)})\n  ${enumDef.renames[wire]},` : `  ${wire},`).join("\n")}\n}`;
  }
  if (!enumDef.labelled) {
    // dart format keeps a plain enum on one line when it fits in 80 columns,
    // otherwise one member per line. Match that so output is format-stable.
    const inline = `enum ${enumDef.name} { ${names.join(", ")} }`;
    if (inline.length <= 80) return inline;
    const members = names.map((name) => `  ${name}`).join(",\n");
    return `enum ${enumDef.name} {\n${members},\n}`;
  }

  const members = names
    .map((name, index) => {
      const label = enumDef.labels?.[name];
      if (label === undefined) {
        throw new Error(
          `${spec.className}: enum ${enumDef.name} member "${name}" has no ` +
          `label in the spec. Labelled enums need a label per schema member.`
        );
      }
      const doc = enumDef.memberDocs?.[name];
      // dart format puts a blank line before a doc-commented member (except the
      // very first member). Match that so generated output is format-stable.
      const blank = doc && index > 0 ? "\n" : "";
      const prefix = doc ? `${blank}  ${doc}\n` : "";
      return `${prefix}  ${name}(${dartString(label)})`;
    })
    .join(",\n");
  return `enum ${enumDef.name} implements Labelled {
${members};

  const ${enumDef.name}(this.label);
  @override
  final String label;
}`;
}

function renderFreezedClass(spec, cls, classSchema) {
  if (
    !classSchema ||
    classSchema.type !== "object" ||
    !classSchema.properties
  ) {
    throw new Error(
      `${spec.className}.${cls.name}: schema is not an object with properties.`
    );
  }
  const properties = classSchema.properties;
  const required = new Set(classSchema.required ?? []);

  const ctorLines = cls.fields.map((field) => {
    const resolved = resolveField(spec, cls, field, properties, required);
    return renderCtorParam(resolved);
  });

  const ctor = ctorLines.join("\n");

  // dart format keeps the fromJson factory on one line when it fits in 80
  // columns, otherwise wraps the body onto the next line.
  const fromJsonOneLine =
    `  factory ${cls.name}.fromJson(Map<String, dynamic> json) => ` +
    `_$${cls.name}FromJson(json);`;
  const fromJson = fromJsonOneLine.length <= 80
    ? fromJsonOneLine
    : `  factory ${cls.name}.fromJson(Map<String, dynamic> json) =>\n` +
      `      _$${cls.name}FromJson(json);`;

  return `@freezed
abstract class ${cls.name} with _$${cls.name} {
  const factory ${cls.name}({
${ctor}
  }) = _${cls.name};

${fromJson}
}`;
}

// Resolves a field's Dart projection against the schema, validating presence.
function resolveField(spec, cls, field, properties, required) {
  let prop = null;
  if (!field.synthetic) {
    prop = properties[field.name];
    if (prop === undefined) {
      throw new Error(
        `${spec.className}.${cls.name}: declared field "${field.name}" is ` +
        `not present in schema ${spec.schema}` +
        (cls.pointer ? `#${cls.pointer}` : "") +
        `. The Dart projection has drifted from the contract — update either ` +
        `the schema or the generator spec.`
      );
    }
  }

  const schemaNullable = prop ? schemaAllowsNull(prop) : false;
  const schemaRequired = field.synthetic
    ? Boolean(field.forceRequired)
    : required.has(field.name);

  // Nullable when: schema marks it nullable, OR it is not required (an optional
  // schema field maps to a nullable Dart field), UNLESS it carries a default.
  let nullable = schemaNullable || !schemaRequired;
  if (field.default !== undefined) nullable = false;
  if (field.forceRequired) nullable = false;
  if (field.forceNullable) nullable = true;

  const hasDefault = field.default !== undefined;
  const isRequired = !hasDefault && !nullable;

  return {...field, nullable, hasDefault, isRequired};
}

function renderCtorParam(field) {
  const annotations = [];

  if (field.timestamp === "required") {
    annotations.push("@TimestampConverter()");
  } else if (field.timestamp === "nullable") {
    annotations.push("@NullableTimestampConverter()");
  }

  const jsonKeyParts = [];
  if (field.jsonKey) {
    for (const [key, value] of Object.entries(field.jsonKey)) {
      jsonKeyParts.push(`${key}: ${typeof value === "boolean" ? String(value) : value}`);
    }
  }
  if (field.unknownEnumValue) {
    jsonKeyParts.push(`unknownEnumValue: ${field.unknownEnumValue}`);
  }
  if (jsonKeyParts.length > 0) {
    const annotation = `@JsonKey(${jsonKeyParts.join(", ")})`;
    annotations.push(annotation.length > 76
      ? `@JsonKey(\n${jsonKeyParts.map((p) => `      ${p},`).join("\n")}\n    )`
      : annotation);
  } else if (field.emptyJsonKey) {
    annotations.push("@JsonKey()");
  }

  if (field.hasDefault) {
    annotations.push(`@Default(${field.default})`);
  }

  const baseType = dartFieldType(field);
  const typeWithNull =
    field.nullable && !baseType.endsWith("?") ? `${baseType}?` : baseType;

  const requiredKeyword = field.isRequired ? "required " : "";
  const annotationsText = annotations.join(" ");
  const decl = `${requiredKeyword}${typeWithNull} ${field.name},`;
  const oneLine = annotationsText
    ? `    ${annotationsText} ${decl}`
    : `    ${decl}`;

  // dart format wraps a constructor parameter whose annotations + declaration
  // exceed the 80-column page width: annotations go on their own line, the
  // declaration on the next. Emit that form directly so output is stable.
  if (annotationsText && oneLine.length > 80) {
    return `    ${annotationsText}\n    ${decl}`;
  }
  return oneLine;
}

function dartFieldType(field) {
  if (field.timestamp) return "DateTime";
  if (field.enumType) return field.enumType;
  if (field.dartType) return field.dartType;
  throw new Error(`Field "${field.name}" has no resolvable Dart type.`);
}

// ── schema helpers (mirrors generate_schema_contracts.mjs) ──────────────────

function schemaAllowsNull(prop) {
  if (!prop || typeof prop !== "object") return false;
  if (Array.isArray(prop.type) && prop.type.includes("null")) return true;
  if (Array.isArray(prop.enum) && prop.enum.includes(null)) return true;
  if (Array.isArray(prop.anyOf)) return prop.anyOf.some(schemaAllowsNull);
  return prop.type === "null";
}

function bundleSchema(file) {
  const absoluteFile = path.resolve(file);
  const schema = readJsonFile(absoluteFile);
  return resolveRefs(schema, absoluteFile, true);
}

function resolveRefs(node, currentFile, keepSchemaMeta) {
  if (Array.isArray(node)) {
    return node.map((item) => resolveRefs(item, currentFile, false));
  }
  if (!node || typeof node !== "object") return node;

  if (typeof node.$ref === "string") {
    const {$ref, ...siblings} = node;
    const resolved = resolveReference($ref, currentFile);
    const merged = {
      ...stripSchemaMeta(resolveRefs(resolved.value, resolved.file, false)),
      ...resolveRefs(siblings, currentFile, false),
    };
    return Object.keys(merged).length === 0 ? true : merged;
  }

  const result = {};
  for (const [key, value] of Object.entries(node)) {
    if (!keepSchemaMeta && (key === "$schema" || key === "$id")) continue;
    result[key] = resolveRefs(value, currentFile, false);
  }
  return result;
}

function resolveReference(ref, currentFile) {
  if (/^[a-z]+:\/\//i.test(ref)) {
    throw new Error(`Remote schema refs are not supported: ${ref}`);
  }
  const [target, pointer = ""] = ref.split("#");
  const file = target
    ? path.resolve(path.dirname(currentFile), target)
    : currentFile;
  const json = readJsonFile(file);
  return {file, value: resolveJsonPointer(json, pointer)};
}

function resolveJsonPointer(document, pointer) {
  if (!pointer || pointer === "/") return document;
  if (!pointer.startsWith("/")) {
    throw new Error(`Unsupported JSON pointer: #${pointer}`);
  }
  return pointer
    .slice(1)
    .split("/")
    .reduce((value, token) => {
      const key = token.replace(/~1/g, "/").replace(/~0/g, "~");
      if (
        value === undefined ||
        value === null ||
        !Object.prototype.hasOwnProperty.call(value, key)
      ) {
        throw new Error(`JSON pointer segment not found: ${key}`);
      }
      return value[key];
    }, document);
}

function stripSchemaMeta(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  const {$schema, $id, ...rest} = value;
  return rest;
}

function readJsonFile(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function dartGeneratedHeader(spec) {
  return `// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_domain_classes.mjs
// Then run: dart run build_runner build
//
// Data shape emitted from contracts/${spec.schema}` +
    (spec.pointer ? ` (#${spec.pointer})` : "") +
    `.
// Derived behavior, if any, lives in a hand-written companion extension file.
`;
}

function dartString(value) {
  return `'${String(value)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\$/g, "\\$")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")}'`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

// ── HAND_WRITTEN_NOTES ──────────────────────────────────────────────────────
// Covered domain classes intentionally NOT generated, and why. These stay
// hand-written; do not try to force them through this generator.
//
//   Payment (lib/contexts/payments/domain/payment.dart)
//     PaymentStatus carries per-member doc comments and a deliberate decode
//     fail-safe (@JsonKey(unknownEnumValue: PaymentStatus.failed)) so a stale
//     client tolerates a newer server status (e.g. refundFailed) instead of
//     throwing. The generator emits neither member docs nor unknownEnumValue,
//     and forcing it would silently drop that fail-safe — keep hand-written.
//
//   Event is generated as the published/legacy projection. Its defaults and
//   nullable legacy mirrors are explicit projection choices; derived behavior
//   and wire-name compatibility live in event_extensions.dart/event_types.dart.
//
//   PublicProfile (lib/contexts/profiles/domain/public_profile.dart)
//     fromJson wraps a hand-written _migratePublicProfileJson() that rewrites
//     legacy bio → profilePrompts and back-fills activityPreferences before
//     decoding. Generating a plain fromJson would drop that migration.
//
//   Match (lib/contexts/connections/domain/match.dart)
//     eventIds uses @JsonKey(readValue: _readEventIds) to coalesce a legacy
//     scalar eventId into the list. Schema also requires participantIds, which
//     the curated client class deliberately does not carry.
//
//   ProfilePhoto / ProfilePhotoModeration (user_profile/domain/profile_photo)
//     Fully hand-rolled (NOT freezed): custom _readDateTime accepts Timestamp |
//     DateTime | int millis | {_seconds,_nanoseconds}, sentinel-based copyWith,
//     and a large family of normalize/reorder helpers bound to the class.
//
//   ProfilePromptAnswer / PhotoPromptAnswer (user_profile/domain/profile_prompts)
//     Tightly coupled to the prompt catalog (displayPrompt getters resolve via
//     profilePromptTitle) and to a custom photoPromptSelectionToJson that drops
//     empty captions — different from the freezed-generated toJson.
//
//   EventFormatSnapshot / EventPolicyBundle and friends
//     Hand-rolled non-freezed value objects with enum-fallback fromJson and
//     bespoke equality; out of scope for a json_serializable projection.
//
//   Organizer / OrganizerHostProfile (lib/contexts/organizers/domain/organizer.dart)
//     Organizer carries derived getters (isOwnedBy/isHostedBy/displayHostProfiles)
//     and is a curated projection of a schema with ~20 extra fields
//     (entityKind, ownership, claim, publicPage, verifiedReviewCount, ...).
//     OrganizerHostProfile is co-located in organizer.dart; splitting it is deferred to
//     keep this change focused and low-risk.
