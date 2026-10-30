// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_get_sales_commercial_detail_response.schema.json.

const schemaAdminGetSalesCommercialDetailResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_get_sales_commercial_detail_response.schema.json',
  'title': 'admin_get_sales_commercial_detail_response response',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'opportunity',
    'pilotPlan',
    'quote',
    'quoteVersion',
    'approvedDecision',
    'acceptedDecision',
    'settlementAttestation',
    'history',
    'historyTruncated',
    'paymentStatus',
    'bookedHostRevenueMinor',
  ],
  'properties': <String, Object?>{
    'opportunity': <String, Object?>{
      'title': 'SalesOpportunityDocument',
      'description': 'Private sales pipeline stage, independent of public organizer status.',
      'type': 'object',
      'additionalProperties': false,
      'x-firestore-collection': 'salesOpportunities',
      'x-firestore-path': 'salesOpportunities/{opportunityId}',
      'x-owner': 'private Sales opportunity service',
      'required': <Object?>[
        'schemaVersion',
        'classification',
        'opportunityId',
        'organizerId',
        'revision',
        'motion',
        'stage',
        'ownerUid',
        'nextStep',
        'nextStepAt',
        'stageEnteredAt',
        'createdAt',
        'updatedAt',
        'updatedBy',
      ],
      'properties': <String, Object?>{
        'schemaVersion': <String, Object?>{
          'const': 1,
        },
        'classification': <String, Object?>{
          'const': 'sales_private',
        },
        'opportunityId': <String, Object?>{
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
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 1000000000,
        },
        'motion': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
        },
        'stage': <String, Object?>{
          'enum': <Object?>[
            'new_enquiry',
            'ready_to_contact',
            'contacted',
            'in_conversation',
            'demo_arranged',
            'demo_completed',
            'pilot_agreed',
            'pilot_running',
            'commercial_discussion',
            'closed_won',
            'closed_lost',
          ],
        },
        'ownerUid': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'nextStep': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'minLength': 0,
              'maxLength': 320,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'nextStepAt': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'format': 'date-time',
              'maxLength': 48,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'stageEnteredAt': <String, Object?>{
          'type': 'string',
          'format': 'date-time',
          'maxLength': 48,
        },
        'createdAt': <String, Object?>{
          'type': 'string',
          'format': 'date-time',
          'maxLength': 48,
        },
        'updatedAt': <String, Object?>{
          'type': 'string',
          'format': 'date-time',
          'maxLength': 48,
        },
        'updatedBy': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
      },
      'x-document-id-field': 'opportunityId',
    },
    'pilotPlan': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'title': 'salesPilotPlans document',
          'description': 'Private revisioned pilot scope; no revenue or product activation authority.',
          'type': 'object',
          'additionalProperties': false,
          'x-firestore-collection': 'salesPilotPlans',
          'x-firestore-path': 'salesPilotPlans/{opportunityId}',
          'x-owner': 'private Sales commercial service',
          'required': <Object?>[
            'schemaVersion',
            'classification',
            'organizerId',
            'opportunityId',
            'revision',
            'status',
            'workflowId',
            'objective',
            'successMeasures',
            'startsAt',
            'endsAt',
            'reviewEvidence',
            'outcomeEvidence',
            'updatedAt',
            'updatedBy',
          ],
          'properties': <String, Object?>{
            'schemaVersion': <String, Object?>{
              'const': 1,
            },
            'classification': <String, Object?>{
              'const': 'sales_private',
            },
            'organizerId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 96,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'opportunityId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 96,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'revision': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
            },
            'status': <String, Object?>{
              'enum': <Object?>[
                'draft',
                'reviewed',
                'active',
                'completed',
                'cancelled',
              ],
            },
            'workflowId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 96,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'objective': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 1000,
            },
            'successMeasures': <String, Object?>{
              'type': 'array',
              'minItems': 1,
              'maxItems': 8,
              'items': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 240,
              },
            },
            'startsAt': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'format': 'date-time',
                  'maxLength': 48,
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'endsAt': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'format': 'date-time',
                  'maxLength': 48,
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'reviewEvidence': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'evidenceId',
                    'sourceRef',
                    'contentHash',
                    'observedAt',
                  ],
                  'properties': <String, Object?>{
                    'evidenceId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 96,
                      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                    },
                    'sourceRef': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 512,
                    },
                    'contentHash': <String, Object?>{
                      'type': 'string',
                      'pattern': '^[a-f0-9]{64}\$',
                    },
                    'observedAt': <String, Object?>{
                      'type': 'string',
                      'format': 'date-time',
                      'maxLength': 48,
                    },
                  },
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'outcomeEvidence': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'evidenceId',
                    'sourceRef',
                    'contentHash',
                    'observedAt',
                  ],
                  'properties': <String, Object?>{
                    'evidenceId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 96,
                      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                    },
                    'sourceRef': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 512,
                    },
                    'contentHash': <String, Object?>{
                      'type': 'string',
                      'pattern': '^[a-f0-9]{64}\$',
                    },
                    'observedAt': <String, Object?>{
                      'type': 'string',
                      'format': 'date-time',
                      'maxLength': 48,
                    },
                  },
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'updatedAt': <String, Object?>{
              'type': 'string',
              'format': 'date-time',
              'maxLength': 48,
            },
            'updatedBy': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 96,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
          },
          'x-document-id-field': 'opportunityId',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'quote': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'title': 'salesQuotes document',
          'description': 'Current quote head; accepted terms do not prove collection.',
          'type': 'object',
          'additionalProperties': false,
          'x-firestore-collection': 'salesQuotes',
          'x-firestore-path': 'salesQuotes/{quoteId}',
          'x-owner': 'private Sales commercial service',
          'required': <Object?>[
            'schemaVersion',
            'classification',
            'organizerId',
            'opportunityId',
            'quoteId',
            'revision',
            'termVersion',
            'status',
            'approvedDecisionId',
            'acceptedDecisionId',
            'updatedAt',
            'updatedBy',
          ],
          'properties': <String, Object?>{
            'schemaVersion': <String, Object?>{
              'const': 1,
            },
            'classification': <String, Object?>{
              'const': 'sales_private',
            },
            'organizerId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 96,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'opportunityId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 96,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'quoteId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 96,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'revision': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
            },
            'termVersion': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
            },
            'status': <String, Object?>{
              'enum': <Object?>[
                'draft',
                'approved',
                'accepted_reviewed',
              ],
            },
            'approvedDecisionId': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 96,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'acceptedDecisionId': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 96,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'updatedAt': <String, Object?>{
              'type': 'string',
              'format': 'date-time',
              'maxLength': 48,
            },
            'updatedBy': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 96,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
          },
          'x-document-id-field': 'quoteId',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'quoteVersion': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'title': 'salesQuoteVersions document',
          'description': 'Immutable exact commercial terms with reviewed source fact references.',
          'type': 'object',
          'additionalProperties': false,
          'x-firestore-collection': 'salesQuoteVersions',
          'x-firestore-path': 'salesQuoteVersions/{versionId}',
          'x-owner': 'private Sales commercial service',
          'required': <Object?>[
            'schemaVersion',
            'classification',
            'organizerId',
            'opportunityId',
            'quoteId',
            'termVersion',
            'terms',
            'termsHash',
            'createdAt',
            'createdBy',
          ],
          'properties': <String, Object?>{
            'schemaVersion': <String, Object?>{
              'const': 1,
            },
            'classification': <String, Object?>{
              'const': 'sales_private',
            },
            'organizerId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 96,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'opportunityId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 96,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'quoteId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 96,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'termVersion': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
            },
            'terms': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'currency',
                'amountMinor',
                'billingCadence',
                'scope',
                'validUntil',
                'sourceFactRefs',
              ],
              'properties': <String, Object?>{
                'currency': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[A-Z]{3}\$',
                },
                'amountMinor': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 1000000000000,
                },
                'billingCadence': <String, Object?>{
                  'enum': <Object?>[
                    'one_time',
                    'monthly',
                    'annual',
                    'usage_based',
                  ],
                },
                'scope': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 2000,
                },
                'validUntil': <String, Object?>{
                  'type': 'string',
                  'format': 'date-time',
                  'maxLength': 48,
                },
                'sourceFactRefs': <String, Object?>{
                  'type': 'array',
                  'minItems': 1,
                  'maxItems': 20,
                  'uniqueItems': true,
                  'items': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 96,
                    'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                  },
                },
              },
            },
            'termsHash': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
            'createdAt': <String, Object?>{
              'type': 'string',
              'format': 'date-time',
              'maxLength': 48,
            },
            'createdBy': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 96,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'approvedDecision': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'title': 'salesCommercialDecisions document',
          'description': 'Append-only exact-version approval or reviewed terms acceptance; not a receipt.',
          'type': 'object',
          'additionalProperties': false,
          'x-firestore-collection': 'salesCommercialDecisions',
          'x-firestore-path': 'salesCommercialDecisions/{decisionId}',
          'x-owner': 'private Sales commercial service',
          'required': <Object?>[
            'schemaVersion',
            'classification',
            'decisionId',
            'organizerId',
            'opportunityId',
            'quoteId',
            'termVersion',
            'termsHash',
            'kind',
            'evidence',
            'approvedDecisionId',
            'actorUid',
            'decidedAt',
            'paymentStatus',
          ],
          'properties': <String, Object?>{
            'schemaVersion': <String, Object?>{
              'const': 1,
            },
            'classification': <String, Object?>{
              'const': 'sales_private',
            },
            'decisionId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 96,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'organizerId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 96,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'opportunityId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 96,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'quoteId': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 96,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'termVersion': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'termsHash': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
            'kind': <String, Object?>{
              'enum': <Object?>[
                'quote_approved',
                'terms_acceptance_reviewed',
              ],
            },
            'evidence': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'evidenceId',
                'sourceRef',
                'contentHash',
                'observedAt',
              ],
              'properties': <String, Object?>{
                'evidenceId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 96,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                'sourceRef': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 512,
                },
                'contentHash': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[a-f0-9]{64}\$',
                },
                'observedAt': <String, Object?>{
                  'type': 'string',
                  'format': 'date-time',
                  'maxLength': 48,
                },
              },
            },
            'approvedDecisionId': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 96,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'actorUid': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 96,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'decidedAt': <String, Object?>{
              'type': 'string',
              'format': 'date-time',
              'maxLength': 48,
            },
            'paymentStatus': <String, Object?>{
              'const': 'unknown',
            },
          },
          'x-document-id-field': 'decisionId',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'acceptedDecision': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'title': 'salesCommercialDecisions document',
          'description': 'Append-only exact-version approval or reviewed terms acceptance; not a receipt.',
          'type': 'object',
          'additionalProperties': false,
          'x-firestore-collection': 'salesCommercialDecisions',
          'x-firestore-path': 'salesCommercialDecisions/{decisionId}',
          'x-owner': 'private Sales commercial service',
          'required': <Object?>[
            'schemaVersion',
            'classification',
            'decisionId',
            'organizerId',
            'opportunityId',
            'quoteId',
            'termVersion',
            'termsHash',
            'kind',
            'evidence',
            'approvedDecisionId',
            'actorUid',
            'decidedAt',
            'paymentStatus',
          ],
          'properties': <String, Object?>{
            'schemaVersion': <String, Object?>{
              'const': 1,
            },
            'classification': <String, Object?>{
              'const': 'sales_private',
            },
            'decisionId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 96,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'organizerId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 96,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'opportunityId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 96,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'quoteId': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 96,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'termVersion': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'termsHash': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
            'kind': <String, Object?>{
              'enum': <Object?>[
                'quote_approved',
                'terms_acceptance_reviewed',
              ],
            },
            'evidence': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'evidenceId',
                'sourceRef',
                'contentHash',
                'observedAt',
              ],
              'properties': <String, Object?>{
                'evidenceId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 96,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                'sourceRef': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 512,
                },
                'contentHash': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[a-f0-9]{64}\$',
                },
                'observedAt': <String, Object?>{
                  'type': 'string',
                  'format': 'date-time',
                  'maxLength': 48,
                },
              },
            },
            'approvedDecisionId': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 96,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'actorUid': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 96,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'decidedAt': <String, Object?>{
              'type': 'string',
              'format': 'date-time',
              'maxLength': 48,
            },
            'paymentStatus': <String, Object?>{
              'const': 'unknown',
            },
          },
          'x-document-id-field': 'decisionId',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'settlementAttestation': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'title': 'SalesHostSettlementAttestationsDocument',
          'description': 'Owner-attested first-party host subscription collection; provider unconfirmed and separate from guest payments.',
          'type': 'object',
          'additionalProperties': false,
          'x-firestore-collection': 'salesHostSettlementAttestations',
          'x-firestore-path': 'salesHostSettlementAttestations/{attestationId}',
          'x-owner': 'private Sales commercial service',
          'required': <Object?>[
            'schemaVersion',
            'classification',
            'revision',
            'attestationId',
            'organizerId',
            'opportunityId',
            'quoteId',
            'termVersion',
            'termsHash',
            'amountMinor',
            'currency',
            'purpose',
            'receivedAt',
            'settlementMethod',
            'settlementReference',
            'recipientAccountScope',
            'settlementIdentityHash',
            'servicePeriod',
            'evidence',
            'status',
            'providerConfirmed',
            'actorUid',
            'attestedAt',
          ],
          'properties': <String, Object?>{
            'schemaVersion': <String, Object?>{
              'const': 1,
            },
            'classification': <String, Object?>{
              'const': 'sales_private',
            },
            'revision': <String, Object?>{
              'const': 1,
            },
            'attestationId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 96,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'organizerId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 96,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'opportunityId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 96,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'quoteId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 96,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'termVersion': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
            },
            'termsHash': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
            'amountMinor': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 1000000000000,
            },
            'currency': <String, Object?>{
              'type': 'string',
              'pattern': '^[A-Z]{3}\$',
            },
            'purpose': <String, Object?>{
              'const': 'host_subscription',
            },
            'receivedAt': <String, Object?>{
              'type': 'string',
              'format': 'date-time',
              'maxLength': 48,
            },
            'settlementMethod': <String, Object?>{
              'enum': <Object?>[
                'bank_transfer',
                'cash',
                'other_external',
              ],
            },
            'settlementReference': <String, Object?>{
              'type': 'string',
              'minLength': 6,
              'maxLength': 120,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9 ./_-]*\$',
            },
            'recipientAccountScope': <String, Object?>{
              'type': 'string',
              'minLength': 3,
              'maxLength': 96,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9 ./_-]*\$',
            },
            'settlementIdentityHash': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
            'servicePeriod': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'startsAt',
                    'endsAt',
                  ],
                  'properties': <String, Object?>{
                    'startsAt': <String, Object?>{
                      'type': 'string',
                      'format': 'date-time',
                      'maxLength': 48,
                    },
                    'endsAt': <String, Object?>{
                      'type': 'string',
                      'format': 'date-time',
                      'maxLength': 48,
                    },
                  },
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'evidence': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'evidenceId',
                'sourceRef',
                'contentHash',
                'observedAt',
              ],
              'properties': <String, Object?>{
                'evidenceId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 96,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                'sourceRef': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 512,
                },
                'contentHash': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[a-f0-9]{64}\$',
                },
                'observedAt': <String, Object?>{
                  'type': 'string',
                  'format': 'date-time',
                  'maxLength': 48,
                },
              },
            },
            'status': <String, Object?>{
              'const': 'manual_attested_collected',
            },
            'providerConfirmed': <String, Object?>{
              'const': false,
            },
            'actorUid': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 96,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'attestedAt': <String, Object?>{
              'type': 'string',
              'format': 'date-time',
              'maxLength': 48,
            },
          },
          'x-document-id-field': 'attestationId',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'history': <String, Object?>{
      'type': 'array',
      'maxItems': 25,
      'items': <String, Object?>{
        'title': 'salesOpportunityStageHistory document',
        'description': 'Append-only private stage movement with explicit loss/reopen reason.',
        'type': 'object',
        'additionalProperties': false,
        'x-firestore-collection': 'salesOpportunityStageHistory',
        'x-firestore-path': 'salesOpportunityStageHistory/{historyId}',
        'x-owner': 'private Sales commercial service',
        'required': <Object?>[
          'schemaVersion',
          'classification',
          'historyId',
          'organizerId',
          'opportunityId',
          'fromStage',
          'toStage',
          'reason',
          'actorUid',
          'changedAt',
        ],
        'properties': <String, Object?>{
          'schemaVersion': <String, Object?>{
            'const': 1,
          },
          'classification': <String, Object?>{
            'const': 'sales_private',
          },
          'historyId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 96,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'organizerId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 96,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'opportunityId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 96,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'fromStage': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 96,
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
          'toStage': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 96,
          },
          'reason': <String, Object?>{
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
          'actorUid': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 96,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'changedAt': <String, Object?>{
            'type': 'string',
            'format': 'date-time',
            'maxLength': 48,
          },
        },
        'x-document-id-field': 'historyId',
      },
    },
    'historyTruncated': <String, Object?>{
      'type': 'boolean',
    },
    'paymentStatus': <String, Object?>{
      'enum': <Object?>[
        'unknown',
        'manual_attested',
      ],
    },
    'bookedHostRevenueMinor': <String, Object?>{
      'type': 'null',
    },
  },
};
