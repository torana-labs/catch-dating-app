// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_sales_outreach_copy_response.schema.json.

const schemaAdminCopySalesOutreachDraftResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_sales_outreach_copy_response.schema.json',
  'title': 'AdminCopySalesOutreachDraftResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'draftId',
    'subject',
    'text',
    'exactContentHash',
    'copiedAt',
    'sendAuthority',
    'providerConfirmed',
  ],
  'properties': <String, Object?>{
    'draftId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
    },
    'subject': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 300,
    },
    'text': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 2500,
    },
    'exactContentHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'copiedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'sendAuthority': <String, Object?>{
      'const': false,
    },
    'providerConfirmed': <String, Object?>{
      'const': false,
    },
  },
  'x-callable-aliases': <Object?>[
    'adminCopySalesOutreachDraft',
  ],
};
