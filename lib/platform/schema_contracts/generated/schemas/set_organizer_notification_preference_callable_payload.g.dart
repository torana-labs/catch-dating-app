// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/set_organizer_notification_preference_payload.schema.json.

const schemaSetOrganizerNotificationPreferenceCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/set_organizer_notification_preference_payload.schema.json',
  'title': 'SetOrganizerNotificationPreferenceCallablePayload',
  'description': 'Callable payload accepted by setOrganizerNotificationPreference.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'enabled',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'enabled': <String, Object?>{
      'type': 'boolean',
    },
  },
};
