// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_refresh_organizer_events_payload.schema.json.

const schemaAdminRefreshOrganizerEventsCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_refresh_organizer_events_payload.schema.json',
  'title': 'AdminRefreshOrganizerEventsCallablePayload',
  'description': 'Staff read new events for an unclaimed organizer Catch already lists: Supply Intake reads the given links, or the event-calendar links on the organizer\'s page, and its events go through the event publication policy like an approved listing\'s.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'requestId',
    'organizerId',
    'urls',
  ],
  'properties': <String, Object?>{
    'requestId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}\$',
      'description': 'The caller\'s idempotency key; a retry with the same content finds its own request.',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,179}\$',
    },
    'urls': <String, Object?>{
      'type': 'array',
      'maxItems': 10,
      'uniqueItems': true,
      'description': 'Pages to read. Empty reads the event-calendar links on the organizer\'s page.',
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 2000,
        'pattern': '^https?://',
      },
    },
  },
  'x-callable-aliases': <Object?>[
    'adminRefreshOrganizerEvents',
  ],
};
