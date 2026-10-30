// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_link_organizer_intake_to_sales_response.schema.json.

const schemaAdminLinkOrganizerIntakeToSalesResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_link_organizer_intake_to_sales_response.schema.json',
  'title': 'AdminLinkOrganizerIntakeToSalesResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'link',
    'account',
    'accountCreated',
  ],
  'properties': <String, Object?>{
    'link': <String, Object?>{
      'title': 'SalesIntakeLinkDocument',
      'description': 'Immutable private join from exact reviewed Supply Intake candidate and canonical identity decision to the Sales companion account.',
      'type': 'object',
      'additionalProperties': false,
      'x-firestore-collection': 'salesIntakeLinks',
      'x-firestore-path': 'salesIntakeLinks/{linkId}',
      'x-document-id-field': 'linkId',
      'x-owner': 'adminLinkOrganizerIntakeToSales',
      'required': <Object?>[
        'schemaVersion',
        'classification',
        'linkId',
        'workItemId',
        'candidateId',
        'sourceRunId',
        'sourceWorkItemRevision',
        'sourceCandidateHash',
        'organizerId',
        'curationPath',
        'curationOperationType',
        'curationReviewedByUid',
        'curationReviewedAt',
        'linkedByUid',
        'linkedAt',
      ],
      'properties': <String, Object?>{
        'schemaVersion': <String, Object?>{
          'const': 1,
        },
        'classification': <String, Object?>{
          'const': 'sales_private',
        },
        'linkId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 96,
        },
        'workItemId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'candidateId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 240,
        },
        'sourceRunId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'sourceWorkItemRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'sourceCandidateHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'organizerId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 96,
        },
        'curationPath': <String, Object?>{
          'type': 'string',
          'minLength': 34,
          'maxLength': 270,
        },
        'curationOperationType': <String, Object?>{
          'enum': <Object?>[
            'create_entity_draft',
            'attach_surface',
          ],
        },
        'curationReviewedByUid': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'curationReviewedAt': <String, Object?>{
          'type': 'string',
          'format': 'date-time',
          'maxLength': 48,
        },
        'linkedByUid': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'linkedAt': <String, Object?>{
          'type': 'string',
          'format': 'date-time',
          'maxLength': 48,
        },
      },
    },
    'account': <String, Object?>{
      'title': 'OrganizerSalesAccountDocument',
      'description': 'Private organizer-linked Sales companion; no canonical ownership, payment, or publication authority.',
      'type': 'object',
      'additionalProperties': false,
      'x-firestore-collection': 'organizerSalesAccounts',
      'x-firestore-path': 'organizerSalesAccounts/{organizerId}',
      'x-owner': 'private Sales account service',
      'required': <Object?>[
        'schemaVersion',
        'classification',
        'organizerId',
        'revision',
        'researchStatus',
        'assignedOwnerUid',
        'summary',
        'nextAction',
        'suppressionStatus',
        'suppressionReason',
        'suppressionAt',
        'suppressionBy',
        'duplicateReviewRequired',
        'qualificationPolicy',
        'name',
        'city',
        'market',
        'marketLabel',
        'eventTypes',
        'cohortIds',
        'searchTokens',
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
        'researchStatus': <String, Object?>{
          'enum': <Object?>[
            'new',
            'needs_research',
            'ready_for_review',
            'qualified',
            'benchmark_only',
            'no_fit',
            'archived',
          ],
        },
        'assignedOwnerUid': <String, Object?>{
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
        },
        'summary': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'minLength': 0,
              'maxLength': 1200,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'nextAction': <String, Object?>{
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
        'suppressionStatus': <String, Object?>{
          'enum': <Object?>[
            'clear',
            'held',
            'suppressed',
          ],
        },
        'suppressionReason': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'minLength': 0,
              'maxLength': 2000,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'suppressionAt': <String, Object?>{
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
        'suppressionBy': <String, Object?>{
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
        },
        'duplicateReviewRequired': <String, Object?>{
          'type': 'boolean',
        },
        'qualificationPolicy': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'policyId',
                'version',
                'policyHash',
              ],
              'properties': <String, Object?>{
                'policyId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                'version': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                'policyHash': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[a-f0-9]{64}\$',
                },
              },
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'name': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
        },
        'city': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'market': <String, Object?>{
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
        'marketLabel': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'eventTypes': <String, Object?>{
          'type': 'array',
          'minItems': 0,
          'maxItems': 30,
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
          },
        },
        'cohortIds': <String, Object?>{
          'type': 'array',
          'minItems': 0,
          'maxItems': 30,
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
        },
        'searchTokens': <String, Object?>{
          'type': 'array',
          'minItems': 0,
          'maxItems': 40,
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 2,
            'maxLength': 96,
          },
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
        'cohortMutationId': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
            <String, Object?>{
              'const': 'initial',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
      },
      'x-document-id-field': 'organizerId',
    },
    'accountCreated': <String, Object?>{
      'type': 'boolean',
    },
  },
};
