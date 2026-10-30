// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/program_station_scope_payload.schema.json.

const schemaProgramStationScopeCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/program_station_scope_payload.schema.json',
  'title': 'ProgramStationScopeCallablePayload',
  'description': 'Pickup-station scoped program read shared by the arrivals roster and transport plan callables.',
  'type': 'object',
  'additionalProperties': false,
  'x-callable-aliases': <Object?>[
    'getProgramArrivalsRoster',
    'getProgramTransportPlan',
  ],
  'required': <Object?>[
    'programId',
  ],
  'properties': <String, Object?>{
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'pickupPointId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
      'description': 'Requested station. Staff are still intersected with their granted station scope; managers may read any station.',
    },
  },
};
