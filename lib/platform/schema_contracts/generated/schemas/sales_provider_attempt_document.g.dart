// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/sales_provider_attempts.schema.json.

const schemaSalesProviderAttemptDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/sales_provider_attempts.schema.json',
  'title': 'SalesProviderAttemptDocument',
  'description': 'Private internal writing preparation intent and validated result. One immutable identity per job/stage survives lease renewal and crashes. No rendered draft, activation or send authority. Privacy deletion requires the permanent processing fence.',
  'x-firestore-collection': 'salesProviderAttempts',
  'x-firestore-path': 'salesProviderAttempts/{attemptId}',
  'x-document-id-field': 'attemptId',
  'x-owner': 'disabled internal Sales writing preparation worker',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'classification',
    'attemptId',
    'jobId',
    'actorUid',
    'organizerId',
    'stage',
    'bindingHash',
    'binding',
    'status',
    'submissionNonce',
    'leaseOwner',
    'month',
    'runBucketId',
    'monthlyBucketId',
    'reservation',
    'createdAt',
    'updatedAt',
    'cache',
    'result',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'classification': <String, Object?>{
      'const': 'sales_private',
    },
    'attemptId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'jobId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'actorUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'stage': <String, Object?>{
      'const': 'writing',
    },
    'bindingHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'binding': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'materialHash',
        'sourceHash',
        'publicMaterialHash',
        'policyHash',
        'stageHash',
        'providerId',
        'modelId',
        'promptVersion',
        'ownerUid',
        'authorizationId',
        'publicReviewId',
        'participantScope',
        'runLimitsHash',
        'monthlyLimitsHash',
        'inputTokenCeiling',
      ],
      'properties': <String, Object?>{
        'materialHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'sourceHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'publicMaterialHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'policyHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'stageHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'providerId': <String, Object?>{
          'enum': <Object?>[
            'deepseek',
            'openai',
            'anthropic',
          ],
        },
        'modelId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 128,
        },
        'promptVersion': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 100,
        },
        'ownerUid': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'authorizationId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'publicReviewId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'participantScope': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'partnerUid',
                'assignmentRevision',
              ],
              'properties': <String, Object?>{
                'partnerUid': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                'assignmentRevision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                },
              },
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'runLimitsHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'monthlyLimitsHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'inputTokenCeiling': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
      },
    },
    'status': <String, Object?>{
      'enum': <Object?>[
        'intent',
        'completed',
      ],
    },
    'submissionNonce': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 64,
    },
    'leaseOwner': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 64,
    },
    'month': <String, Object?>{
      'type': 'string',
      'pattern': '^[0-9]{4}-[0-9]{2}\$',
    },
    'runBucketId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'monthlyBucketId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'reservation': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'modelCalls',
        'networkRequests',
        'modelInputTokens',
        'modelOutputTokens',
        'modelCostMicros',
      ],
      'properties': <String, Object?>{
        'modelCalls': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000000000,
        },
        'networkRequests': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000000000,
        },
        'modelInputTokens': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000000000,
        },
        'modelOutputTokens': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000000000,
        },
        'modelCostMicros': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000000000,
        },
      },
    },
    'createdAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'updatedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'cache': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'schemaVersion',
            'output',
            'provenance',
          ],
          'properties': <String, Object?>{
            'schemaVersion': <String, Object?>{
              'const': 1,
            },
            'output': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'observationAlias',
                'capabilityAlias',
                'referenceAlias',
                'ctaAlias',
                'reasonToBlock',
                'omittedAliases',
              ],
              'properties': <String, Object?>{
                'observationAlias': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 32,
                      'pattern': '^option_[0-9]+\$',
                    },
                    <String, Object?>{
                      'type': 'null',
                    },
                  ],
                },
                'capabilityAlias': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 32,
                      'pattern': '^option_[0-9]+\$',
                    },
                    <String, Object?>{
                      'type': 'null',
                    },
                  ],
                },
                'referenceAlias': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 32,
                      'pattern': '^option_[0-9]+\$',
                    },
                    <String, Object?>{
                      'type': 'null',
                    },
                  ],
                },
                'ctaAlias': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 32,
                      'pattern': '^option_[0-9]+\$',
                    },
                    <String, Object?>{
                      'type': 'null',
                    },
                  ],
                },
                'reasonToBlock': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 1000,
                    },
                    <String, Object?>{
                      'type': 'null',
                    },
                  ],
                },
                'omittedAliases': <String, Object?>{
                  'type': 'array',
                  'maxItems': 100,
                  'items': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 32,
                    'pattern': '^option_[0-9]+\$',
                  },
                },
              },
            },
            'provenance': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'task',
                'promptVersion',
                'modelId',
                'providerId',
                'cacheKey',
                'cacheHit',
                'usage',
                'metadata',
                'request',
                'monthlyWindow',
              ],
              'properties': <String, Object?>{
                'task': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 100,
                },
                'promptVersion': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 100,
                },
                'modelId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 128,
                },
                'providerId': <String, Object?>{
                  'enum': <Object?>[
                    'deepseek',
                    'openai',
                    'anthropic',
                  ],
                },
                'cacheKey': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[a-f0-9]{64}\$',
                },
                'cacheHit': <String, Object?>{
                  'const': false,
                },
                'usage': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'inputTokens',
                    'outputTokens',
                    'costMicros',
                  ],
                  'properties': <String, Object?>{
                    'inputTokens': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 1000000000000,
                    },
                    'outputTokens': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 1000000000000,
                    },
                    'costMicros': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 1000000000000,
                    },
                  },
                },
                'metadata': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'providerId',
                    'modelId',
                    'requestId',
                    'attemptCount',
                    'durationMs',
                    'finishReason',
                    'costBasis',
                    'estimatedCostMicros',
                    'tokens',
                  ],
                  'properties': <String, Object?>{
                    'providerId': <String, Object?>{
                      'enum': <Object?>[
                        'deepseek',
                        'openai',
                        'anthropic',
                      ],
                    },
                    'modelId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 128,
                    },
                    'requestId': <String, Object?>{
                      'anyOf': <Object?>[
                        <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 128,
                          'pattern': '^[A-Za-z0-9_-]+\$',
                        },
                        <String, Object?>{
                          'type': 'null',
                        },
                      ],
                    },
                    'attemptCount': <String, Object?>{
                      'const': 1,
                    },
                    'durationMs': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 600000,
                    },
                    'finishReason': <String, Object?>{
                      'const': 'stop',
                    },
                    'costBasis': <String, Object?>{
                      'const': 'reserved_ceiling',
                    },
                    'estimatedCostMicros': <String, Object?>{
                      'type': 'null',
                    },
                    'tokens': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'inputTotal',
                        'ordinaryInput',
                        'cacheRead',
                        'cacheWrite',
                        'outputTotal',
                        'reasoningOutput',
                      ],
                      'properties': <String, Object?>{
                        'inputTotal': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 1000000000000,
                        },
                        'ordinaryInput': <String, Object?>{
                          'anyOf': <Object?>[
                            <String, Object?>{
                              'type': 'integer',
                              'minimum': 0,
                              'maximum': 1000000000000,
                            },
                            <String, Object?>{
                              'type': 'null',
                            },
                          ],
                        },
                        'cacheRead': <String, Object?>{
                          'anyOf': <Object?>[
                            <String, Object?>{
                              'type': 'integer',
                              'minimum': 0,
                              'maximum': 1000000000000,
                            },
                            <String, Object?>{
                              'type': 'null',
                            },
                          ],
                        },
                        'cacheWrite': <String, Object?>{
                          'anyOf': <Object?>[
                            <String, Object?>{
                              'type': 'integer',
                              'minimum': 0,
                              'maximum': 1000000000000,
                            },
                            <String, Object?>{
                              'type': 'null',
                            },
                          ],
                        },
                        'outputTotal': <String, Object?>{
                          'type': 'integer',
                          'minimum': 0,
                          'maximum': 1000000000000,
                        },
                        'reasoningOutput': <String, Object?>{
                          'anyOf': <Object?>[
                            <String, Object?>{
                              'type': 'integer',
                              'minimum': 0,
                              'maximum': 1000000000000,
                            },
                            <String, Object?>{
                              'type': 'null',
                            },
                          ],
                        },
                      },
                    },
                  },
                },
                'request': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'maxInputBytes',
                    'estimatedInputTokens',
                    'maxOutputTokens',
                    'maxCostMicros',
                    'maxNetworkRequests',
                  ],
                  'properties': <String, Object?>{
                    'maxInputBytes': <String, Object?>{
                      'const': 32768,
                    },
                    'estimatedInputTokens': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 1000000,
                    },
                    'maxOutputTokens': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 8192,
                    },
                    'maxCostMicros': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 100000000,
                    },
                    'maxNetworkRequests': <String, Object?>{
                      'const': 1,
                    },
                  },
                },
                'monthlyWindow': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[0-9]{4}-[0-9]{2}\$',
                },
              },
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'result': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'selection',
            'selectionHash',
            'policyHash',
            'stageHash',
            'authorizationId',
            'stage',
            'sendAuthority',
          ],
          'properties': <String, Object?>{
            'selection': <String, Object?>{
              'title': 'OutreachDraftingSelection',
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'organizerId',
                'contactId',
                'opportunityId',
                'language',
                'observationId',
                'capabilityId',
                'referenceId',
                'ctaId',
                'reasonToBlock',
                'omittedIds',
              ],
              'properties': <String, Object?>{
                'organizerId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
                'contactId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
                'opportunityId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
                'language': <String, Object?>{
                  'const': 'en',
                },
                'observationId': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                },
                'capabilityId': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                },
                'referenceId': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                },
                'ctaId': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                },
                'reasonToBlock': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                  'maxLength': 200,
                },
                'omittedIds': <String, Object?>{
                  'type': 'array',
                  'maxItems': 20,
                  'uniqueItems': true,
                  'items': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 160,
                  },
                },
              },
            },
            'selectionHash': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
            'policyHash': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
            'stageHash': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
            'authorizationId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'stage': <String, Object?>{
              'const': 'writing',
            },
            'sendAuthority': <String, Object?>{
              'const': false,
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
  },
  'allOf': <Object?>[
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'status': <String, Object?>{
            'const': 'intent',
          },
        },
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'cache': <String, Object?>{
            'type': 'null',
          },
          'result': <String, Object?>{
            'type': 'null',
          },
        },
      },
      'else': <String, Object?>{
        'properties': <String, Object?>{
          'cache': <String, Object?>{
            'type': 'object',
          },
          'result': <String, Object?>{
            'type': 'object',
          },
        },
      },
    },
  ],
};
