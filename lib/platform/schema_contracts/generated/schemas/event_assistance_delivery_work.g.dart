// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from operations/event_assistance_delivery_work.schema.json.

const schemaEventAssistanceDeliveryWorkSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/operations/event_assistance_delivery_work.schema.json',
  'title': 'EventAssistanceDeliveryWork',
  'description': 'Private resumable delivery coordination for one published automatic message. The outbox owns provider attempts; a checkpoint never grants dispatch authority.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'kind',
    'messageId',
    'intentHash',
    'threadId',
    'scope',
    'createdAt',
    'expiresAt',
    'checkpoint',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'type': 'integer',
      'const': 1,
    },
    'kind': <String, Object?>{
      'type': 'string',
      'const': 'liveMessageDelivery',
    },
    'messageId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'intentHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'threadId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'scope': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'context',
        'attendeeId',
        'episodeId',
      ],
      'properties': <String, Object?>{
        'context': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'mode',
            'eventId',
            'organizerId',
          ],
          'properties': <String, Object?>{
            'mode': <String, Object?>{
              'type': 'string',
              'const': 'live',
            },
            'eventId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'organizerId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 2000,
            },
          },
        },
        'attendeeId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'episodeId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
      },
    },
    'createdAt': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'expiresAt': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'checkpoint': <String, Object?>{
      'oneOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'phase',
            'reason',
            'dueAt',
            'messageRevision',
            'messageHash',
            'failures',
            'evaluations',
          ],
          'properties': <String, Object?>{
            'phase': <String, Object?>{
              'type': 'string',
              'const': 'queued',
            },
            'reason': <String, Object?>{
              'type': 'null',
            },
            'dueAt': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'messageRevision': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'messageHash': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
            'failures': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 5,
              'const': 0,
            },
            'evaluations': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 100,
              'const': 0,
            },
          },
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'phase',
            'reason',
            'dueAt',
            'messageRevision',
            'messageHash',
            'failures',
            'evaluations',
          ],
          'properties': <String, Object?>{
            'phase': <String, Object?>{
              'type': 'string',
              'const': 'complete',
            },
            'reason': <String, Object?>{
              'enum': <Object?>[
                'delivered',
                'responded',
                'cancelled',
                'superseded',
                'expired',
                'eventClosed',
                'permissionRevoked',
                'guestPresent',
                'guestDeclined',
                'notAdmitted',
                'hostStopped',
                'participationInactive',
              ],
            },
            'dueAt': <String, Object?>{
              'type': 'null',
            },
            'messageRevision': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'messageHash': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
            'failures': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 5,
            },
            'evaluations': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 100,
            },
          },
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'phase',
            'reason',
            'dueAt',
            'messageRevision',
            'messageHash',
            'failures',
            'evaluations',
          ],
          'properties': <String, Object?>{
            'phase': <String, Object?>{
              'type': 'string',
              'const': 'receipt',
            },
            'reason': <String, Object?>{
              'const': 'providerPending',
            },
            'dueAt': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'messageRevision': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'messageHash': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
            'failures': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 5,
            },
            'evaluations': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 100,
            },
          },
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'phase',
            'reason',
            'dueAt',
            'messageRevision',
            'messageHash',
            'failures',
            'evaluations',
          ],
          'properties': <String, Object?>{
            'phase': <String, Object?>{
              'type': 'string',
              'const': 'retry',
            },
            'reason': <String, Object?>{
              'enum': <Object?>[
                'retryBackoff',
                'eventFactsStale',
                'routeFactsStale',
                'workerUnavailable',
              ],
            },
            'dueAt': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'messageRevision': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'messageHash': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
            'failures': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 5,
            },
            'evaluations': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 100,
            },
          },
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'phase',
            'reason',
            'dueAt',
            'messageRevision',
            'messageHash',
            'failures',
            'evaluations',
          ],
          'properties': <String, Object?>{
            'phase': <String, Object?>{
              'type': 'string',
              'const': 'review',
            },
            'reason': <String, Object?>{
              'enum': <Object?>[
                'noEligibleRoute',
                'attemptLimit',
                'policyRejected',
                'recipientNeedsReview',
                'providerOwnsFallback',
                'conflictingDeliveryEvidence',
                'providerPending',
                'workerUnavailable',
                'recoveryLimit',
                'eventFactsStale',
                'routeFactsStale',
              ],
            },
            'dueAt': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'messageRevision': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'messageHash': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
            'failures': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 5,
            },
            'evaluations': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 100,
            },
          },
        },
      ],
    },
  },
};
