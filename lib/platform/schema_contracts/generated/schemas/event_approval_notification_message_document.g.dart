// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_approval_notification_messages.schema.json.

const schemaEventApprovalNotificationMessageDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/event_approval_notification_messages.schema.json',
  'title': 'EventApprovalNotificationMessageDocument',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'messageId',
    'revision',
    'intent',
    'lifecycle',
    'attempts',
    'deliveryConflict',
    'createdAt',
    'updatedAt',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'type': 'integer',
      'const': 1,
      'x-catch-ownership': 'server-only',
    },
    'messageId': <String, Object?>{
      'type': 'string',
      'pattern': '^outbox:[a-f0-9]{64}\$',
      'x-catch-ownership': 'server-only',
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
      'x-catch-ownership': 'server-only',
    },
    'intent': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'schemaVersion',
        'intentId',
        'revision',
        'context',
        'createdAt',
        'expiresAt',
        'lane',
        'permittedRoutes',
        'deliveryPolicy',
      ],
      'properties': <String, Object?>{
        'schemaVersion': <String, Object?>{
          'type': 'integer',
          'const': 1,
        },
        'intentId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'const': 1,
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
        'lane': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'phone',
            'email',
          ],
        },
        'permittedRoutes': <String, Object?>{
          'type': 'array',
          'minItems': 1,
          'maxItems': 2,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'approvalWhatsapp',
              'approvalSms',
              'approvalEmail',
            ],
          },
        },
        'deliveryPolicy': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'maxAttempts',
            'maxAttemptsPerRoute',
            'minimumRetrySeconds',
          ],
          'properties': <String, Object?>{
            'maxAttempts': <String, Object?>{
              'type': 'integer',
              'const': 3,
            },
            'maxAttemptsPerRoute': <String, Object?>{
              'type': 'integer',
              'const': 1,
            },
            'minimumRetrySeconds': <String, Object?>{
              'type': 'integer',
              'const': 60,
            },
          },
        },
      },
      'x-catch-ownership': 'server-only',
    },
    'lifecycle': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'active',
        'cancelled',
        'superseded',
        'responded',
      ],
      'x-catch-ownership': 'server-only',
    },
    'attempts': <String, Object?>{
      'type': 'array',
      'maxItems': 6,
      'items': <String, Object?>{
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
      },
      'x-catch-ownership': 'server-only',
    },
    'deliveryConflict': <String, Object?>{
      'type': 'boolean',
      'x-catch-ownership': 'server-only',
    },
    'createdAt': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
      'x-catch-ownership': 'server-only',
    },
    'updatedAt': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
      'x-catch-ownership': 'server-only',
    },
  },
  'x-firestore-collection': 'eventApprovalNotificationMessages',
  'x-firestore-path': 'eventApprovalNotificationMessages/{id}',
  'x-owner': 'trusted event approval notification services',
};
