// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/organizer_campaign_response.schema.json.

const schemaOrganizerCampaignCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/organizer_campaign_response.schema.json',
  'title': 'OrganizerCampaignCallableResponse',
  'description': 'Sanitized campaign state and aggregate eligibility/delivery counts.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'campaignId',
    'savedAudienceId',
    'status',
    'revision',
    'audienceCounts',
    'deliveryCounts',
    'senderStatus',
    'templateStatus',
    'canApprove',
    'canDispatch',
    'blockers',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'campaignId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'savedAudienceId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
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
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
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
    'senderStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'pending',
        'testing',
        'active',
        'degraded',
        'blocked',
        'tokenRevoked',
        'disconnected',
        'notConnected',
      ],
    },
    'templateStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'APPROVED',
        'PENDING',
        'REJECTED',
        'PAUSED',
        'DISABLED',
        'DELETED',
        'UNKNOWN',
        'missing',
      ],
    },
    'canApprove': <String, Object?>{
      'type': 'boolean',
    },
    'canDispatch': <String, Object?>{
      'type': 'boolean',
    },
    'blockers': <String, Object?>{
      'type': 'array',
      'maxItems': 20,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'enum': <Object?>[
          'providerSetupRequired',
          'senderInactive',
          'templateMissing',
          'templateUnapproved',
          'savedAudienceMissing',
          'savedAudienceChanged',
          'noReachableRecipients',
          'audienceCoveragePartial',
          'audienceTooLarge',
          'eventMissing',
          'eventUnavailable',
          'scheduleInPast',
          'campaignImmutable',
          'campaignCancelled',
          'campaignComplete',
          'campaignLeaseActive',
        ],
      },
    },
  },
};
