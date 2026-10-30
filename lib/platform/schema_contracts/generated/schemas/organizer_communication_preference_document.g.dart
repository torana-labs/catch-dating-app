// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_communication_preferences.schema.json.

const schemaOrganizerCommunicationPreferenceDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_communication_preferences.schema.json',
  'title': 'OrganizerCommunicationPreferenceDocument',
  'description': 'Server-owned, organizer-scoped channel consent stored at organizerCommunicationPreferences/{organizerId_uid}.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'organizerCommunicationPreferences',
  'x-firestore-path': 'organizerCommunicationPreferences/{organizerId_uid}',
  'x-document-id-field': 'id',
  'x-owner': 'public registration and future self-service preference callables',
  'required': <Object?>[
    'organizerId',
    'uid',
    'whatsapp',
    'sms',
    'createdAt',
    'updatedAt',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'uid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'whatsapp': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'status',
        'evidenceStatus',
        'currentReceiptId',
        'termsVersion',
        'source',
        'sourceEventId',
        'updatedAt',
      ],
      'properties': <String, Object?>{
        'status': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'unknown',
            'optedIn',
            'optedOut',
          ],
          'x-catch-ownership': 'server-only',
        },
        'evidenceStatus': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'notApplicable',
            'complete',
            'incomplete',
          ],
          'description': 'Only complete evidence may make an opted-in channel eligible for managed delivery.',
          'x-catch-ownership': 'server-only',
        },
        'currentReceiptId': <String, Object?>{
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
          'x-catch-ownership': 'server-only',
        },
        'endpointE164': <String, Object?>{
          'type': 'string',
          'pattern': '^\\+[1-9][0-9]{6,14}\$',
        },
        'sourceResponseId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'termsVersion': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'minLength': 1,
          'maxLength': 80,
          'x-catch-ownership': 'server-only',
        },
        'source': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'enum': <Object?>[
            null,
            'publicEventRegistration',
            'hostFormResponse',
            'participantSettings',
            'unsubscribeLink',
            'inboundStop',
            'providerWebhook',
            'legacyIncomplete',
          ],
          'x-catch-ownership': 'server-only',
        },
        'sourceEventId': <String, Object?>{
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
          'x-catch-ownership': 'server-only',
        },
        'updatedAt': <String, Object?>{
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
      },
    },
    'whatsappPurposes': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'properties': <String, Object?>{
        'eventOperations': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'status',
            'evidenceStatus',
            'currentReceiptId',
            'termsVersion',
            'source',
            'sourceEventId',
            'updatedAt',
          ],
          'properties': <String, Object?>{
            'status': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'unknown',
                'optedIn',
                'optedOut',
              ],
              'x-catch-ownership': 'server-only',
            },
            'evidenceStatus': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'notApplicable',
                'complete',
                'incomplete',
              ],
              'description': 'Only complete evidence may make an opted-in channel eligible for managed delivery.',
              'x-catch-ownership': 'server-only',
            },
            'currentReceiptId': <String, Object?>{
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
              'x-catch-ownership': 'server-only',
            },
            'endpointE164': <String, Object?>{
              'type': 'string',
              'pattern': '^\\+[1-9][0-9]{6,14}\$',
            },
            'sourceResponseId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'termsVersion': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'minLength': 1,
              'maxLength': 80,
              'x-catch-ownership': 'server-only',
            },
            'source': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'enum': <Object?>[
                null,
                'publicEventRegistration',
                'hostFormResponse',
                'participantSettings',
                'unsubscribeLink',
                'inboundStop',
                'providerWebhook',
                'legacyIncomplete',
              ],
              'x-catch-ownership': 'server-only',
            },
            'sourceEventId': <String, Object?>{
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
              'x-catch-ownership': 'server-only',
            },
            'updatedAt': <String, Object?>{
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
          },
        },
        'marketing': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'status',
            'evidenceStatus',
            'currentReceiptId',
            'termsVersion',
            'source',
            'sourceEventId',
            'updatedAt',
          ],
          'properties': <String, Object?>{
            'status': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'unknown',
                'optedIn',
                'optedOut',
              ],
              'x-catch-ownership': 'server-only',
            },
            'evidenceStatus': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'notApplicable',
                'complete',
                'incomplete',
              ],
              'description': 'Only complete evidence may make an opted-in channel eligible for managed delivery.',
              'x-catch-ownership': 'server-only',
            },
            'currentReceiptId': <String, Object?>{
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
              'x-catch-ownership': 'server-only',
            },
            'endpointE164': <String, Object?>{
              'type': 'string',
              'pattern': '^\\+[1-9][0-9]{6,14}\$',
            },
            'sourceResponseId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'termsVersion': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'minLength': 1,
              'maxLength': 80,
              'x-catch-ownership': 'server-only',
            },
            'source': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'enum': <Object?>[
                null,
                'publicEventRegistration',
                'hostFormResponse',
                'participantSettings',
                'unsubscribeLink',
                'inboundStop',
                'providerWebhook',
                'legacyIncomplete',
              ],
              'x-catch-ownership': 'server-only',
            },
            'sourceEventId': <String, Object?>{
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
              'x-catch-ownership': 'server-only',
            },
            'updatedAt': <String, Object?>{
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
          },
        },
      },
    },
    'sms': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'status',
        'evidenceStatus',
        'currentReceiptId',
        'termsVersion',
        'source',
        'sourceEventId',
        'updatedAt',
      ],
      'properties': <String, Object?>{
        'status': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'unknown',
            'optedIn',
            'optedOut',
          ],
          'x-catch-ownership': 'server-only',
        },
        'evidenceStatus': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'notApplicable',
            'complete',
            'incomplete',
          ],
          'description': 'Only complete evidence may make an opted-in channel eligible for managed delivery.',
          'x-catch-ownership': 'server-only',
        },
        'currentReceiptId': <String, Object?>{
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
          'x-catch-ownership': 'server-only',
        },
        'endpointE164': <String, Object?>{
          'type': 'string',
          'pattern': '^\\+[1-9][0-9]{6,14}\$',
        },
        'sourceResponseId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'termsVersion': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'minLength': 1,
          'maxLength': 80,
          'x-catch-ownership': 'server-only',
        },
        'source': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'enum': <Object?>[
            null,
            'publicEventRegistration',
            'hostFormResponse',
            'participantSettings',
            'unsubscribeLink',
            'inboundStop',
            'providerWebhook',
            'legacyIncomplete',
          ],
          'x-catch-ownership': 'server-only',
        },
        'sourceEventId': <String, Object?>{
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
          'x-catch-ownership': 'server-only',
        },
        'updatedAt': <String, Object?>{
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
  },
  'definitions': <String, Object?>{
    'whatsappPurposes': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'properties': <String, Object?>{
        'eventOperations': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'status',
            'evidenceStatus',
            'currentReceiptId',
            'termsVersion',
            'source',
            'sourceEventId',
            'updatedAt',
          ],
          'properties': <String, Object?>{
            'status': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'unknown',
                'optedIn',
                'optedOut',
              ],
              'x-catch-ownership': 'server-only',
            },
            'evidenceStatus': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'notApplicable',
                'complete',
                'incomplete',
              ],
              'description': 'Only complete evidence may make an opted-in channel eligible for managed delivery.',
              'x-catch-ownership': 'server-only',
            },
            'currentReceiptId': <String, Object?>{
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
              'x-catch-ownership': 'server-only',
            },
            'endpointE164': <String, Object?>{
              'type': 'string',
              'pattern': '^\\+[1-9][0-9]{6,14}\$',
            },
            'sourceResponseId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'termsVersion': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'minLength': 1,
              'maxLength': 80,
              'x-catch-ownership': 'server-only',
            },
            'source': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'enum': <Object?>[
                null,
                'publicEventRegistration',
                'hostFormResponse',
                'participantSettings',
                'unsubscribeLink',
                'inboundStop',
                'providerWebhook',
                'legacyIncomplete',
              ],
              'x-catch-ownership': 'server-only',
            },
            'sourceEventId': <String, Object?>{
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
              'x-catch-ownership': 'server-only',
            },
            'updatedAt': <String, Object?>{
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
          },
        },
        'marketing': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'status',
            'evidenceStatus',
            'currentReceiptId',
            'termsVersion',
            'source',
            'sourceEventId',
            'updatedAt',
          ],
          'properties': <String, Object?>{
            'status': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'unknown',
                'optedIn',
                'optedOut',
              ],
              'x-catch-ownership': 'server-only',
            },
            'evidenceStatus': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'notApplicable',
                'complete',
                'incomplete',
              ],
              'description': 'Only complete evidence may make an opted-in channel eligible for managed delivery.',
              'x-catch-ownership': 'server-only',
            },
            'currentReceiptId': <String, Object?>{
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
              'x-catch-ownership': 'server-only',
            },
            'endpointE164': <String, Object?>{
              'type': 'string',
              'pattern': '^\\+[1-9][0-9]{6,14}\$',
            },
            'sourceResponseId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'termsVersion': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'minLength': 1,
              'maxLength': 80,
              'x-catch-ownership': 'server-only',
            },
            'source': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'enum': <Object?>[
                null,
                'publicEventRegistration',
                'hostFormResponse',
                'participantSettings',
                'unsubscribeLink',
                'inboundStop',
                'providerWebhook',
                'legacyIncomplete',
              ],
              'x-catch-ownership': 'server-only',
            },
            'sourceEventId': <String, Object?>{
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
              'x-catch-ownership': 'server-only',
            },
            'updatedAt': <String, Object?>{
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
          },
        },
      },
    },
    'channelPreference': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'status',
        'evidenceStatus',
        'currentReceiptId',
        'termsVersion',
        'source',
        'sourceEventId',
        'updatedAt',
      ],
      'properties': <String, Object?>{
        'status': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'unknown',
            'optedIn',
            'optedOut',
          ],
          'x-catch-ownership': 'server-only',
        },
        'evidenceStatus': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'notApplicable',
            'complete',
            'incomplete',
          ],
          'description': 'Only complete evidence may make an opted-in channel eligible for managed delivery.',
          'x-catch-ownership': 'server-only',
        },
        'currentReceiptId': <String, Object?>{
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
          'x-catch-ownership': 'server-only',
        },
        'endpointE164': <String, Object?>{
          'type': 'string',
          'pattern': '^\\+[1-9][0-9]{6,14}\$',
        },
        'sourceResponseId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'termsVersion': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'minLength': 1,
          'maxLength': 80,
          'x-catch-ownership': 'server-only',
        },
        'source': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'enum': <Object?>[
            null,
            'publicEventRegistration',
            'hostFormResponse',
            'participantSettings',
            'unsubscribeLink',
            'inboundStop',
            'providerWebhook',
            'legacyIncomplete',
          ],
          'x-catch-ownership': 'server-only',
        },
        'sourceEventId': <String, Object?>{
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
          'x-catch-ownership': 'server-only',
        },
        'updatedAt': <String, Object?>{
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
      },
    },
  },
};
