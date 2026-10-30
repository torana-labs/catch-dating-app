// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from operations/event_approval_notification_attempt.schema.json.

const schemaEventApprovalNotificationAttemptSchema = <String, Object?>{
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
    'authorization',
    'mode',
    'context',
    'binding',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'type': 'integer',
      'const': 1,
    },
    'attemptId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'intentId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'intentRevision': <String, Object?>{
      'type': 'integer',
      'const': 1,
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
              'type': 'string',
              'enum': <Object?>[
                'accepted',
                'delivered',
                'read',
              ],
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
                'policy',
                'suppressed',
                'invalidRecipient',
              ],
            },
            'evidenceId': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 2000,
                },
                <String, Object?>{
                  'type': 'null',
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
            'evidenceId': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 2000,
                },
                <String, Object?>{
                  'type': 'null',
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
                'expired',
                'permissionRevoked',
                'reservationExpired',
                'permitExpired',
                'campaignEnded',
                'recipientWithdrawn',
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
    'mode': <String, Object?>{
      'type': 'string',
      'const': 'live',
    },
    'context': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'mode',
        'applicationId',
        'organizerId',
        'eventId',
        'uid',
        'sourceResponseId',
        'approvedAtMillis',
        'approvalRevision',
      ],
      'properties': <String, Object?>{
        'mode': <String, Object?>{
          'type': 'string',
          'const': 'live',
        },
        'applicationId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'organizerId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'eventId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'uid': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'sourceResponseId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'approvedAtMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'approvalRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
      },
    },
    'binding': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'routeId',
        'senderId',
        'bindingRevision',
        'recipientEndpointId',
        'fallbackOwner',
      ],
      'properties': <String, Object?>{
        'routeId': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'approvalWhatsapp',
            'approvalSms',
            'approvalEmail',
          ],
        },
        'senderId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'bindingRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'recipientEndpointId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'fallbackOwner': <String, Object?>{
          'type': 'string',
          'const': 'catch',
        },
      },
    },
  },
  'title': 'EventApprovalNotificationAttempt',
};
