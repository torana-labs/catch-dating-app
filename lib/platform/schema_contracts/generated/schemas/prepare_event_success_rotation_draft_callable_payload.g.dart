// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/prepare_event_success_rotation_draft_payload.schema.json.

const schemaPrepareEventSuccessRotationDraftCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/prepare_event_success_rotation_draft_payload.schema.json',
  'title': 'PrepareEventSuccessRotationDraftCallablePayload',
  'description': 'Revision-fenced payload accepted by generateEventSuccessRotations when preparing the next host-only round.',
  'x-callable-aliases': <Object?>[
    'generateEventSuccessRotations',
  ],
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'expectedRevision',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 2147483647,
    },
  },
};
