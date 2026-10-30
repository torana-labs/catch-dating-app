// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_assistance_rcs_callbacks.schema.json.

const schemaEventAssistanceRcsCallbackDocumentSchema = <String, Object?>{
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'callbackId',
    'evidence',
    'storedAt',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'type': 'integer',
      'const': 1,
    },
    'callbackId': <String, Object?>{
      'type': 'string',
      'pattern': '^rcs-event:[a-f0-9]{64}\$',
    },
    'evidence': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'agentId',
        'endpointHash',
        'providerEventId',
        'eventFamily',
        'providerOccurredAt',
        'receivedAt',
        'receiptKey',
        'payloadHash',
        'observation',
      ],
      'properties': <String, Object?>{
        'agentId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 512,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._@-]*\$',
        },
        'endpointHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'providerEventId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 512,
          'pattern': '^[^\\s\\u0000-\\u001f\\u007f]+\$',
        },
        'eventFamily': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'message',
            'userEvent',
            'serverEvent',
          ],
        },
        'providerOccurredAt': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 40,
          'format': 'date-time',
        },
        'receivedAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'receiptKey': <String, Object?>{
          'type': 'string',
          'pattern': '^rcs-callback:[a-f0-9]{64}\$',
        },
        'payloadHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'observation': <String, Object?>{
          'oneOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'providerMessageId',
                'status',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'type': 'string',
                  'const': 'delivery',
                },
                'providerMessageId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 512,
                  'pattern': '^[^\\s\\u0000-\\u001f\\u007f]+\$',
                },
                'status': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'delivered',
                    'read',
                  ],
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'providerMessageId',
                'revocation',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'type': 'string',
                  'const': 'expiration',
                },
                'providerMessageId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 512,
                  'pattern': '^[^\\s\\u0000-\\u001f\\u007f]+\$',
                },
                'revocation': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'confirmed',
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
                'source',
                'suggestionType',
                'correlation',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'type': 'string',
                  'const': 'suggestion',
                },
                'source': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'message',
                    'event',
                  ],
                },
                'suggestionType': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'reply',
                    'action',
                    'unspecified',
                  ],
                },
                'correlation': <String, Object?>{
                  'oneOf': <Object?>[
                    <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'kind',
                        'attemptId',
                        'choiceIndex',
                      ],
                      'properties': <String, Object?>{
                        'kind': <String, Object?>{
                          'type': 'string',
                          'const': 'choice',
                        },
                        'attemptId': <String, Object?>{
                          'type': 'string',
                          'pattern': '^attempt:[a-f0-9]{64}\$',
                        },
                        'choiceIndex': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 9,
                        },
                      },
                    },
                    <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'kind',
                        'attemptId',
                      ],
                      'properties': <String, Object?>{
                        'kind': <String, Object?>{
                          'type': 'string',
                          'const': 'guestPage',
                        },
                        'attemptId': <String, Object?>{
                          'type': 'string',
                          'pattern': '^attempt:[a-f0-9]{64}\$',
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
                          'type': 'string',
                          'const': 'unrecognized',
                        },
                      },
                    },
                  ],
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'requested',
                'source',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'type': 'string',
                  'const': 'subscription',
                },
                'requested': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'subscribe',
                    'unsubscribe',
                  ],
                },
                'source': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'event',
                    'keyword',
                  ],
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'content',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'type': 'string',
                  'const': 'unstructuredMessage',
                },
                'content': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'text',
                    'location',
                    'file',
                  ],
                },
              },
            },
          ],
        },
      },
    },
    'storedAt': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
  },
  'title': 'EventAssistanceRcsCallbackDocument',
  'x-firestore-collection': 'eventAssistanceRcsCallbacks',
  'x-firestore-path': 'eventAssistanceRcsCallbacks/{callbackId}',
  'x-document-id-field': 'callbackId',
  'x-owner': 'event-assistance authenticated RCS ingress',
};
