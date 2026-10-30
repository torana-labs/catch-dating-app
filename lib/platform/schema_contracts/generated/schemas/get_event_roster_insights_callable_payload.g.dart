// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/get_event_roster_insights_payload.schema.json.

const schemaGetEventRosterInsightsCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/get_event_roster_insights_payload.schema.json',
  'title': 'GetEventRosterInsightsCallablePayload',
  'description': 'Organizer-manager request for event-relative CRM labels on one operational roster.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'includeHostMembership': <String, Object?>{
      'type': 'boolean',
      'description': 'Opt-in for the paid-membership "member" signal; older clients omit it.',
    },
  },
};
