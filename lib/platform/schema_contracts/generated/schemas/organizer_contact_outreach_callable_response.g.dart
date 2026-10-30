// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/organizer_contact_outreach_response.schema.json.

const schemaOrganizerContactOutreachCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/organizer_contact_outreach_response.schema.json',
  'title': 'OrganizerContactOutreachCallableResponse',
  'description': 'Safe organizer contact outreach state returned after recording an attempt.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'contactId',
    'outreachId',
    'channel',
    'outcome',
    'note',
    'authorUid',
    'occurredAtMillis',
    'createdAtMillis',
    'updatedAtMillis',
    'revision',
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
    'outreachId': <String, Object?>{
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
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 500,
    },
    'authorUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'occurredAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'createdAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'updatedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
  },
};
