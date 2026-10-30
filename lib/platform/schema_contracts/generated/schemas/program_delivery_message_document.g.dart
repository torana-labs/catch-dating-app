// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/program_delivery_messages.schema.json.

const schemaProgramDeliveryMessageDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/program_delivery_messages.schema.json',
  'title': 'ProgramDeliveryMessageDocument',
  'description': 'Private durable program delivery outbox. The immutable intent and bounded attempt history survive moment-run completion and delayed provider callbacks. Recipient endpoints are references; transport credentials and guest bearer grants belong to their own private stores.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'programDeliveryMessages',
  'x-firestore-path': 'programDeliveryMessages/{messageId}',
  'x-document-id-field': 'messageId',
  'x-owner': 'trusted program delivery workers',
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
        'programId',
        'recipient',
        'workflow',
        'createdAt',
        'expiresAt',
        'permittedRoutes',
        'deliveryPolicy',
        'kind',
        'title',
        'body',
        'instructionRevision',
      ],
      'properties': <String, Object?>{
        'schemaVersion': <String, Object?>{
          'const': 1,
          'type': 'integer',
        },
        'intentId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 1000000,
        },
        'context': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'mode',
            'programId',
            'organizerId',
          ],
          'properties': <String, Object?>{
            'mode': <String, Object?>{
              'type': 'string',
              'const': 'live',
            },
            'programId': <String, Object?>{
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
        'programId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'recipient': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'recipientKey',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'guest',
                'household',
                'staff',
              ],
            },
            'recipientKey': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 2000,
              'description': 'Stable recipient identity inside the program (guest id, household id, or staff uid). Endpoint resolution lives in the facts reader, never in the intent.',
            },
          },
        },
        'workflow': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'momentId',
            'runId',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'type': 'string',
              'const': 'programMoment',
            },
            'momentId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'runId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 2000,
              'description': 'Moment-run occurrence identity. Phase 3 refines this into an explicit occurrence key once anchor revisions exist.',
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
        'permittedRoutes': <String, Object?>{
          'type': 'array',
          'minItems': 1,
          'maxItems': 3,
          'items': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'organizerProgramWhatsapp',
              'catchProgramActivity',
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
              'minimum': 1,
              'maximum': 6,
            },
            'maxAttemptsPerRoute': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 6,
            },
            'minimumRetrySeconds': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 86400,
            },
          },
        },
        'kind': <String, Object?>{
          'type': 'string',
          'const': 'programReminder',
        },
        'title': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 2000,
        },
        'body': <String, Object?>{
          'type': 'string',
          'minLength': 0,
          'maxLength': 8000,
        },
        'instructionRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
          'description': 'The program/moment fact revision this intent was issued under. Reservation authority expires with it.',
        },
        'whatsapp': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'connectionId',
            'templateId',
            'variables',
          ],
          'properties': <String, Object?>{
            'connectionId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
            },
            'templateId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
            },
            'variables': <String, Object?>{
              'type': 'object',
              'maxProperties': 20,
              'additionalProperties': <String, Object?>{
                'type': 'string',
                'maxLength': 1000,
              },
            },
          },
          'description': 'Approved WhatsApp template content for organizerProgramWhatsapp routes. Frozen at intent time; sender credentials never appear here.',
        },
        'activity': <String, Object?>{
          'description': 'Frozen staff activity and push semantics; claim revalidates the original Moment revision and current recipient authority.',
          'oneOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'appRole',
                'audienceDuty',
                'scopeIds',
                'actionKind',
                'notificationType',
                'preferenceKey',
              ],
              'properties': <String, Object?>{
                'appRole': <String, Object?>{
                  'type': 'string',
                  'const': 'host',
                },
                'audienceDuty': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                },
                'scopeIds': <String, Object?>{
                  'type': <Object?>[
                    'array',
                    'null',
                  ],
                  'items': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 160,
                  },
                  'maxItems': 200,
                },
                'actionKind': <String, Object?>{
                  'type': 'string',
                  'const': 'push',
                },
                'notificationType': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                },
                'preferenceKey': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'appRole',
                'audienceDuty',
                'scopeIds',
                'actionKind',
                'actionDuty',
                'severity',
              ],
              'properties': <String, Object?>{
                'appRole': <String, Object?>{
                  'type': 'string',
                  'const': 'host',
                },
                'audienceDuty': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                },
                'scopeIds': <String, Object?>{
                  'type': <Object?>[
                    'array',
                    'null',
                  ],
                  'items': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 160,
                  },
                  'maxItems': 200,
                },
                'actionKind': <String, Object?>{
                  'type': 'string',
                  'const': 'staffAttention',
                },
                'actionDuty': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                },
                'severity': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'info',
                    'warning',
                    'urgent',
                  ],
                },
              },
            },
          ],
        },
      },
      'if': <String, Object?>{
        'required': <Object?>[
          'activity',
        ],
      },
      'then': <String, Object?>{
        'required': <Object?>[
          'activity',
        ],
        'properties': <String, Object?>{
          'permittedRoutes': <String, Object?>{
            'minItems': 1,
            'maxItems': 1,
            'items': <String, Object?>{
              'const': 'catchProgramActivity',
            },
          },
          'recipient': <String, Object?>{
            'properties': <String, Object?>{
              'kind': <String, Object?>{
                'const': 'staff',
              },
            },
          },
        },
        'not': <String, Object?>{
          'required': <Object?>[
            'whatsapp',
          ],
        },
      },
      'else': <String, Object?>{
        'properties': <String, Object?>{
          'body': <String, Object?>{
            'minLength': 1,
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
                      'sdkOutcomeUnknown',
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
                      'responded',
                      'expired',
                      'permissionRevoked',
                      'reservationExpired',
                      'permitExpired',
                      'programEnded',
                      'rsvpChanged',
                      'recipientWithdrawn',
                    ],
                  },
                },
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
              'programId',
              'organizerId',
            ],
            'properties': <String, Object?>{
              'mode': <String, Object?>{
                'type': 'string',
                'const': 'live',
              },
              'programId': <String, Object?>{
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
                    'const': 'organizerProgramWhatsapp',
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
                      'gupshup',
                      'twilio',
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
                    'const': 'catchProgramActivity',
                    'type': 'string',
                  },
                  'transport': <String, Object?>{
                    'const': 'catchApp',
                    'type': 'string',
                  },
                  'senderIdentity': <String, Object?>{
                    'const': 'catchPlatform',
                    'type': 'string',
                  },
                  'provider': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'catchActivity',
                      'fcm',
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
                    ],
                  },
                  'pushSuppressionReason': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'noEndpoint',
                      'preferenceOff',
                    ],
                    'description': 'Frozen at reservation and claim for local activity only; never FCM submission evidence.',
                  },
                },
                'if': <String, Object?>{
                  'properties': <String, Object?>{
                    'provider': <String, Object?>{
                      'const': 'fcm',
                    },
                  },
                  'required': <Object?>[
                    'provider',
                  ],
                },
                'then': <String, Object?>{
                  'not': <String, Object?>{
                    'required': <Object?>[
                      'pushSuppressionReason',
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
        'if': <String, Object?>{
          'properties': <String, Object?>{
            'state': <String, Object?>{
              'properties': <String, Object?>{
                'reason': <String, Object?>{
                  'const': 'sdkOutcomeUnknown',
                },
              },
              'required': <Object?>[
                'reason',
              ],
            },
          },
          'required': <Object?>[
            'state',
          ],
        },
        'then': <String, Object?>{
          'properties': <String, Object?>{
            'binding': <String, Object?>{
              'properties': <String, Object?>{
                'routeId': <String, Object?>{
                  'const': 'catchProgramActivity',
                },
                'provider': <String, Object?>{
                  'const': 'fcm',
                },
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
};
