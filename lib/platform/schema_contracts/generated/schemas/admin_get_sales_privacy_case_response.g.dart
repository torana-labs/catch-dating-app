// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_get_sales_privacy_case_response.schema.json.

const schemaAdminGetSalesPrivacyCaseResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_get_sales_privacy_case_response.schema.json',
  'title': 'adminGetSalesPrivacyCaseResponse',
  'anyOf': <Object?>[
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'organizerId',
        'restricted',
        'plan',
        'completeDeletion',
        'policy',
      ],
      'properties': <String, Object?>{
        'organizerId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{0,179}\$',
        },
        'restricted': <String, Object?>{
          'const': false,
        },
        'plan': <String, Object?>{
          'type': 'null',
        },
        'completeDeletion': <String, Object?>{
          'const': false,
        },
        'policy': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'null',
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'revision',
                'policyHash',
                'sourceReference',
                'reviewedAt',
                'financeDisposition',
                'auditDisposition',
                'financeReason',
                'auditReason',
              ],
              'properties': <String, Object?>{
                'revision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                },
                'policyHash': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[a-f0-9]{64}\$',
                },
                'sourceReference': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 240,
                },
                'reviewedAt': <String, Object?>{
                  'type': 'string',
                  'format': 'date-time',
                },
                'financeDisposition': <String, Object?>{
                  'const': 'retain_pending_finance_review',
                },
                'auditDisposition': <String, Object?>{
                  'const': 'retain_pending_audit_review',
                },
                'financeReason': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 500,
                },
                'auditReason': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 500,
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
        'organizerId',
        'restricted',
        'restriction',
        'plan',
        'completeDeletion',
        'policy',
      ],
      'properties': <String, Object?>{
        'organizerId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{0,179}\$',
        },
        'restricted': <String, Object?>{
          'const': true,
        },
        'restriction': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'status',
            'revision',
            'restrictedAt',
            'reason',
          ],
          'properties': <String, Object?>{
            'status': <String, Object?>{
              'enum': <Object?>[
                'restricted',
                'processing',
                'internal_processed_with_unresolved',
              ],
            },
            'revision': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
            },
            'restrictedAt': <String, Object?>{
              'type': 'string',
              'format': 'date-time',
            },
            'reason': <String, Object?>{
              'type': 'string',
            },
          },
        },
        'plan': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'planId',
                'organizerId',
                'policyHash',
                'inventoryHash',
                'cursor',
                'itemCount',
                'retainedCount',
                'unresolvedCount',
                'blockers',
                'status',
              ],
              'properties': <String, Object?>{
                'planId': <String, Object?>{
                  'type': 'string',
                  'pattern': '^privacy-[a-f0-9]{40}\$',
                },
                'organizerId': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{0,179}\$',
                },
                'policyHash': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[a-f0-9]{64}\$',
                },
                'inventoryHash': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[a-f0-9]{64}\$',
                },
                'cursor': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                },
                'itemCount': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                },
                'retainedCount': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                },
                'unresolvedCount': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                },
                'blockers': <String, Object?>{
                  'type': 'array',
                  'maxItems': 240,
                  'items': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'code',
                      'fingerprint',
                    ],
                    'properties': <String, Object?>{
                      'code': <String, Object?>{
                        'type': 'string',
                        'pattern': '^[a-z_]{3,80}\$',
                      },
                      'fingerprint': <String, Object?>{
                        'type': 'string',
                        'pattern': '^[a-f0-9]{16}\$',
                      },
                    },
                  },
                },
                'status': <String, Object?>{
                  'enum': <Object?>[
                    'reviewed',
                    'processing',
                    'internal_processed_with_unresolved',
                  ],
                },
              },
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'completeDeletion': <String, Object?>{
          'const': false,
        },
        'policy': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'null',
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'revision',
                'policyHash',
                'sourceReference',
                'reviewedAt',
                'financeDisposition',
                'auditDisposition',
                'financeReason',
                'auditReason',
              ],
              'properties': <String, Object?>{
                'revision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                },
                'policyHash': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[a-f0-9]{64}\$',
                },
                'sourceReference': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 240,
                },
                'reviewedAt': <String, Object?>{
                  'type': 'string',
                  'format': 'date-time',
                },
                'financeDisposition': <String, Object?>{
                  'const': 'retain_pending_finance_review',
                },
                'auditDisposition': <String, Object?>{
                  'const': 'retain_pending_audit_review',
                },
                'financeReason': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 500,
                },
                'auditReason': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 500,
                },
              },
            },
          ],
        },
      },
    },
  ],
  'x-callable-aliases': <Object?>[
    'adminGetSalesPrivacyCase',
  ],
  'definitions': <String, Object?>{
    'blocker': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'code',
        'fingerprint',
      ],
      'properties': <String, Object?>{
        'code': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-z_]{3,80}\$',
        },
        'fingerprint': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{16}\$',
        },
      },
    },
    'plan': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'planId',
        'organizerId',
        'policyHash',
        'inventoryHash',
        'cursor',
        'itemCount',
        'retainedCount',
        'unresolvedCount',
        'blockers',
        'status',
      ],
      'properties': <String, Object?>{
        'planId': <String, Object?>{
          'type': 'string',
          'pattern': '^privacy-[a-f0-9]{40}\$',
        },
        'organizerId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{0,179}\$',
        },
        'policyHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'inventoryHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'cursor': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'itemCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'retainedCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'unresolvedCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'blockers': <String, Object?>{
          'type': 'array',
          'maxItems': 240,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'code',
              'fingerprint',
            ],
            'properties': <String, Object?>{
              'code': <String, Object?>{
                'type': 'string',
                'pattern': '^[a-z_]{3,80}\$',
              },
              'fingerprint': <String, Object?>{
                'type': 'string',
                'pattern': '^[a-f0-9]{16}\$',
              },
            },
          },
        },
        'status': <String, Object?>{
          'enum': <Object?>[
            'reviewed',
            'processing',
            'internal_processed_with_unresolved',
          ],
        },
      },
    },
    'batch': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'organizerId',
        'planId',
        'previousCursor',
        'nextCursor',
        'itemCount',
        'deletedCount',
        'retainedCount',
        'unresolvedCount',
        'status',
        'completeDeletion',
        'receiptId',
      ],
      'properties': <String, Object?>{
        'organizerId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{0,179}\$',
        },
        'planId': <String, Object?>{
          'type': 'string',
          'pattern': '^privacy-[a-f0-9]{40}\$',
        },
        'previousCursor': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'nextCursor': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'itemCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'deletedCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'retainedCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'unresolvedCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'status': <String, Object?>{
          'enum': <Object?>[
            'processing',
            'internal_processed_with_unresolved',
          ],
        },
        'completeDeletion': <String, Object?>{
          'const': false,
        },
        'receiptId': <String, Object?>{
          'type': 'string',
          'pattern': '^privacy-batch-[a-f0-9]{40}\$',
        },
      },
    },
  },
};
