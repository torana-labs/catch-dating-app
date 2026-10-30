// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/automation_delivery_messages.schema.json.

const schemaAutomationDeliveryMessageDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/automation_delivery_messages.schema.json',
  'title': 'AutomationDeliveryMessageDocument',
  'description': 'Private durable form-automation delivery outbox. The immutable intent and bounded attempt history survive dispatch interruption and delayed provider callbacks. The companion organizerMomentRuns row remains the organizer-visible journal; this record is the execution authority. Recipient endpoints are references; transport credentials stay in their own private stores.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'automationDeliveryMessages',
  'x-firestore-path': 'automationDeliveryMessages/{messageId}',
  'x-document-id-field': 'messageId',
  'x-owner': 'trusted automation delivery workers',
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
        'ruleId',
        'recipient',
        'workflow',
        'createdAt',
        'expiresAt',
        'permittedRoutes',
        'deliveryPolicy',
        'kind',
        'instructionRevision',
        'whatsapp',
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
            'organizerId',
            'ruleId',
            'ruleRevision',
            'actionId',
            'eventKind',
            'sourceId',
            'occurredAtMillis',
            'dueAtMillis',
            'contactId',
            'recipeCampaignId',
            'recipeRevision',
          ],
          'properties': <String, Object?>{
            'mode': <String, Object?>{
              'type': 'string',
              'const': 'live',
            },
            'organizerId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 2000,
            },
            'ruleId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'ruleRevision': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 1000000,
              'description': 'Approved rule revision the intent was authorized under. Claim re-reads the live rule; a changed revision stops the intent as superseded.',
            },
            'actionId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
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
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'occurredAtMillis': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
              'description': 'Source-event occurrence time; part of the durable occurrence identity alongside ruleId/actionId/eventKind/sourceId.',
            },
            'dueAtMillis': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
              'description': 'The business delay horizon the automation engine computed (max(occurredAt, eventEndAt) + delayMinutes). Claim re-derives it from the live event and rule.',
            },
            'contactId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
              'description': 'Contact identity resolved from the source event at handoff. Claim re-derives the current identity from the live source event, so a merge follows the send to the surviving contact.',
            },
            'recipeCampaignId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
              'description': 'organizerCampaigns document id of the recipe the action pinned.',
            },
            'recipeRevision': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 1000000,
            },
          },
        },
        'ruleId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][a-zA-Z0-9._:-]*\$',
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
                'organizerContact',
              ],
            },
            'recipientKey': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 2000,
              'description': 'organizerContacts document id resolved at handoff. Endpoint and consent facts resolve at claim time, never in the intent.',
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
              'const': 'automationSend',
            },
            'momentId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
              'description': 'The rule\'s server-managed companion moment.',
            },
            'runId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
              'description': 'The occurrence-keyed moment run journaling this send.',
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
          'maxItems': 1,
          'items': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'organizerWhatsappAutomation',
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
          'const': 'automationMessage',
        },
        'instructionRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
          'description': 'The companion moment\'s revision at handoff. Reservation authority expires when the synced rule projection changes.',
        },
        'whatsapp': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'connectionId',
            'templateId',
            'variables',
            'eventId',
            'inviteLinkId',
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
            'eventId': <String, Object?>{
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
              'description': 'Event destination pinned by the recipe; claim re-verifies the event is still active and owned.',
            },
            'inviteLinkId': <String, Object?>{
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
              'description': 'Per-occurrence invitation link minted at handoff; claim re-reads its secret so a rotated or revoked link fails closed.',
            },
          },
          'description': 'Approved WhatsApp template content frozen at handoff, including the rendered invite variables; sender credentials never appear here.',
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
          'mode': <String, Object?>{
            'const': 'live',
            'type': 'string',
          },
          'context': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'mode',
              'organizerId',
              'ruleId',
              'ruleRevision',
              'actionId',
              'eventKind',
              'sourceId',
              'occurredAtMillis',
              'dueAtMillis',
              'contactId',
              'recipeCampaignId',
              'recipeRevision',
            ],
            'properties': <String, Object?>{
              'mode': <String, Object?>{
                'type': 'string',
                'const': 'live',
              },
              'organizerId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 2000,
              },
              'ruleId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 160,
                'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
              },
              'ruleRevision': <String, Object?>{
                'type': 'integer',
                'minimum': 1,
                'maximum': 1000000,
                'description': 'Approved rule revision the intent was authorized under. Claim re-reads the live rule; a changed revision stops the intent as superseded.',
              },
              'actionId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 160,
                'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
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
                'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
              },
              'occurredAtMillis': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 9007199254740991,
                'description': 'Source-event occurrence time; part of the durable occurrence identity alongside ruleId/actionId/eventKind/sourceId.',
              },
              'dueAtMillis': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 9007199254740991,
                'description': 'The business delay horizon the automation engine computed (max(occurredAt, eventEndAt) + delayMinutes). Claim re-derives it from the live event and rule.',
              },
              'contactId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 160,
                'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                'description': 'Contact identity resolved from the source event at handoff. Claim re-derives the current identity from the live source event, so a merge follows the send to the surviving contact.',
              },
              'recipeCampaignId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 160,
                'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                'description': 'organizerCampaigns document id of the recipe the action pinned.',
              },
              'recipeRevision': <String, Object?>{
                'type': 'integer',
                'minimum': 1,
                'maximum': 1000000,
              },
            },
          },
          'binding': <String, Object?>{
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
                'const': 'organizerWhatsappAutomation',
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
                'description': 'organizerSenderConnections document id that owns the send.',
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
            },
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
