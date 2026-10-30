// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/record_organizer_analytics_event_response.schema.json.

const schemaRecordOrganizerAnalyticsEventCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/record_organizer_analytics_event_response.schema.json',
  'title': 'RecordOrganizerAnalyticsEventCallableResponse',
  'description': 'Callable response returned by recordOrganizerAnalyticsEvent after an organizer analytics event is accepted.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'accepted',
  ],
  'properties': <String, Object?>{
    'accepted': <String, Object?>{
      'type': 'boolean',
    },
  },
};
