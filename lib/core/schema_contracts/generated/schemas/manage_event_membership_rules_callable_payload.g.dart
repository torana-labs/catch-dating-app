// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/manage_event_membership_rules_payload.schema.json.

const schemaManageEventMembershipRulesCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/manage_event_membership_rules_payload.schema.json',
  'title': 'ManageEventMembershipRulesCallablePayload',
  'description': 'Organizer-manager read and edit of one event\'s paid-membership rules: member price overrides, early-access hours and the members-only flag.',
  'x-owner': 'Host event editor membership rules section',
  'oneOf': <Object?>[
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'action',
        'eventId',
      ],
      'properties': <String, Object?>{
        'action': <String, Object?>{
          'enum': <Object?>[
            'get',
            'clear',
          ],
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
        'eventId',
        'memberPriceOverrides',
        'earlyAccessHours',
        'membersOnly',
        'expectedRevision',
      ],
      'properties': <String, Object?>{
        'action': <String, Object?>{
          'const': 'save',
        },
        'eventId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'memberPriceOverrides': <String, Object?>{
          'type': 'array',
          'maxItems': 10,
          'items': <String, Object?>{
            'oneOf': <Object?>[
              <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'planId',
                  'percentOff',
                ],
                'properties': <String, Object?>{
                  'planId': <String, Object?>{
                    'type': 'string',
                    'pattern': '^hmp_[A-Za-z0-9]{20}\$',
                  },
                  'percentOff': <String, Object?>{
                    'type': 'integer',
                    'minimum': 1,
                    'maximum': 100,
                  },
                },
              },
              <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'planId',
                  'priceInPaise',
                ],
                'properties': <String, Object?>{
                  'planId': <String, Object?>{
                    'type': 'string',
                    'pattern': '^hmp_[A-Za-z0-9]{20}\$',
                  },
                  'priceInPaise': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 100000000,
                  },
                },
              },
            ],
          },
        },
        'earlyAccessHours': <String, Object?>{
          'oneOf': <Object?>[
            <String, Object?>{
              'type': 'null',
            },
            <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 168,
            },
          ],
        },
        'membersOnly': <String, Object?>{
          'type': 'boolean',
        },
        'expectedRevision': <String, Object?>{
          'type': <Object?>[
            'integer',
            'null',
          ],
          'minimum': 1,
          'maximum': 9007199254740990,
        },
      },
    },
  ],
};
