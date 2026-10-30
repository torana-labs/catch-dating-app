// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_list_sales_commercial_report_response.schema.json.

const schemaAdminListSalesCommercialReportResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_list_sales_commercial_report_response.schema.json',
  'title': 'admin_list_sales_commercial_report_response response',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'rows',
    'nextCursor',
    'pageScope',
  ],
  'properties': <String, Object?>{
    'rows': <String, Object?>{
      'type': 'array',
      'maxItems': 25,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'opportunityId',
          'stage',
          'ownerUid',
          'pilotStatus',
          'pilotRevision',
          'quoteStatus',
          'quoteRevision',
          'termVersion',
          'paymentStatus',
          'manuallyAttestedHostRevenue',
          'bookedHostRevenueMinor',
        ],
        'properties': <String, Object?>{
          'opportunityId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 96,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'stage': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 96,
          },
          'ownerUid': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 96,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'pilotStatus': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'enum': <Object?>[
                  'draft',
                  'reviewed',
                  'active',
                  'completed',
                  'cancelled',
                ],
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
          'pilotRevision': <String, Object?>{
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
          'quoteStatus': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'enum': <Object?>[
                  'draft',
                  'approved',
                  'accepted_reviewed',
                ],
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
          'quoteRevision': <String, Object?>{
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
          'paymentStatus': <String, Object?>{
            'enum': <Object?>[
              'unknown',
              'manual_attested',
            ],
          },
          'manuallyAttestedHostRevenue': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'amountMinor',
                  'currency',
                  'providerConfirmed',
                  'purpose',
                ],
                'properties': <String, Object?>{
                  'amountMinor': <String, Object?>{
                    'type': 'integer',
                    'minimum': 1,
                  },
                  'currency': <String, Object?>{
                    'type': 'string',
                    'pattern': '^[A-Z]{3}\$',
                  },
                  'providerConfirmed': <String, Object?>{
                    'const': false,
                  },
                  'purpose': <String, Object?>{
                    'const': 'host_subscription',
                  },
                },
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
          'bookedHostRevenueMinor': <String, Object?>{
            'type': 'null',
          },
        },
      },
    },
    'nextCursor': <String, Object?>{
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
    'pageScope': <String, Object?>{
      'const': true,
    },
  },
};
