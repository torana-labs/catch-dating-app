// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/record_sales_partner_manual_send_payload.schema.json.

const schemaRecordSalesPartnerManualSendCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/record_sales_partner_manual_send_payload.schema.json',
  'title': 'RecordSalesPartnerManualSendCallablePayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'requestId',
    'organizerId',
    'expectedAssignmentRevision',
    'draftId',
    'expectedContentHash',
    'channel',
    'occurredAt',
    'attestation',
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
      'minLength': 1,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'expectedAssignmentRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'draftId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'expectedContentHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'channel': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'email',
        'whatsapp',
        'other',
      ],
    },
    'occurredAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
      'maxLength': 48,
    },
    'attestation': <String, Object?>{
      'type': 'string',
      'const': 'i_manually_sent_this_reviewed_draft',
    },
  },
  'x-callable-aliases': <Object?>[
    'recordSalesPartnerManualSend',
  ],
};
