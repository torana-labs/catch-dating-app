// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/sync_organizer_provider_event_payload.schema.json.

const schemaSyncOrganizerProviderEventCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/sync_organizer_provider_event_payload.schema.json',
  'title': 'SyncOrganizerProviderEventCallablePayload',
  'description': 'Idempotent manager request to reconcile one mapped external event into the Catch operational roster.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'eventId',
    'clientOperationId',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'clientOperationId': <String, Object?>{
      'type': 'string',
      'minLength': 16,
      'maxLength': 120,
    },
  },
};
