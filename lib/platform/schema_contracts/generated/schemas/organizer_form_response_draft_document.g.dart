// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_form_response_drafts.schema.json.

const schemaOrganizerFormResponseDraftDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_form_response_drafts.schema.json',
  'title': 'OrganizerFormResponseDraftDocument',
  'description': 'Expiring version-bound respondent autosave state.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'formId',
    'versionId',
    'publicFormId',
    'status',
    'revision',
    'identityKind',
    'respondentUid',
    'draftTokenHash',
    'answers',
    'consentAccepted',
    'consentVersion',
    'sourceLinkId',
    'createdAt',
    'updatedAt',
    'expiresAt',
    'submittedResponseId',
  ],
  'properties': <String, Object?>{
    'messagingDecision': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'termsVersion',
        'organizerWhatsapp',
        'catchWhatsapp',
        'organizerDecidedAt',
        'catchDecidedAt',
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
        'organizerDecidedAt': <String, Object?>{
          'type': 'object',
          'description': 'Serialized Firestore Timestamp fixture shape.',
          'x-firestore-type': 'timestamp',
          'additionalProperties': false,
          'required': <Object?>[
            '_seconds',
            '_nanoseconds',
          ],
          'properties': <String, Object?>{
            '_seconds': <String, Object?>{
              'type': 'integer',
            },
            '_nanoseconds': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 999999999,
            },
          },
        },
        'catchDecidedAt': <String, Object?>{
          'type': 'object',
          'description': 'Serialized Firestore Timestamp fixture shape.',
          'x-firestore-type': 'timestamp',
          'additionalProperties': false,
          'required': <Object?>[
            '_seconds',
            '_nanoseconds',
          ],
          'properties': <String, Object?>{
            '_seconds': <String, Object?>{
              'type': 'integer',
            },
            '_nanoseconds': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 999999999,
            },
          },
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
        'organizerOperationsDecidedAt': <String, Object?>{
          'type': 'object',
          'description': 'Serialized Firestore Timestamp fixture shape.',
          'x-firestore-type': 'timestamp',
          'additionalProperties': false,
          'required': <Object?>[
            '_seconds',
            '_nanoseconds',
          ],
          'properties': <String, Object?>{
            '_seconds': <String, Object?>{
              'type': 'integer',
            },
            '_nanoseconds': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 999999999,
            },
          },
        },
        'organizerMarketingDecidedAt': <String, Object?>{
          'type': 'object',
          'description': 'Serialized Firestore Timestamp fixture shape.',
          'x-firestore-type': 'timestamp',
          'additionalProperties': false,
          'required': <Object?>[
            '_seconds',
            '_nanoseconds',
          ],
          'properties': <String, Object?>{
            '_seconds': <String, Object?>{
              'type': 'integer',
            },
            '_nanoseconds': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 999999999,
            },
          },
        },
        'catchMarketingDecidedAt': <String, Object?>{
          'type': 'object',
          'description': 'Serialized Firestore Timestamp fixture shape.',
          'x-firestore-type': 'timestamp',
          'additionalProperties': false,
          'required': <Object?>[
            '_seconds',
            '_nanoseconds',
          ],
          'properties': <String, Object?>{
            '_seconds': <String, Object?>{
              'type': 'integer',
            },
            '_nanoseconds': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 999999999,
            },
          },
        },
      },
    },
    'paymentAttemptId': <String, Object?>{
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
      'description': 'Server-only checkout lock; prevents edits while a fee is unresolved.',
    },
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
    'versionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'publicFormId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{20,80}\$',
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'active',
        'submitted',
        'expired',
        'withdrawn',
      ],
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'identityKind': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'anonymous',
        'emailVerified',
        'phoneVerified',
        'catchAccount',
      ],
    },
    'respondentUid': <String, Object?>{
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
    'draftTokenHash': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^[a-f0-9]{64}\$',
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
    'consentVersion': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 80,
    },
    'sourceLinkId': <String, Object?>{
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
    'createdAt': <String, Object?>{
      'type': 'object',
      'description': 'Serialized Firestore Timestamp fixture shape.',
      'x-firestore-type': 'timestamp',
      'additionalProperties': false,
      'required': <Object?>[
        '_seconds',
        '_nanoseconds',
      ],
      'properties': <String, Object?>{
        '_seconds': <String, Object?>{
          'type': 'integer',
        },
        '_nanoseconds': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 999999999,
        },
      },
    },
    'updatedAt': <String, Object?>{
      'type': 'object',
      'description': 'Serialized Firestore Timestamp fixture shape.',
      'x-firestore-type': 'timestamp',
      'additionalProperties': false,
      'required': <Object?>[
        '_seconds',
        '_nanoseconds',
      ],
      'properties': <String, Object?>{
        '_seconds': <String, Object?>{
          'type': 'integer',
        },
        '_nanoseconds': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 999999999,
        },
      },
    },
    'expiresAt': <String, Object?>{
      'type': 'object',
      'description': 'Serialized Firestore Timestamp fixture shape.',
      'x-firestore-type': 'timestamp',
      'additionalProperties': false,
      'required': <Object?>[
        '_seconds',
        '_nanoseconds',
      ],
      'properties': <String, Object?>{
        '_seconds': <String, Object?>{
          'type': 'integer',
        },
        '_nanoseconds': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 999999999,
        },
      },
    },
    'submittedResponseId': <String, Object?>{
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
  },
  'x-firestore-collection': 'organizerFormResponseDrafts',
  'x-firestore-path': 'organizerFormResponseDrafts/{draftId}',
  'x-document-id-field': 'draftId',
  'x-owner': 'organizer form respondent callables',
};
