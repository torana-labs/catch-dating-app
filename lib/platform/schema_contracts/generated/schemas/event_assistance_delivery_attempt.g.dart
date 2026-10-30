// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from operations/event_assistance_delivery_attempt.schema.json.

const schemaEventAssistanceDeliveryAttemptSchema = <String, Object?>{
  'oneOf': <Object?>[
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'schemaVersion',
        'attemptId',
        'intentId',
        'intentRevision',
        'ordinal',
        'createdAt',
        'state',
        'mode',
        'context',
        'binding',
        'authorization',
      ],
      'properties': <String, Object?>{
        'schemaVersion': <String, Object?>{
          'const': 1,
          'type': 'integer',
        },
        'attemptId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
        },
        'intentId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
        },
        'intentRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 1000000,
        },
        'ordinal': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 6,
        },
        'createdAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'state': <String, Object?>{
          'oneOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'at',
                'reconcileAfter',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'const': 'reserved',
                  'type': 'string',
                },
                'at': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'reconcileAfter': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'at',
                'providerMessageId',
                'reason',
                'reconcileAfter',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'const': 'unknown',
                  'type': 'string',
                },
                'at': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'providerMessageId': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 512,
                    },
                    <String, Object?>{
                      'type': 'null',
                    },
                  ],
                },
                'reason': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'timeout',
                    'connectionLost',
                    'workerInterrupted',
                  ],
                },
                'reconcileAfter': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'at',
                'providerMessageId',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'const': 'accepted',
                  'type': 'string',
                },
                'at': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'providerMessageId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 512,
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'at',
                'providerMessageId',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'const': 'delivered',
                  'type': 'string',
                },
                'at': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'providerMessageId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 512,
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'at',
                'providerMessageId',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'const': 'read',
                  'type': 'string',
                },
                'at': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'providerMessageId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 512,
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'at',
                'providerMessageId',
                'classification',
                'evidenceId',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'const': 'failed',
                  'type': 'string',
                },
                'at': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'providerMessageId': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 512,
                    },
                    <String, Object?>{
                      'type': 'null',
                    },
                  ],
                },
                'classification': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'technical',
                    'invalidRecipient',
                    'policy',
                    'suppressed',
                  ],
                },
                'evidenceId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'at',
                'providerMessageId',
                'evidenceId',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'const': 'revoked',
                  'type': 'string',
                },
                'at': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'providerMessageId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 512,
                },
                'evidenceId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'at',
                'reason',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'const': 'notDispatched',
                  'type': 'string',
                },
                'at': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'reason': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'superseded',
                    'eventClosed',
                    'responded',
                    'expired',
                    'permissionRevoked',
                    'hostStopped',
                    'reservationExpired',
                    'permitExpired',
                  ],
                },
              },
              'description': 'No provider request was made. Reservation or permit expiry permits a fresh bounded attempt; the other reasons stop this message.',
            },
          ],
        },
        'mode': <String, Object?>{
          'const': 'live',
          'type': 'string',
        },
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
        'binding': <String, Object?>{
          'oneOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'routeId',
                'transport',
                'senderIdentity',
                'provider',
                'senderId',
                'bindingRevision',
                'recipientEndpointId',
                'fallbackOwner',
              ],
              'properties': <String, Object?>{
                'routeId': <String, Object?>{
                  'const': 'catchEventSms',
                  'type': 'string',
                },
                'transport': <String, Object?>{
                  'const': 'sms',
                  'type': 'string',
                },
                'senderIdentity': <String, Object?>{
                  'const': 'catchPlatform',
                  'type': 'string',
                },
                'provider': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'sinch',
                    'gupshup',
                  ],
                },
                'senderId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                },
                'bindingRevision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                  'maximum': 9007199254740991,
                },
                'recipientEndpointId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                },
                'fallbackOwner': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'catch',
                    'provider',
                  ],
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'routeId',
                'transport',
                'senderIdentity',
                'provider',
                'senderId',
                'bindingRevision',
                'recipientEndpointId',
                'fallbackOwner',
              ],
              'properties': <String, Object?>{
                'routeId': <String, Object?>{
                  'const': 'catchEventRcs',
                  'type': 'string',
                },
                'transport': <String, Object?>{
                  'const': 'rcs',
                  'type': 'string',
                },
                'senderIdentity': <String, Object?>{
                  'const': 'catchPlatform',
                  'type': 'string',
                },
                'provider': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'sinch',
                    'gupshup',
                    'googleRbm',
                  ],
                },
                'senderId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                },
                'bindingRevision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                  'maximum': 9007199254740991,
                },
                'recipientEndpointId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                },
                'fallbackOwner': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'catch',
                    'provider',
                  ],
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'routeId',
                'transport',
                'senderIdentity',
                'provider',
                'senderId',
                'bindingRevision',
                'recipientEndpointId',
                'fallbackOwner',
              ],
              'properties': <String, Object?>{
                'routeId': <String, Object?>{
                  'const': 'organizerEventWhatsapp',
                  'type': 'string',
                },
                'transport': <String, Object?>{
                  'const': 'whatsapp',
                  'type': 'string',
                },
                'senderIdentity': <String, Object?>{
                  'const': 'organizerManaged',
                  'type': 'string',
                },
                'provider': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'meta',
                  ],
                },
                'senderId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                },
                'bindingRevision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                  'maximum': 9007199254740991,
                },
                'recipientEndpointId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                },
                'fallbackOwner': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'catch',
                    'provider',
                  ],
                },
              },
            },
          ],
        },
        'authorization': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'permissionRevision',
            'checkedAt',
            'validUntil',
            'instructionRevision',
          ],
          'properties': <String, Object?>{
            'permissionRevision': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 512,
            },
            'checkedAt': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'validUntil': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'instructionRevision': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
          },
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'schemaVersion',
        'attemptId',
        'intentId',
        'intentRevision',
        'ordinal',
        'createdAt',
        'state',
        'mode',
        'context',
        'routeId',
        'authorization',
      ],
      'properties': <String, Object?>{
        'schemaVersion': <String, Object?>{
          'const': 1,
          'type': 'integer',
        },
        'attemptId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
        },
        'intentId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
        },
        'intentRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 1000000,
        },
        'ordinal': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 6,
        },
        'createdAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'state': <String, Object?>{
          'oneOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'at',
                'reconcileAfter',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'const': 'reserved',
                  'type': 'string',
                },
                'at': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'reconcileAfter': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'at',
                'providerMessageId',
                'reason',
                'reconcileAfter',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'const': 'unknown',
                  'type': 'string',
                },
                'at': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'providerMessageId': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 512,
                    },
                    <String, Object?>{
                      'type': 'null',
                    },
                  ],
                },
                'reason': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'timeout',
                    'connectionLost',
                    'workerInterrupted',
                  ],
                },
                'reconcileAfter': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'at',
                'providerMessageId',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'const': 'accepted',
                  'type': 'string',
                },
                'at': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'providerMessageId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 512,
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'at',
                'providerMessageId',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'const': 'delivered',
                  'type': 'string',
                },
                'at': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'providerMessageId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 512,
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'at',
                'providerMessageId',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'const': 'read',
                  'type': 'string',
                },
                'at': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'providerMessageId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 512,
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'at',
                'providerMessageId',
                'classification',
                'evidenceId',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'const': 'failed',
                  'type': 'string',
                },
                'at': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'providerMessageId': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 512,
                    },
                    <String, Object?>{
                      'type': 'null',
                    },
                  ],
                },
                'classification': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'technical',
                    'invalidRecipient',
                    'policy',
                    'suppressed',
                  ],
                },
                'evidenceId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'at',
                'providerMessageId',
                'evidenceId',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'const': 'revoked',
                  'type': 'string',
                },
                'at': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'providerMessageId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 512,
                },
                'evidenceId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'at',
                'reason',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'const': 'notDispatched',
                  'type': 'string',
                },
                'at': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'reason': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'superseded',
                    'eventClosed',
                    'responded',
                    'expired',
                    'permissionRevoked',
                    'hostStopped',
                    'reservationExpired',
                    'permitExpired',
                  ],
                },
              },
              'description': 'No provider request was made. Reservation or permit expiry permits a fresh bounded attempt; the other reasons stop this message.',
            },
          ],
        },
        'mode': <String, Object?>{
          'const': 'rehearsal',
          'type': 'string',
        },
        'context': <String, Object?>{
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
        'routeId': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'catchEventSms',
            'catchEventRcs',
            'organizerEventWhatsapp',
          ],
        },
        'authorization': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'permissionRevision',
            'checkedAt',
            'validUntil',
            'instructionRevision',
          ],
          'properties': <String, Object?>{
            'permissionRevision': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 512,
            },
            'checkedAt': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'validUntil': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'instructionRevision': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
          },
        },
      },
    },
  ],
  'title': 'EventAssistanceDeliveryAttempt',
};
