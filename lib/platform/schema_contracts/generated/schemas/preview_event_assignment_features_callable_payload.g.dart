// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/preview_event_assignment_features_payload.schema.json.

const schemaPreviewEventAssignmentFeaturesCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/preview_event_assignment_features_payload.schema.json',
  'title': 'PreviewEventAssignmentFeaturesCallablePayload',
  'description': 'Manager-only aggregate coverage preview for unsaved event-local structured matching rules.',
  'x-callable-aliases': <Object?>[
    'previewEventAssignmentFeatures',
  ],
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'rules',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'rules': <String, Object?>{
      'type': 'array',
      'maxItems': 8,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'featureId',
          'formId',
          'versionId',
          'questionId',
          'transformVersion',
          'kind',
          'mode',
          'weight',
        ],
        'properties': <String, Object?>{
          'featureId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'formId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'versionId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'questionId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'transformVersion': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 1000000,
          },
          'kind': <String, Object?>{
            'enum': <Object?>[
              'category',
              'set',
              'number',
              'ordinal',
            ],
          },
          'mode': <String, Object?>{
            'enum': <Object?>[
              'preferSimilar',
              'preferDifferent',
              'balanceAcrossGroups',
            ],
          },
          'weight': <String, Object?>{
            'type': 'number',
            'minimum': 0,
            'maximum': 100,
          },
          'optionIds': <String, Object?>{
            'type': 'array',
            'maxItems': 40,
            'uniqueItems': true,
            'items': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
          },
          'scoreByOptionId': <String, Object?>{
            'type': 'object',
            'maxProperties': 40,
            'propertyNames': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'additionalProperties': <String, Object?>{
              'type': 'number',
            },
          },
          'minimum': <String, Object?>{
            'type': 'number',
          },
          'maximum': <String, Object?>{
            'type': 'number',
          },
        },
      },
    },
    'sourceFormIds': <String, Object?>{
      'type': 'array',
      'maxItems': 4,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 180,
      },
    },
  },
};
