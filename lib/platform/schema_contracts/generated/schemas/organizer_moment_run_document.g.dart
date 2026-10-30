// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_moment_runs.schema.json.

const schemaOrganizerMomentRunDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_moment_runs.schema.json',
  'title': 'OrganizerMomentRunDocument',
  'description': 'Server-owned planned/fired run for a moment. Time-based runId encodes moment + anchor revision + nominal due time; mutable travel wake and deferrals are separate. Triggered/manual identities retain subject/requestKey.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'organizerMomentRuns',
  'x-firestore-path': 'organizerMomentRuns/{runId}',
  'x-document-id-field': 'runId',
  'x-owner': 'moment runner',
  'required': <Object?>[
    'runId',
    'momentId',
    'dueAtMillis',
    'anchorRevision',
    'status',
  ],
  'if': <String, Object?>{
    'properties': <String, Object?>{
      'runId': <String, Object?>{
        'pattern': '^travel_v1_[a-f0-9]{64}\$',
      },
    },
    'required': <Object?>[
      'runId',
    ],
  },
  'then': <String, Object?>{
    'required': <Object?>[
      'travelOccurrence',
      'expiresAtMillis',
    ],
  },
  'properties': <String, Object?>{
    'runId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 300,
    },
    'momentId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'dueAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'nominalDueAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
      'description': 'Scheduled occurrence time (anchor plus offsets), the identity axis behind runId; dueAtMillis is the mutable next-wake time and may differ for deferrals.',
    },
    'expiresAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
      'description': 'Hard stop on firing this run; a deferred run past expiry skips instead of sending late.',
    },
    'occurrenceVersion': <String, Object?>{
      'type': 'integer',
      'enum': <Object?>[
        2,
      ],
    },
    'plannedWakeAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'travelPlanHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'anchorRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'planned',
        'resolving',
        'dispatched',
        'skipped',
        'superseded',
        'failed',
      ],
    },
    'targetFunctionId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 180,
    },
    'subjectId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 300,
      'description': 'Triggered runs: the fact\'s subject (e.g. travel leg id).',
    },
    'reason': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 120,
      'description': 'Skip/failure reason written at run transition.',
    },
    'recipients': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
    },
    'sent': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
    },
    'suppressed': <String, Object?>{
      'type': <Object?>[
        'object',
        'null',
      ],
      'additionalProperties': <String, Object?>{
        'type': 'integer',
        'minimum': 0,
      },
      'description': 'Suppression reason -> recipient count rollup.',
    },
    'suppressedNoEndpoint': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
    },
    'travelOccurrence': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'momentRevision',
        'occurredAtMillis',
        'createdAtMillis',
      ],
      'properties': <String, Object?>{
        'momentRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'occurredAtMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'createdAtMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
      },
      'description': 'Immutable first-ingestion Moment revision, CloudEvent instant and committed recovery-window origin; never renewed by due-time deferral.',
    },
    'automation': <String, Object?>{
      'type': <Object?>[
        'object',
        'null',
      ],
      'additionalProperties': false,
      'required': <Object?>[
        'ruleId',
        'ruleRevision',
        'actionId',
        'eventKind',
        'sourceId',
        'occurredAtMillis',
        'dueAtMillis',
        'contactId',
        'deliveryMessageId',
      ],
      'properties': <String, Object?>{
        'ruleId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
        },
        'ruleRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
        },
        'actionId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
        },
        'eventKind': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'submitted',
            'withdrawn',
            'applicationAccepted',
            'eventAttended',
          ],
        },
        'sourceId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
        },
        'occurredAtMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'dueAtMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
          'description': 'Business-delay horizon computed by the automation engine at handoff; the delivery claim re-derives it from live facts.',
        },
        'contactId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'description': 'Contact identity resolved at handoff; claim re-derives the live identity so merges follow the send.',
        },
        'deliveryMessageId': <String, Object?>{
          'type': 'string',
          'pattern': '^outbox:[a-f0-9]{64}\$',
          'description': 'Durable intent record this run executes; the outbox owns the actual attempt history.',
        },
      },
      'description': 'Occurrence binding for form-automation sends. Present only on runs materialized by the automation handoff; delivery evidence lives in automationDeliveryMessages.',
    },
  },
};
