// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from client_writes/create_saved_event.schema.json.

const schemaCreateSavedEventClientWriteSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/client_writes/create_saved_event.schema.json',
  'title': 'CreateSavedEventClientWrite',
  'description': 'Client-owned Firestore create operation for savedEvents/{savedEventId}.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'path',
    'data',
  ],
  'properties': <String, Object?>{
    'path': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'savedEventId',
      ],
      'properties': <String, Object?>{
        'savedEventId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
      },
    },
    'data': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'uid',
        'eventId',
        'savedAt',
      ],
      'properties': <String, Object?>{
        'uid': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'eventId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'savedAt': <String, Object?>{
          'type': 'object',
          'description': 'Serialized Firestore Timestamp fixture shape.',
          'x-firestore-type': 'timestamp',
          'additionalProperties': false,
          'required': <Object?>[
            '_seconds',
            '_nanoseconds',
          ],
          'properties': <String, Object?>{
            '_seconds': <String, Object?>{
              'type': 'integer',
            },
            '_nanoseconds': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 999999999,
            },
          },
        },
      },
    },
  },
  'x-firestore-operation': 'create',
  'x-firestore-path': 'savedEvents/{savedEventId}',
  'x-owner': 'authenticated owner direct create',
};
