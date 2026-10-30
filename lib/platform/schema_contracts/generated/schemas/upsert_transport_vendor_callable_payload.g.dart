// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/upsert_transport_vendor_payload.schema.json.

const schemaUpsertTransportVendorCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/upsert_transport_vendor_payload.schema.json',
  'title': 'UpsertTransportVendorCallablePayload',
  'description': 'Create or update an organizer-level transport vendor and bind it to programs.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'name',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'vendorId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'name': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 140,
    },
    'contactName': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 140,
    },
    'phoneE164': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 20,
    },
    'programIds': <String, Object?>{
      'type': 'array',
      'maxItems': 100,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 180,
      },
    },
    'active': <String, Object?>{
      'type': 'boolean',
    },
    'notes': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 500,
    },
  },
};
