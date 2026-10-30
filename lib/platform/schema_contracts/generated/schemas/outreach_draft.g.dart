// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from operations/outreach_drafting_draft.schema.json.

const schemaOutreachDraftSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/operations/outreach_drafting_draft.schema.json',
  'title': 'OutreachDraft',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'draftId',
    'organizerId',
    'contactId',
    'opportunityId',
    'language',
    'channel',
    'subject',
    'text',
    'sentences',
    'selection',
    'inputHash',
    'contentHash',
    'sourceRevisions',
    'model',
    'reviewStatus',
    'sendAuthority',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'draftId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
    },
    'contactId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
    },
    'opportunityId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
    },
    'language': <String, Object?>{
      'const': 'en',
    },
    'channel': <String, Object?>{
      'enum': <Object?>[
        'email',
        'message',
      ],
    },
    'subject': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 160,
    },
    'text': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 4000,
    },
    'sentences': <String, Object?>{
      'type': 'array',
      'minItems': 2,
      'maxItems': 5,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'text',
          'kind',
          'sourceIds',
        ],
        'properties': <String, Object?>{
          'text': <String, Object?>{
            'type': 'string',
            'minLength': 1,
          },
          'kind': <String, Object?>{
            'enum': <Object?>[
              'observation',
              'capability',
              'reference',
              'cta',
              'prior_interaction',
            ],
          },
          'sourceIds': <String, Object?>{
            'type': 'array',
            'minItems': 1,
            'maxItems': 1,
            'items': <String, Object?>{
              'type': 'string',
            },
          },
        },
      },
    },
    'selection': <String, Object?>{
      'title': 'OutreachDraftingSelection',
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'organizerId',
        'contactId',
        'opportunityId',
        'language',
        'observationId',
        'capabilityId',
        'referenceId',
        'ctaId',
        'reasonToBlock',
        'omittedIds',
      ],
      'properties': <String, Object?>{
        'organizerId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
        },
        'contactId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
        },
        'opportunityId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
        },
        'language': <String, Object?>{
          'const': 'en',
        },
        'observationId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
        },
        'capabilityId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
        },
        'referenceId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
        },
        'ctaId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
        },
        'reasonToBlock': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 200,
        },
        'omittedIds': <String, Object?>{
          'type': 'array',
          'maxItems': 20,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
          },
        },
      },
    },
    'inputHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'contentHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'sourceRevisions': <String, Object?>{
      'type': 'object',
      'additionalProperties': <String, Object?>{
        'type': 'integer',
        'minimum': 0,
      },
    },
    'model': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'modelId',
        'promptVersion',
        'playbookVersion',
        'cacheHit',
        'usage',
      ],
      'properties': <String, Object?>{
        'modelId': <String, Object?>{
          'type': 'string',
        },
        'promptVersion': <String, Object?>{
          'type': 'string',
        },
        'playbookVersion': <String, Object?>{
          'type': 'string',
        },
        'cacheHit': <String, Object?>{
          'type': 'boolean',
        },
        'usage': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'inputTokens',
            'outputTokens',
            'costMicros',
          ],
          'properties': <String, Object?>{
            'inputTokens': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
            },
            'outputTokens': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
            },
            'costMicros': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
            },
          },
        },
      },
    },
    'reviewStatus': <String, Object?>{
      'const': 'pending_review',
    },
    'sendAuthority': <String, Object?>{
      'const': false,
    },
  },
};
