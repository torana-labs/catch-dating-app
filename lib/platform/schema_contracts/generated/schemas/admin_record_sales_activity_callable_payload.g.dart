// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_sales_activities_log_payload.schema.json.

const schemaAdminRecordSalesActivityCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_sales_activities_log_payload.schema.json',
  'title': 'Sales activities.log callable payload',
  'description': 'Private bounded Sales callable request. Server authorization and transaction policy are enforced separately.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'requestId',
    'type',
    'occurredAt',
    'note',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'opportunityId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'type': <String, Object?>{
      'enum': <Object?>[
        'note',
        'reply',
        'call',
        'demo',
        'pilot',
        'correction',
        'outreach_sent_manual',
      ],
    },
    'channel': <String, Object?>{
      'enum': <Object?>[
        'email',
        'whatsapp',
        'other',
      ],
    },
    'attestation': <String, Object?>{
      'const': 'sent_elsewhere_by_actor',
    },
    'occurredAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'note': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 2000,
    },
  },
};
