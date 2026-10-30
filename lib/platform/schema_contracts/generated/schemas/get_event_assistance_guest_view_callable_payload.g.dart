// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/get_event_assistance_guest_view_payload.schema.json.

const schemaGetEventAssistanceGuestViewCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/get_event_assistance_guest_view_payload.schema.json',
  'title': 'GetEventAssistanceGuestViewCallablePayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'linkId',
    'secret',
  ],
  'properties': <String, Object?>{
    'linkId': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{32}\$',
    },
    'secret': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{43}\$',
    },
  },
};
