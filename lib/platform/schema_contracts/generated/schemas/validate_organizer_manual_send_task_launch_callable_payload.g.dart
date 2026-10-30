// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/validate_organizer_manual_send_task_launch_payload.schema.json.

const schemaValidateOrganizerManualSendTaskLaunchCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/validate_organizer_manual_send_task_launch_payload.schema.json',
  'title': 'ValidateOrganizerManualSendTaskLaunchCallablePayload',
  'description': 'Revision-bound, read-only authority check immediately before re-opening an external handoff.',
  'x-callable-aliases': <Object?>[
    'validateOrganizerManualSendTaskLaunch',
  ],
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'taskId',
    'expectedRevision',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'taskId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
  },
};
