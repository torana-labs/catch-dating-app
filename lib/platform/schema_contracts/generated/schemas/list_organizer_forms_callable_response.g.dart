// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/list_organizer_forms_response.schema.json.

const schemaListOrganizerFormsCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/list_organizer_forms_response.schema.json',
  'title': 'ListOrganizerFormsCallableResponse',
  'description': 'One bounded page of manager-safe organizer form summaries.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'items',
    'nextCursor',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'items': <String, Object?>{
      'type': 'array',
      'maxItems': 100,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'organizerId',
          'formId',
          'title',
          'description',
          'purpose',
          'status',
          'templateId',
          'publicFormId',
          'defaultTargetKind',
          'defaultTargetId',
          'activeVersionId',
          'draftRevision',
          'publishedVersion',
          'submittedResponseCount',
          'consequences',
          'updatedAtMillis',
          'publishedAtMillis',
          'lastResponseAtMillis',
        ],
        'properties': <String, Object?>{
          'organizerId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'formId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'title': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
          },
          'description': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 1000,
          },
          'purpose': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'application',
              'registration',
              'intake',
              'waiver',
              'feedback',
              'survey',
            ],
          },
          'status': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'draft',
              'published',
              'paused',
              'archived',
            ],
          },
          'templateId': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'minLength': 1,
            'maxLength': 120,
          },
          'publicFormId': <String, Object?>{
            'type': 'string',
            'pattern': '^[A-Za-z0-9_-]{20,80}\$',
          },
          'defaultTargetKind': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'organizer',
              'event',
              'campaign',
            ],
          },
          'defaultTargetId': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
          'activeVersionId': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
          'draftRevision': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 9007199254740991,
          },
          'publishedVersion': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 1000000,
          },
          'submittedResponseCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 1000000000,
          },
          'consequences': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'coverage',
              'identityPolicy',
              'enabledAutomationActionKinds',
            ],
            'properties': <String, Object?>{
              'coverage': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'exact',
                  'identityOnly',
                  'unavailable',
                ],
              },
              'identityPolicy': <String, Object?>{
                'anyOf': <Object?>[
                  <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'anonymous',
                      'emailVerified',
                      'phoneVerified',
                      'emailOrPhoneVerified',
                      'catchAccount',
                    ],
                  },
                  <String, Object?>{
                    'type': 'null',
                  },
                ],
              },
              'enabledAutomationActionKinds': <String, Object?>{
                'type': 'array',
                'maxItems': 7,
                'uniqueItems': true,
                'items': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'notifyTeam',
                    'addOrganizerTag',
                    'createCrmContact',
                    'addApplicationQueue',
                    'proposeEventAttendee',
                    'signedWebhook',
                    'campaignHandoff',
                  ],
                },
              },
            },
          },
          'updatedAtMillis': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 9007199254740991,
          },
          'publishedAtMillis': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 0,
            'maximum': 9007199254740991,
          },
          'lastResponseAtMillis': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 0,
            'maximum': 9007199254740991,
          },
        },
      },
    },
    'nextCursor': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 500,
    },
  },
};
