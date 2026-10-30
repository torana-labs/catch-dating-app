// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/save_organizer_form_response_draft_payload.schema.json.

const schemaSaveOrganizerFormResponseDraftCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/save_organizer_form_response_draft_payload.schema.json',
  'title': 'SaveOrganizerFormResponseDraftCallablePayload',
  'description': 'Optimistically saves respondent answers without file bytes.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'draftId',
    'draftToken',
    'expectedRevision',
    'answers',
    'consentAccepted',
  ],
  'properties': <String, Object?>{
    'messagingChoices': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'termsVersion',
        'organizerWhatsapp',
        'catchWhatsapp',
      ],
      'properties': <String, Object?>{
        'termsVersion': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'form-whatsapp-v1',
            'form-whatsapp-v2',
          ],
        },
        'organizerWhatsapp': <String, Object?>{
          'type': 'boolean',
        },
        'catchWhatsapp': <String, Object?>{
          'type': 'boolean',
        },
        'organizerOperationsWhatsapp': <String, Object?>{
          'type': 'boolean',
        },
        'organizerMarketingWhatsapp': <String, Object?>{
          'type': 'boolean',
        },
        'catchMarketingWhatsapp': <String, Object?>{
          'type': 'boolean',
        },
      },
    },
    'draftId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'draftToken': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^[A-Za-z0-9_-]{32,160}\$',
    },
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'answers': <String, Object?>{
      'type': 'object',
      'maxProperties': 4000,
      'propertyNames': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 180,
      },
      'additionalProperties': <String, Object?>{
        'anyOf': <Object?>[
          <String, Object?>{
            'type': 'string',
            'maxLength': 10000,
          },
          <String, Object?>{
            'type': 'number',
            'minimum': -1000000000,
            'maximum': 1000000000,
          },
          <String, Object?>{
            'type': 'boolean',
          },
          <String, Object?>{
            'type': 'null',
          },
          <String, Object?>{
            'type': 'array',
            'maxItems': 100,
            'uniqueItems': true,
            'items': <String, Object?>{
              'type': 'string',
              'maxLength': 500,
            },
          },
        ],
      },
    },
    'consentAccepted': <String, Object?>{
      'type': 'boolean',
    },
  },
};
