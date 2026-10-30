// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/update_sales_partner_assignment_payload.schema.json.

const schemaUpdateSalesPartnerAssignmentCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/update_sales_partner_assignment_payload.schema.json',
  'title': 'UpdateSalesPartnerAssignmentCallablePayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'requestId',
    'organizerId',
    'expectedRevision',
    'relationshipContext',
    'channel',
    'nextAction',
    'reviewAt',
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
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'relationshipContext': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 1000,
    },
    'channel': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'email',
        'whatsapp',
        'other',
      ],
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
  },
  'x-callable-aliases': <Object?>[
    'updateSalesPartnerAssignment',
  ],
};
