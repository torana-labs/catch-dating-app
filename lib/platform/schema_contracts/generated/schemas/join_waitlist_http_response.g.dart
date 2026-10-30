// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from http/join_waitlist_response.schema.json.

const schemaJoinWaitlistHTTPResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/http/join_waitlist_response.schema.json',
  'title': 'Join Waitlist HTTP Response',
  'description': 'Version 1 JSON response returned by the member waitlist and Host operating-application endpoint.',
  'oneOf': <Object?>[
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'ok',
        'alreadyJoined',
      ],
      'properties': <String, Object?>{
        'ok': <String, Object?>{
          'const': true,
        },
        'alreadyJoined': <String, Object?>{
          'type': 'boolean',
        },
        'hostLead': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'eventId',
            'isNew',
          ],
          'properties': <String, Object?>{
            'eventId': <String, Object?>{
              'type': 'string',
              'pattern': '^host_lead_[0-9]{13}_[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\$',
            },
            'isNew': <String, Object?>{
              'type': 'boolean',
            },
          },
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'error',
      ],
      'properties': <String, Object?>{
        'error': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 240,
        },
      },
    },
  ],
};
