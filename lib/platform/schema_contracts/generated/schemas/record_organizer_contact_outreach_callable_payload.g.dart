// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/record_organizer_contact_outreach_payload.schema.json.

const schemaRecordOrganizerContactOutreachCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/record_organizer_contact_outreach_payload.schema.json',
  'title': 'RecordOrganizerContactOutreachCallablePayload',
  'description': 'Manager-authorized request to log one outreach attempt on an organizer contact. An omitted occurredAtMillis records the attempt at server receipt; explicit times may not be in the future.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'contactId',
    'channel',
    'outcome',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'contactId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'channel': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'phoneCall',
        'whatsapp',
        'email',
        'sms',
        'inPerson',
        'other',
      ],
    },
    'outcome': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'reached',
        'noAnswer',
        'leftMessage',
        'wrongContact',
        'attempted',
      ],
    },
    'note': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 500,
    },
    'occurredAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
  },
};
