// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/list_organizer_applications_response.schema.json.

const schemaListOrganizerApplicationsCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/list_organizer_applications_response.schema.json',
  'title': 'ListOrganizerApplicationsCallableResponse',
  'description': 'Safe organizer application review rows and opaque pagination state.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'applications',
    'nextCursor',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'applications': <String, Object?>{
      'type': 'array',
      'maxItems': 100,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'applicationId',
          'formId',
          'formVersionId',
          'targetKind',
          'targetId',
          'applicantDisplayName',
          'reviewStatus',
          'dataAccessState',
          'sourceKind',
          'providerId',
          'submittedAtMillis',
          'revision',
        ],
        'properties': <String, Object?>{
          'applicationId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'formId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'formVersionId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'targetKind': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'organizer',
              'event',
              'campaign',
            ],
          },
          'targetId': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'minLength': 1,
            'maxLength': 180,
          },
          'applicantDisplayName': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
          },
          'reviewStatus': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'submitted',
              'inReview',
              'approved',
              'waitlisted',
              'declined',
              'withdrawn',
            ],
          },
          'dataAccessState': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'organizerImported',
              'activeParticipantGrant',
              'revokedParticipantGrant',
              'submittedFormResponse',
            ],
          },
          'sourceKind': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'native',
              'tabularImport',
              'connector',
            ],
          },
          'providerId': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'minLength': 1,
            'maxLength': 80,
          },
          'submittedAtMillis': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'revision': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 9007199254740991,
          },
          'contactId': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'minLength': 1,
            'maxLength': 180,
          },
          'sourceResponseId': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'minLength': 1,
            'maxLength': 180,
          },
        },
      },
    },
    'nextCursor': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 1000,
    },
  },
  'definitions': <String, Object?>{
    'application': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'applicationId',
        'formId',
        'formVersionId',
        'targetKind',
        'targetId',
        'applicantDisplayName',
        'reviewStatus',
        'dataAccessState',
        'sourceKind',
        'providerId',
        'submittedAtMillis',
        'revision',
      ],
      'properties': <String, Object?>{
        'applicationId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'formId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'formVersionId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'targetKind': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'organizer',
            'event',
            'campaign',
          ],
        },
        'targetId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'minLength': 1,
          'maxLength': 180,
        },
        'applicantDisplayName': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
        },
        'reviewStatus': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'submitted',
            'inReview',
            'approved',
            'waitlisted',
            'declined',
            'withdrawn',
          ],
        },
        'dataAccessState': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'organizerImported',
            'activeParticipantGrant',
            'revokedParticipantGrant',
            'submittedFormResponse',
          ],
        },
        'sourceKind': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'native',
            'tabularImport',
            'connector',
          ],
        },
        'providerId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'minLength': 1,
          'maxLength': 80,
        },
        'submittedAtMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'contactId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'minLength': 1,
          'maxLength': 180,
        },
        'sourceResponseId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'minLength': 1,
          'maxLength': 180,
        },
      },
    },
  },
};
