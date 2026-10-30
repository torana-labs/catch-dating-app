// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/set_club_notification_preference_payload.schema.json.

const schemaSetClubNotificationPreferenceCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/set_club_notification_preference_payload.schema.json',
  'title': 'SetClubNotificationPreferenceCallablePayload',
  'description': 'Callable payload accepted by setClubNotificationPreference.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'clubId',
    'enabled',
  ],
  'properties': <String, Object?>{
    'clubId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'enabled': <String, Object?>{
      'type': 'boolean',
    },
  },
};
