// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/get_organizer_crm_summary_response.schema.json.

const schemaGetOrganizerCrmSummaryCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/get_organizer_crm_summary_response.schema.json',
  'title': 'GetOrganizerCrmSummaryCallableResponse',
  'description': 'Projected Host CRM counts. No attendee identity or contact field is returned.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'contactCount',
    'pastAttendeeCount',
    'repeatAttendeeCount',
    'advocateCount',
    'highImpactAdvocateCount',
    'linkedAccountCount',
    'importedContactCount',
    'whatsappOptInCount',
    'smsOptInCount',
    'truncated',
    'readiness',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'contactCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 2147483647,
    },
    'pastAttendeeCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 2147483647,
    },
    'repeatAttendeeCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 2147483647,
    },
    'advocateCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 2147483647,
    },
    'highImpactAdvocateCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 2147483647,
    },
    'linkedAccountCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 2147483647,
    },
    'importedContactCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 2147483647,
    },
    'whatsappOptInCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 2147483647,
    },
    'smsOptInCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 2147483647,
    },
    'truncated': <String, Object?>{
      'type': 'boolean',
    },
    'readiness': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'inApp',
        'whatsapp',
        'sms',
      ],
      'properties': <String, Object?>{
        'inApp': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'currentEventOnly',
          ],
        },
        'whatsapp': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'providerSetupRequired',
          ],
        },
        'sms': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'providerAndDltSetupRequired',
          ],
        },
      },
    },
  },
};
