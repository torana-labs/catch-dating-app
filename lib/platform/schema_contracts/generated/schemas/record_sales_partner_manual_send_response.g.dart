// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/record_sales_partner_manual_send_response.schema.json.

const schemaRecordSalesPartnerManualSendResponseSchema = <String, Object?>{
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'draftId',
    'activityId',
    'exactContentHash',
    'occurredAt',
    'outcome',
    'providerConfirmed',
    'sendAuthority',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'draftId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'activityId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'exactContentHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'occurredAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
      'maxLength': 48,
    },
    'outcome': <String, Object?>{
      'const': 'actor_attested_sent',
    },
    'providerConfirmed': <String, Object?>{
      'const': false,
    },
    'sendAuthority': <String, Object?>{
      'const': false,
    },
  },
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/record_sales_partner_manual_send_response.schema.json',
  'title': 'RecordSalesPartnerManualSendResponse',
  'x-callable-aliases': <Object?>[
    'recordSalesPartnerManualSend',
  ],
};
