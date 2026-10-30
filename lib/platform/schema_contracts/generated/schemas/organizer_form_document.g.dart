// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_forms.schema.json.

const schemaOrganizerFormDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_forms.schema.json',
  'title': 'OrganizerFormDocument',
  'description': 'Organizer-owned generic form metadata and lifecycle. Editable content lives in a draft and published content in immutable versions.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'organizerForms',
  'x-firestore-path': 'organizerForms/{formId}',
  'x-document-id-field': 'formId',
  'x-owner': 'organizer form management callables',
  'required': <Object?>[
    'organizerId',
    'createdByUid',
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
    'createdAt',
    'updatedAt',
    'publishedAt',
    'pausedAt',
    'archivedAt',
    'lastResponseAt',
  ],
  'properties': <String, Object?>{
    'pendingPaymentCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'description': 'Unreleased form response reservations awaiting a fee. Legacy omitted means zero.',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'createdByUid': <String, Object?>{
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
    'consequenceProjection': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'version',
        'coverage',
        'identityPolicy',
        'enabledAutomationActionKinds',
        'enabledAutomationActionKindCounts',
      ],
      'properties': <String, Object?>{
        'version': <String, Object?>{
          'type': 'integer',
          'enum': <Object?>[
            1,
          ],
        },
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
        'enabledAutomationActionKindCounts': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'notifyTeam',
            'addOrganizerTag',
            'createCrmContact',
            'addApplicationQueue',
            'proposeEventAttendee',
            'signedWebhook',
            'campaignHandoff',
          ],
          'properties': <String, Object?>{
            'notifyTeam': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 1000000,
            },
            'addOrganizerTag': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 1000000,
            },
            'createCrmContact': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 1000000,
            },
            'addApplicationQueue': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 1000000,
            },
            'proposeEventAttendee': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 1000000,
            },
            'signedWebhook': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 1000000,
            },
            'campaignHandoff': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 1000000,
            },
          },
        },
      },
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
    'publishedAt': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
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
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'pausedAt': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
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
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'archivedAt': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
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
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'lastResponseAt': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
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
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
  },
};
