// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_sales_funnel_report.schema.json.

const schemaAdminGetSalesFunnelReportResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  'type': 'object',
  'additionalProperties': false,
  'title': 'AdminGetSalesFunnelReportResponse',
  'required': <Object?>[
    'activeHosts',
    'opportunities',
    'hostsWithOpportunities',
    'overdueOpportunities',
    'hostsWithOverdueOpportunities',
    'opportunitiesMissingNextStep',
    'openObligations',
    'overdueObligations',
    'heldHosts',
    'duplicateReviewHosts',
    'excludedArchivedOrRestrictedHosts',
    'movementEvents',
    'schemaVersion',
    'asOf',
    'since',
    'coverage',
    'revenueStatus',
    'stages',
  ],
  'properties': <String, Object?>{
    'activeHosts': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'opportunities': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'hostsWithOpportunities': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'overdueOpportunities': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'hostsWithOverdueOpportunities': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'opportunitiesMissingNextStep': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'openObligations': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'overdueObligations': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'heldHosts': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'duplicateReviewHosts': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'excludedArchivedOrRestrictedHosts': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'movementEvents': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'asOf': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'since': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'coverage': <String, Object?>{
      'const': 'complete_bounded_snapshot',
    },
    'revenueStatus': <String, Object?>{
      'const': 'not_calculated',
    },
    'stages': <String, Object?>{
      'type': 'array',
      'minItems': 11,
      'maxItems': 11,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'stage',
          'opportunities',
          'distinctHosts',
          'enteredInWindow',
          'distinctHostsEntered',
        ],
        'properties': <String, Object?>{
          'stage': <String, Object?>{
            'type': 'string',
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
          'opportunities': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'distinctHosts': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'enteredInWindow': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'distinctHostsEntered': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
        },
      },
    },
  },
  '\$id': 'https://catch.app/contracts/callable_responses/admin_sales_funnel_report.schema.json',
  'x-callable-aliases': <Object?>[
    'adminGetSalesFunnelReport',
  ],
};
