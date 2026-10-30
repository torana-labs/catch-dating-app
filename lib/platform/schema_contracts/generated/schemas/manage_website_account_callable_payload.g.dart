// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/manage_website_account_payload.schema.json.

const schemaManageWebsiteAccountCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/manage_website_account_payload.schema.json',
  'title': 'ManageWebsiteAccountCallablePayload',
  'description': 'Read or complete the authenticated account with minimal identity. Phone ownership comes from Firebase Auth, never payload data.',
  'oneOf': <Object?>[
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'action',
      ],
      'properties': <String, Object?>{
        'action': <String, Object?>{
          'const': 'read',
        },
        'organizerId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'eventId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'action',
        'displayName',
        'expectedProfileRevision',
        'expectedUid',
      ],
      'properties': <String, Object?>{
        'action': <String, Object?>{
          'const': 'complete',
        },
        'displayName': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 80,
          'pattern': '.*\\S.*',
        },
        'dateOfBirth': <String, Object?>{
          'type': 'string',
          'format': 'date',
          'description': 'Optional real birth date. Omission preserves existing data; no placeholder is synthesized.',
        },
        'expectedProfileRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'organizerId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'eventId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'expectedUid': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
      },
    },
  ],
};
