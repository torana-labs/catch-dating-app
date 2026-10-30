// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_messaging_webhook_events.schema.json.

const schemaOrganizerMessagingWebhookEventDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_messaging_webhook_events.schema.json',
  'title': 'OrganizerMessagingWebhookEventDocument',
  'description': 'Sanitized durable provider event queued after signature verification. Text and native reply labels follow the existing 30-day queue and 12-month Inbox retention. Native reply identifiers and provider correlation remain in the private queue and never authorize an action by themselves. Optional fields preserve compatibility with previously queued events.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'organizerMessagingWebhookEvents',
  'x-firestore-path': 'organizerMessagingWebhookEvents/{eventId}',
  'x-document-id-field': 'eventId',
  'x-owner': 'WhatsApp webhook ingress and receipt processor',
  'required': <Object?>[
    'provider',
    'providerEventId',
    'organizerId',
    'connectionId',
    'eventKind',
    'providerMessageId',
    'contextProviderMessageId',
    'deliveryStatus',
    'endpointHash',
    'isStop',
    'hasReply',
    'inboundBody',
    'providerErrorCode',
    'providerOccurredAt',
    'processingStatus',
    'attemptCount',
    'createdAt',
    'processedAt',
    'expiresAt',
  ],
  'properties': <String, Object?>{
    'provider': <String, Object?>{
      'const': 'metaCloudApi',
    },
    'providerEventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
    },
    'organizerId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'connectionId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'eventKind': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'status',
        'inbound',
        'template',
        'quality',
        'account',
        'unmatched',
      ],
    },
    'providerMessageId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 240,
    },
    'contextProviderMessageId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 240,
    },
    'providerAccountId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^[0-9]{1,32}\$',
    },
    'providerPhoneNumberId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^[0-9]{1,32}\$',
    },
    'callbackData': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 512,
    },
    'inboundReply': <String, Object?>{
      'oneOf': <Object?>[
        <String, Object?>{
          'type': 'null',
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'payload',
            'label',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'const': 'templateQuickReply',
            },
            'payload': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 1024,
            },
            'label': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 1024,
            },
          },
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'id',
            'label',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'const': 'replyButton',
            },
            'id': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 1024,
            },
            'label': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 1024,
            },
          },
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'id',
            'label',
            'description',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'const': 'listReply',
            },
            'id': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 1024,
            },
            'label': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 1024,
            },
            'description': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'minLength': 1,
              'maxLength': 4096,
            },
          },
        },
      ],
    },
    'deliveryStatus': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'enum': <Object?>[
        null,
        'sent',
        'delivered',
        'read',
        'failed',
      ],
    },
    'endpointHash': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^[a-f0-9]{64}\$',
    },
    'isStop': <String, Object?>{
      'type': 'boolean',
    },
    'hasReply': <String, Object?>{
      'type': 'boolean',
    },
    'inboundBody': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 4096,
    },
    'providerErrorCode': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
      'maximum': 999999999,
    },
    'providerErrorEvidence': <String, Object?>{
      'description': 'Complete bounded error-code evidence from signed ingress. Missing legacy evidence is unknown, never proof of an error-free status. Error text and details are not retained.',
      'oneOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'const': 'none',
            },
          },
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'codes',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'const': 'codes',
            },
            'codes': <String, Object?>{
              'type': 'array',
              'minItems': 1,
              'maxItems': 10,
              'items': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 999999999,
              },
            },
          },
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'const': 'unusable',
            },
          },
        },
      ],
    },
    'providerOccurredAt': <String, Object?>{
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
    'assistanceProcessing': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'description': 'Event Assistance consumer checkpoint, independent from campaign and Inbox processing. Waiting outcomes retry; other outcomes are terminal for this signed event.',
      'required': <Object?>[
        'sourceHash',
        'attemptCount',
        'updatedAt',
        'outcome',
      ],
      'properties': <String, Object?>{
        'sourceHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'attemptCount': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 1000000,
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
        'outcome': <String, Object?>{
          'oneOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'disposition',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'const': 'delivery',
                },
                'disposition': <String, Object?>{
                  'enum': <Object?>[
                    'applied',
                    'duplicateOrOlder',
                    'conflictingEvidence',
                    'unconfirmed',
                  ],
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'disposition',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'const': 'reply',
                },
                'disposition': <String, Object?>{
                  'enum': <Object?>[
                    'accepted',
                    'replayed',
                  ],
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'reason',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'const': 'waiting',
                },
                'reason': <String, Object?>{
                  'const': 'deliveryUnconfirmed',
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'const': 'ignored',
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'reason',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'const': 'rejected',
                },
                'reason': <String, Object?>{
                  'enum': <Object?>[
                    'unavailable',
                    'deliveryScope',
                    'scopeMismatch',
                    'staleIntent',
                    'invalidChoice',
                    'expired',
                    'alreadyResponded',
                    'noLongerNeeded',
                    'factsStale',
                    'guestStateChanged',
                  ],
                },
              },
            },
          ],
        },
      },
    },
    'processingStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'pending',
        'processed',
        'unmatched',
        'failed',
      ],
    },
    'attemptCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 100,
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
    'processedAt': <String, Object?>{
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
      'x-firestore-ttl': true,
    },
  },
};
