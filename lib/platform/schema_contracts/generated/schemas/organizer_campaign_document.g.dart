// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_campaigns.schema.json.

const schemaOrganizerCampaignDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_campaigns.schema.json',
  'title': 'OrganizerCampaignDocument',
  'description': 'One organizer-owned cross-event campaign with frozen approval and aggregate delivery state.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'organizerCampaigns',
  'x-firestore-path': 'organizerCampaigns/{campaignId}',
  'x-document-id-field': 'campaignId',
  'x-owner': 'organizer campaign callables and dispatcher',
  'required': <Object?>[
    'organizerId',
    'createdByUid',
    'messageClass',
    'channel',
    'status',
    'name',
    'segmentIds',
    'connectionId',
    'templateId',
    'templateVariables',
    'eventId',
    'inviteDestinationKind',
    'scheduledAt',
    'recipientSnapshotHash',
    'contentHash',
    'audienceCounts',
    'deliveryCounts',
    'revision',
    'leaseOwner',
    'leaseExpiresAt',
    'createdAt',
    'updatedAt',
    'approvedAt',
    'dispatchedAt',
    'completedAt',
    'cancelledAt',
  ],
  'properties': <String, Object?>{
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
    'messageClass': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'eventFollowUp',
        'organizerUpdate',
        'organizerPromotion',
      ],
    },
    'channel': <String, Object?>{
      'const': 'whatsapp',
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'draft',
        'previewed',
        'approved',
        'scheduled',
        'resolving',
        'sending',
        'completed',
        'partiallyFailed',
        'cancelled',
        'blocked',
      ],
    },
    'name': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
    },
    'segmentIds': <String, Object?>{
      'type': 'array',
      'maxItems': 5,
      'uniqueItems': true,
      'description': 'Legacy read compatibility only. New campaign writes use savedAudienceId and persist an empty array.',
      'items': <String, Object?>{
        'type': 'string',
        'enum': <Object?>[
          'first_time_attendee',
          'repeat_attendee',
          'regular',
          'lapsed_regular',
          'reliable_attendee',
          'advocate',
          'high_impact_advocate',
          'whatsapp_reachable',
        ],
      },
    },
    'savedAudienceId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
      'description': 'Customers-owned reusable audience used by every new campaign. Null or absent only on legacy segment-authored campaigns.',
    },
    'savedAudienceRevision': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'savedAudienceDefinitionHash': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^[a-f0-9]{64}\$',
    },
    'recipientSource': <String, Object?>{
      'type': <Object?>[
        'object',
        'null',
      ],
      'additionalProperties': false,
      'required': <Object?>[
        'kind',
      ],
      'description': 'Where recipients resolve from. Absent reads as savedAudience backed by savedAudienceId. kind=programSelection draws recipients from programFunctionGuests/programGuests instead of CRM audiences.',
      'properties': <String, Object?>{
        'kind': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'savedAudience',
            'programSelection',
          ],
        },
        'programId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'minLength': 1,
          'maxLength': 180,
          'description': 'Required when kind=programSelection; ignored otherwise.',
        },
        'functionIds': <String, Object?>{
          'type': <Object?>[
            'array',
            'null',
          ],
          'maxItems': 32,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'description': 'Restricts to guests invited to these functions; null or empty means every function in the program.',
        },
        'rsvpStatuses': <String, Object?>{
          'type': <Object?>[
            'array',
            'null',
          ],
          'maxItems': 4,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'pending',
              'attending',
              'declined',
              'maybe',
            ],
          },
          'description': 'Restricts to matching per-function RSVP states; null or empty means every status.',
        },
        'householdDedupe': <String, Object?>{
          'type': <Object?>[
            'boolean',
            'null',
          ],
          'description': 'When true, one message is sent per household primary contact instead of per guest. Default false.',
        },
      },
    },
    'connectionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'templateId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'templateVariables': <String, Object?>{
      'type': 'object',
      'maxProperties': 20,
      'propertyNames': <String, Object?>{
        'pattern': '^[A-Za-z][A-Za-z0-9_]{0,63}\$',
      },
      'additionalProperties': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 240,
      },
    },
    'eventId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'inviteDestinationKind': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'enum': <Object?>[
        null,
        'catchEvent',
        'eventRuntime',
        'externalBooking',
        'marketingLanding',
      ],
    },
    'scheduledAt': <String, Object?>{
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
    'recipientSnapshotHash': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^[a-f0-9]{64}\$',
      'description': 'Exact audience-state hash stored by preview and required unchanged at approval; retained as the frozen recipient snapshot hash after approval.',
    },
    'contentHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'audienceCounts': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'total',
        'reachable',
        'optedOut',
        'invalid',
        'duplicate',
        'unsupported',
        'frequencyCapped',
        'providerBlocked',
        'unknown',
      ],
      'properties': <String, Object?>{
        'total': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'reachable': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'optedOut': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'invalid': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'duplicate': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'unsupported': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'frequencyCapped': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'providerBlocked': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'unknown': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
      },
    },
    'deliveryCounts': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'pending',
        'suppressed',
        'accepted',
        'sent',
        'delivered',
        'read',
        'failed',
        'replied',
        'optedOut',
      ],
      'properties': <String, Object?>{
        'pending': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'suppressed': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'accepted': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'sent': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'delivered': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'read': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'failed': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'replied': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'optedOut': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
      },
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'leaseOwner': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'leaseExpiresAt': <String, Object?>{
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
    'approvedAt': <String, Object?>{
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
    'dispatchedAt': <String, Object?>{
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
    'completedAt': <String, Object?>{
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
    'cancelledAt': <String, Object?>{
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
  'definitions': <String, Object?>{
    'count': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1000000,
    },
    'audienceCounts': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'total',
        'reachable',
        'optedOut',
        'invalid',
        'duplicate',
        'unsupported',
        'frequencyCapped',
        'providerBlocked',
        'unknown',
      ],
      'properties': <String, Object?>{
        'total': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'reachable': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'optedOut': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'invalid': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'duplicate': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'unsupported': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'frequencyCapped': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'providerBlocked': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'unknown': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
      },
    },
    'deliveryCounts': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'pending',
        'suppressed',
        'accepted',
        'sent',
        'delivered',
        'read',
        'failed',
        'replied',
        'optedOut',
      ],
      'properties': <String, Object?>{
        'pending': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'suppressed': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'accepted': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'sent': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'delivered': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'read': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'failed': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'replied': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'optedOut': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
      },
    },
  },
};
