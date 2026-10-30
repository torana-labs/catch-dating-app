// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/list_my_host_assignments_payload.schema.json.

const schemaListMyHostAssignmentsCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/list_my_host_assignments_payload.schema.json',
  'title': 'ListMyHostAssignmentsCallablePayload',
  'description': 'Lists the caller\'s live staff assignments across program and event scopes for the unified host work shell. No filters: the shell needs the caller\'s full live set.',
  'type': 'object',
  'additionalProperties': false,
  'properties': <String, Object?>{
    'includeExpired': <String, Object?>{
      'type': 'boolean',
      'description': 'When true also returns expired grants for history views; the shell entry decision still uses live assignments only.',
    },
  },
};
