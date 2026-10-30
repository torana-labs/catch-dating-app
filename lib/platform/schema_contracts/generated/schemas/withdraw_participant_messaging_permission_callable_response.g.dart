// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/withdraw_participant_messaging_permission_response.schema.json.

const schemaWithdrawParticipantMessagingPermissionCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/withdraw_participant_messaging_permission_response.schema.json',
  'title': 'WithdrawParticipantMessagingPermissionCallableResponse',
  'description': 'Current permission after an idempotent withdrawal; later consent is never overwritten by an old retry.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'preference',
    'replayed',
  ],
  'properties': <String, Object?>{
    'preference': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'status',
        'receiptId',
      ],
      'properties': <String, Object?>{
        'status': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'unknown',
            'optedIn',
            'optedOut',
          ],
        },
        'purposes': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'properties': <String, Object?>{
            'eventOperations': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'status',
                'receiptId',
              ],
              'properties': <String, Object?>{
                'status': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'unknown',
                    'optedIn',
                    'optedOut',
                  ],
                },
                'receiptId': <String, Object?>{
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
              },
            },
            'marketing': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'status',
                'receiptId',
              ],
              'properties': <String, Object?>{
                'status': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'unknown',
                    'optedIn',
                    'optedOut',
                  ],
                },
                'receiptId': <String, Object?>{
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
              },
            },
          },
        },
        'receiptId': <String, Object?>{
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
      },
    },
    'replayed': <String, Object?>{
      'type': 'boolean',
    },
  },
};
