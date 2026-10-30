// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/decide_sales_partner_assignment_payload.schema.json.

const schemaDecideSalesPartnerAssignmentCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/decide_sales_partner_assignment_payload.schema.json',
  'title': 'DecideSalesPartnerAssignmentCallablePayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'requestId',
    'organizerId',
    'expectedRevision',
    'decision',
    'relationshipContext',
    'channel',
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
    'decision': <String, Object?>{
      'enum': <Object?>[
        'accept',
        'decline',
      ],
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
      'enum': <Object?>[
        'email',
        'whatsapp',
        'other',
        null,
      ],
    },
  },
  'x-callable-aliases': <Object?>[
    'decideSalesPartnerAssignment',
  ],
};
