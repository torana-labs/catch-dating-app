// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/override_event_success_groups_payload.schema.json.

const schemaOverrideEventSuccessGroupsCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/override_event_success_groups_payload.schema.json',
  'title': 'OverrideEventSuccessGroupsCallablePayload',
  'description': 'Callable payload accepted by overrideEventSuccessGroups.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'rounds',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'rounds': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 32,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'roundIndex',
          'groups',
        ],
        'properties': <String, Object?>{
          'roundIndex': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 31,
          },
          'groups': <String, Object?>{
            'type': 'array',
            'minItems': 1,
            'maxItems': 100,
            'items': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'label',
                'participantUids',
              ],
              'properties': <String, Object?>{
                'label': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 80,
                },
                'participantUids': <String, Object?>{
                  'type': 'array',
                  'minItems': 1,
                  'maxItems': 24,
                  'items': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
