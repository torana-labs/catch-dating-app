// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/propose_sales_partner_demo_wording_payload.schema.json.

const schemaProposeSalesPartnerDemoWordingCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/propose_sales_partner_demo_wording_payload.schema.json',
  'title': 'ProposeSalesPartnerDemoWordingCallablePayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'requestId',
    'organizerId',
    'expectedAssignmentRevision',
    'blueprintId',
    'expectedPreviewHash',
    'expectedProposalRevision',
    'wording',
  ],
  'properties': <String, Object?>{
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'expectedAssignmentRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'blueprintId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'expectedPreviewHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'expectedProposalRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'wording': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'headline',
        'scenario',
        'cta',
      ],
      'properties': <String, Object?>{
        'headline': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[^<>\\u0000-\\u001f]+\$',
        },
        'scenario': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[^<>\\u0000-\\u001f]+\$',
        },
        'cta': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[^<>\\u0000-\\u001f]+\$',
        },
      },
    },
  },
  'x-callable-aliases': <Object?>[
    'proposeSalesPartnerDemoWording',
  ],
};
