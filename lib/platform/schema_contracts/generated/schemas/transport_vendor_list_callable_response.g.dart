// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/transport_vendor_list_response.schema.json.

const schemaTransportVendorListCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/transport_vendor_list_response.schema.json',
  'title': 'TransportVendorListCallableResponse',
  'description': 'Operational vendor picker data: id, name and program binding only. Contact and commercial fields stay on manager surfaces.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'vendors',
  ],
  'properties': <String, Object?>{
    'vendors': <String, Object?>{
      'type': 'array',
      'maxItems': 100,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'vendorId',
          'name',
          'active',
          'boundToProgram',
        ],
        'properties': <String, Object?>{
          'vendorId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'name': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 140,
          },
          'active': <String, Object?>{
            'type': 'boolean',
          },
          'boundToProgram': <String, Object?>{
            'type': 'boolean',
          },
        },
      },
    },
  },
};
