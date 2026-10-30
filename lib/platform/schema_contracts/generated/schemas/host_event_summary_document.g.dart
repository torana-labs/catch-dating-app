// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/host_event_summaries.schema.json.

const schemaHostEventSummaryDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/host_event_summaries.schema.json',
  'title': 'HostEventSummaryDocument',
  'description': 'Server-maintained organizer-scoped Host read view. Never identity, permission or mutation authority.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'hostEventSummaries',
  'x-firestore-path': 'hostEventSummaries/{eventId}',
  'x-document-id-field': 'eventId',
  'x-owner': 'Host read model projector',
  'required': <Object?>[
    'organizerId',
    'eventId',
    'startTimeMillis',
    'status',
    'row',
    'version',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'startTimeMillis': <String, Object?>{
      'type': 'integer',
      'x-catch-ownership': 'server-only',
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'active',
        'cancelled',
      ],
      'x-catch-ownership': 'server-only',
    },
    'row': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'eventId',
        'name',
        'city',
        'localDate',
        'localStartTime',
        'timezone',
        'startTimeMillis',
        'setupRevision',
        'status',
        'detailsConfigured',
      ],
      'properties': <String, Object?>{
        'eventId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'name': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
        },
        'city': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'cityId',
            'marketId',
          ],
          'properties': <String, Object?>{
            'cityId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'marketId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
          },
        },
        'localDate': <String, Object?>{
          'type': 'string',
          'pattern': '^[0-9]{4}-[0-9]{2}-[0-9]{2}\$',
        },
        'localStartTime': <String, Object?>{
          'type': 'string',
          'pattern': '^[0-9]{2}:[0-9]{2}\$',
        },
        'timezone': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 100,
        },
        'startTimeMillis': <String, Object?>{
          'type': 'integer',
        },
        'setupRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
        },
        'status': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'active',
            'cancelled',
          ],
        },
        'detailsConfigured': <String, Object?>{
          'type': 'boolean',
        },
      },
      'x-catch-ownership': 'server-only',
    },
    'version': <String, Object?>{
      'const': 1,
      'x-catch-ownership': 'server-only',
    },
  },
};
