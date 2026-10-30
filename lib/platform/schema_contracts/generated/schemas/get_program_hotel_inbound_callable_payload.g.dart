// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/get_program_hotel_inbound_payload.schema.json.

const schemaGetProgramHotelInboundCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/get_program_hotel_inbound_payload.schema.json',
  'title': 'GetProgramHotelInboundCallablePayload',
  'description': 'Hotel-desk scoped inbound view: trips en route and expected guests for one hotel only.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'programId',
    'hotelId',
  ],
  'properties': <String, Object?>{
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'hotelId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'tripCursor': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[^/]+\$',
      'description': 'Continuation returned for this hotel list. Omit to read its first page.',
    },
    'expectedCursor': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[^/]+\$',
      'description': 'Continuation returned for this hotel list. Omit to read its first page.',
    },
    'limit': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 50,
    },
  },
};
