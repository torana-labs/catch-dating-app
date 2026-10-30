// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_moment_sweep_state.schema.json.

const schemaOrganizerMomentSweepStateDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_moment_sweep_state.schema.json',
  'title': 'OrganizerMomentSweepStateDocument',
  'description': 'Server-owned pagination state for the moment sweep. The armed-moments scan advances a durable cursor so discovery stays bounded at any armed-moment count.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'organizerMomentSweepState',
  'x-firestore-path': 'organizerMomentSweepState/{sweepId}',
  'x-document-id-field': 'sweepId',
  'x-owner': 'moment runner',
  'required': <Object?>[
    'sweepId',
    'afterMomentId',
    'updatedAtMillis',
  ],
  'properties': <String, Object?>{
    'sweepId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 60,
    },
    'afterMomentId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 180,
      'description': 'Last armed-moment doc id scanned; null restarts the scan.',
    },
    'updatedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
  },
};
