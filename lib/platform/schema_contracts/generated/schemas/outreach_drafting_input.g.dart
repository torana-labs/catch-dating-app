// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from operations/outreach_drafting_input.schema.json.

const schemaOutreachDraftingInputSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/operations/outreach_drafting_input.schema.json',
  'title': 'OutreachDraftingInput',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'organizer',
    'contact',
    'opportunity',
    'language',
    'channel',
    'purpose',
    'evaluatedAt',
    'policy',
    'observations',
    'capabilities',
    'references',
    'ctas',
    'priorInteraction',
    'evidenceConflictStatus',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'organizer': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'organizerId',
        'name',
        'revision',
        'identityStatus',
      ],
      'properties': <String, Object?>{
        'organizerId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'name': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 500,
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'identityStatus': <String, Object?>{
          'const': 'verified',
        },
      },
    },
    'contact': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'contactId',
        'revision',
        'role',
        'eligibility',
        'suppressionStatus',
        'claimStatus',
      ],
      'properties': <String, Object?>{
        'contactId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'role': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 500,
        },
        'eligibility': <String, Object?>{
          'const': 'eligible',
        },
        'suppressionStatus': <String, Object?>{
          'const': 'clear',
        },
        'claimStatus': <String, Object?>{
          'enum': <Object?>[
            'verified',
            'not_required',
          ],
        },
      },
    },
    'opportunity': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'opportunityId',
        'revision',
        'stage',
        'motion',
      ],
      'properties': <String, Object?>{
        'opportunityId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'stage': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'motion': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
      },
    },
    'language': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'en',
      ],
    },
    'channel': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'email',
        'message',
      ],
    },
    'purpose': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'first_message',
        'follow_up',
      ],
    },
    'evaluatedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'policy': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'promptVersion',
        'playbookVersion',
        'modelId',
      ],
      'properties': <String, Object?>{
        'promptVersion': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'playbookVersion': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'modelId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
      },
    },
    'observations': <String, Object?>{
      'type': 'array',
      'maxItems': 12,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'id',
          'text',
          'revision',
          'organizerId',
          'approved',
          'validUntil',
        ],
        'properties': <String, Object?>{
          'id': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'text': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 500,
          },
          'revision': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'organizerId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'approved': <String, Object?>{
            'const': true,
          },
          'validUntil': <String, Object?>{
            'type': 'string',
            'format': 'date-time',
          },
        },
      },
    },
    'capabilities': <String, Object?>{
      'type': 'array',
      'maxItems': 12,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'id',
          'text',
          'revision',
          'organizerId',
          'approved',
          'validUntil',
        ],
        'properties': <String, Object?>{
          'id': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'text': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 500,
          },
          'revision': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'organizerId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'approved': <String, Object?>{
            'const': true,
          },
          'validUntil': <String, Object?>{
            'type': 'string',
            'format': 'date-time',
          },
        },
      },
    },
    'references': <String, Object?>{
      'type': 'array',
      'maxItems': 8,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'id',
          'text',
          'revision',
          'organizerId',
          'approved',
          'validUntil',
        ],
        'properties': <String, Object?>{
          'id': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'text': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 500,
          },
          'revision': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'organizerId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'approved': <String, Object?>{
            'const': true,
          },
          'validUntil': <String, Object?>{
            'type': 'string',
            'format': 'date-time',
          },
        },
      },
    },
    'ctas': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 8,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'id',
          'text',
          'revision',
        ],
        'properties': <String, Object?>{
          'id': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'text': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 500,
          },
          'revision': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
        },
      },
    },
    'priorInteraction': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'null',
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'activityId',
            'summary',
            'revision',
          ],
          'properties': <String, Object?>{
            'activityId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'summary': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 500,
            },
            'revision': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
            },
          },
        },
      ],
    },
    'evidenceConflictStatus': <String, Object?>{
      'enum': <Object?>[
        'clear',
        'needs_review',
      ],
    },
  },
  'definitions': <String, Object?>{
    'id': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'text': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 500,
    },
    'organizer': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'organizerId',
        'name',
        'revision',
        'identityStatus',
      ],
      'properties': <String, Object?>{
        'organizerId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'name': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 500,
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'identityStatus': <String, Object?>{
          'const': 'verified',
        },
      },
    },
    'contact': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'contactId',
        'revision',
        'role',
        'eligibility',
        'suppressionStatus',
        'claimStatus',
      ],
      'properties': <String, Object?>{
        'contactId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'role': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 500,
        },
        'eligibility': <String, Object?>{
          'const': 'eligible',
        },
        'suppressionStatus': <String, Object?>{
          'const': 'clear',
        },
        'claimStatus': <String, Object?>{
          'enum': <Object?>[
            'verified',
            'not_required',
          ],
        },
      },
    },
    'opportunity': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'opportunityId',
        'revision',
        'stage',
        'motion',
      ],
      'properties': <String, Object?>{
        'opportunityId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'stage': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'motion': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
      },
    },
    'clause': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'id',
        'text',
        'revision',
        'organizerId',
        'approved',
        'validUntil',
      ],
      'properties': <String, Object?>{
        'id': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'text': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 500,
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'organizerId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'approved': <String, Object?>{
          'const': true,
        },
        'validUntil': <String, Object?>{
          'type': 'string',
          'format': 'date-time',
        },
      },
    },
  },
};
