// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from client_writes/delete_saved_event.schema.json.

const schemaDeleteSavedEventClientWriteSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/client_writes/delete_saved_event.schema.json',
  'title': 'DeleteSavedEventClientWrite',
  'description': 'Client-owned Firestore delete operation for savedEvents/{savedEventId}.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'path',
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
  },
  'x-firestore-operation': 'delete',
  'x-firestore-path': 'savedEvents/{savedEventId}',
  'x-owner': 'authenticated owner direct delete',
};
