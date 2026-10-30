// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_assign_sales_partner_payload.schema.json.

const schemaAdminAssignSalesPartnerCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_assign_sales_partner_payload.schema.json',
  'title': 'AdminAssignSalesPartnerCallablePayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'requestId',
    'organizerId',
    'partnerUid',
    'expectedRevision',
    'nextAction',
    'reviewAt',
    'expiresAt',
    'reason',
    'originatorUid',
  ],
  'properties': <String, Object?>{
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 128,
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 128,
    },
    'partnerUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 128,
    },
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'nextAction': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 500,
    },
    'reviewAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'expiresAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'reason': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 1000,
    },
    'originatorUid': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 128,
    },
  },
  'x-callable-aliases': <Object?>[
    'adminAssignSalesPartner',
  ],
};
