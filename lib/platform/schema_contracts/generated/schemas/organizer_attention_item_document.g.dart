// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_attention_items.schema.json.

const schemaOrganizerAttentionItemDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_attention_items.schema.json',
  'title': 'OrganizerAttentionItemDocument',
  'description': 'Server-owned evaluated Host Today attention projection. Executable trigger, resolution, permission, deadline, and dedupe policy remains versioned in the Host attention catalog rather than embedded as prose in each document.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'organizerAttentionItems',
  'x-firestore-path': 'organizerAttentionItems/{attentionId}',
  'x-document-id-field': 'attentionId',
  'x-owner': 'listOrganizerAttentionItems read-through reconciliation',
  'required': <Object?>[
    'schemaVersion',
    'attentionId',
    'organizerId',
    'kind',
    'scope',
    'sourceOwner',
    'sourceId',
    'sourceRevision',
    'eventId',
    'status',
    'consequence',
    'blocking',
    'urgency',
    'destination',
    'context',
    'dedupeKey',
    'policyVersion',
    'resolutionVersion',
    'assignedHostUid',
    'openedAt',
    'dueAt',
    'actionExpiresAt',
    'sourceUpdatedAt',
    'createdAt',
    'updatedAt',
    'resolvedAt',
    'purgeAt',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
      'x-catch-ownership': 'server-only',
    },
    'attentionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'kind': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'eventLiveOperations',
        'eventAssistanceCaseReview',
        'eventAssistanceDeliveryReview',
        'eventWaitlistReview',
        'eventJoinRequestReview',
        'applicationReview',
        'providerSyncFailure',
        'formAutomationFailure',
        'payoutSetup',
        'attendanceSync',
        'dressRehearsal',
        'eventSuccessPreparation',
        'roomLayoutSetup',
        'eventStaffing',
        'formResponseReview',
        'inboxReply',
        'postEventReconciliation',
        'momentStaffAttention',
        'eventOfferPaymentFollowUp',
      ],
      'x-catch-catalog': '../catalogs/host_attention_policies.json',
      'x-catch-ownership': 'server-only',
    },
    'scope': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'organizer',
        'event',
        'application',
        'form',
        'thread',
        'account',
      ],
      'x-catch-ownership': 'server-only',
    },
    'sourceOwner': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'events',
        'eventParticipations',
        'organizerApplications',
        'providerSyncRuns',
        'organizerFormAutomationRuns',
        'hostPaymentAccounts',
        'hostAttendanceOutbox',
        'eventAssistanceCases',
        'operationWorkItems',
        'eventSuccessPlans',
        'eventRehearsals',
        'eventStaffGrants',
        'organizerFormResponses',
        'organizerWhatsappThreads',
        'eventAttendees',
        'organizerMomentSends',
        'organizerEventOffers',
      ],
      'x-catch-ownership': 'server-only',
    },
    'sourceId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'sourceRevision': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'eventId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'open',
        'resolved',
        'expired',
        'superseded',
      ],
      'x-catch-ownership': 'server-only',
    },
    'consequence': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'blocksLiveOperation',
        'risksGuestExperience',
        'risksRevenue',
        'delaysResponse',
        'degradesAutomation',
        'requiresReconciliation',
        'preparationIncomplete',
        'informational',
      ],
      'x-catch-ownership': 'server-only',
    },
    'blocking': <String, Object?>{
      'type': 'boolean',
      'x-catch-ownership': 'server-only',
    },
    'urgency': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'immediate',
        'soon',
        'upcoming',
      ],
      'x-catch-ownership': 'server-only',
    },
    'destination': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'route',
        'section',
        'eventId',
        'applicationId',
        'formId',
        'threadId',
      ],
      'properties': <String, Object?>{
        'route': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'hostEventManage',
            'hostApplications',
            'hostOrganizerPayments',
            'hostAudienceForms',
            'hostInbox',
            'hostDressRehearsal',
            'hostEvents',
            'hostProgramWork',
          ],
        },
        'section': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 80,
        },
        'eventId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 180,
        },
        'applicationId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 180,
        },
        'formId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 180,
        },
        'threadId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 180,
        },
      },
      'x-catch-ownership': 'server-only',
    },
    'context': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'eventName',
        'subjectLabel',
        'count',
        'provider',
        'errorCode',
      ],
      'properties': <String, Object?>{
        'eventName': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 160,
        },
        'subjectLabel': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 160,
        },
        'count': <String, Object?>{
          'type': <Object?>[
            'integer',
            'null',
          ],
          'minimum': 0,
          'maximum': 1000000000,
        },
        'provider': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 80,
        },
        'errorCode': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 120,
        },
      },
      'x-catch-ownership': 'server-only',
    },
    'dedupeKey': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
      'x-catch-ownership': 'server-only',
    },
    'policyVersion': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 1000000,
      'x-catch-ownership': 'server-only',
    },
    'resolutionVersion': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 1000000,
      'x-catch-ownership': 'server-only',
    },
    'assignedHostUid': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'openedAt': <String, Object?>{
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
      'x-catch-ownership': 'server-only',
    },
    'dueAt': <String, Object?>{
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
      'x-catch-ownership': 'server-only',
    },
    'actionExpiresAt': <String, Object?>{
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
      'x-catch-ownership': 'server-only',
    },
    'sourceUpdatedAt': <String, Object?>{
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
      'x-catch-ownership': 'server-only',
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
      'x-catch-ownership': 'server-only',
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
      'x-catch-ownership': 'server-only',
    },
    'resolvedAt': <String, Object?>{
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
      'x-catch-ownership': 'server-only',
    },
    'purgeAt': <String, Object?>{
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
      'x-firestore-ttl': true,
      'x-catch-ownership': 'server-only',
    },
  },
};
