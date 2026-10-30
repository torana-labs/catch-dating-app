// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_assistance_operational_notice_publications.schema.json.

const schemaEventAssistanceOperationalNoticePublicationDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/event_assistance_operational_notice_publications.schema.json',
  'title': 'EventAssistanceOperationalNoticePublicationDocument',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'publicationId',
    'quotaId',
    'context',
    'eventId',
    'attendeeId',
    'episodeId',
    'sourceKind',
    'workflowKind',
    'sourceId',
    'sourceRevision',
    'messageId',
    'threadId',
    'ordinal',
    'contentHash',
    'intentHash',
    'sourceOccurredAt',
    'createdAt',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'type': 'integer',
      'const': 1,
    },
    'publicationId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'quotaId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'context': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
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
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'mode',
            'rehearsalId',
            'virtualEventId',
            'clockId',
          ],
          'properties': <String, Object?>{
            'mode': <String, Object?>{
              'type': 'string',
              'const': 'rehearsal',
            },
            'rehearsalId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 2000,
            },
            'virtualEventId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'clockId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 2000,
            },
          },
        },
      ],
    },
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'attendeeId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'episodeId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'sourceKind': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'planChange',
        'followUp',
      ],
    },
    'workflowKind': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'planChangeCommunication',
        'postEventFollowUp',
      ],
    },
    'sourceId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'sourceRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'messageId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'threadId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'ordinal': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 10080,
    },
    'contentHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'intentHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'sourceOccurredAt': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'createdAt': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
  },
  'x-firestore-collection': 'eventAssistanceOperationalNoticePublications',
  'x-firestore-path': 'eventAssistanceOperationalNoticePublications/{publicationId}',
  'x-document-id-field': 'publicationId',
  'x-owner': 'trusted event-assistance operational notice publisher',
};
