// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/submit_event_runtime_profile_payload.schema.json.

const schemaSubmitEventRuntimeProfileCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/submit_event_runtime_profile_payload.schema.json',
  'title': 'SubmitEventRuntimeProfileCallablePayload',
  'description': 'Submits the minimum event-scoped profile required by enabled Event Success modules.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'publicRuntimeId',
    'runtimeTermsVersion',
    'saveAsCatchPrefill',
    'fields',
  ],
  'properties': <String, Object?>{
    'publicRuntimeId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{20,80}\$',
    },
    'runtimeTermsVersion': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 80,
    },
    'sensitiveDataTermsVersion': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 80,
    },
    'saveAsCatchPrefill': <String, Object?>{
      'type': 'boolean',
    },
    'fields': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'properties': <String, Object?>{
        'displayName': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
        },
        'gender': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'enum': <Object?>[
            'man',
            'woman',
            'nonBinary',
            'other',
            null,
          ],
        },
        'interestedInGenders': <String, Object?>{
          'type': 'array',
          'uniqueItems': true,
          'maxItems': 4,
          'items': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'man',
              'woman',
              'nonBinary',
              'other',
            ],
          },
        },
        'relationshipGoal': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'enum': <Object?>[
            'relationship',
            'casual',
            'marriage',
            'friendship',
            'unsure',
            null,
          ],
        },
        'dateOfBirthMillis': <String, Object?>{
          'type': <Object?>[
            'integer',
            'null',
          ],
        },
        'paceBand': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'enum': <Object?>[
            'competitive',
            'fast',
            'moderate',
            'easy',
            null,
          ],
        },
        'skillBand': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'enum': <Object?>[
            'beginner',
            'intermediate',
            'advanced',
            null,
          ],
        },
        'dietaryAndSeatingNotes': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'minLength': 1,
          'maxLength': 300,
        },
        'questionnaireAnswerIds': <String, Object?>{
          'type': 'array',
          'uniqueItems': true,
          'maxItems': 8,
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
          },
        },
        'teamName': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'minLength': 1,
          'maxLength': 80,
        },
      },
    },
  },
};
