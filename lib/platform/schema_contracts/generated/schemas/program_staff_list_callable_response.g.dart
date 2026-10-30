// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/program_staff_list_response.schema.json.

const schemaProgramStaffListCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/program_staff_list_response.schema.json',
  'title': 'ProgramStaffListCallableResponse',
  'description': 'Program creator or explicitly authorized program administrator view of staff grants.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'programId',
    'members',
    'nextCursor',
  ],
  'properties': <String, Object?>{
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'members': <String, Object?>{
      'type': 'array',
      'maxItems': 50,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'uid',
          'displayName',
          'phoneLastFour',
          'duties',
          'status',
          'expiresAtMillis',
          'revision',
        ],
        'properties': <String, Object?>{
          'uid': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'displayName': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 120,
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
            'description': 'Null after archive anonymization scrubs staff identity.',
          },
          'phoneLastFour': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'string',
                'pattern': '^[0-9]{4}\$',
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
            'description': 'Null after archive anonymization.',
          },
          'duties': <String, Object?>{
            'type': 'array',
            'items': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'duty',
                'pickupPointIds',
                'hotelIds',
                'expiresAtMillis',
              ],
              'properties': <String, Object?>{
                'duty': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'programAdmin',
                    'programCoordinator',
                    'guestRelations',
                    'communications',
                    'functionCheckIn',
                    'functionLead',
                    'airportGreeter',
                    'hotelDesk',
                    'transportDispatcher',
                    'reconciliationViewer',
                    'stakeholderViewer',
                  ],
                },
                'pickupPointIds': <String, Object?>{
                  'type': 'array',
                  'maxItems': 32,
                  'uniqueItems': true,
                  'items': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                  },
                  'description': 'Pickup restriction; empty means all program pickup points. Both resource restrictions must be met by the same assignment.',
                },
                'hotelIds': <String, Object?>{
                  'type': 'array',
                  'maxItems': 64,
                  'uniqueItems': true,
                  'items': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                  },
                  'description': 'Destination restriction; empty means all program hotels. Restrictions from different assignments never combine into new routes.',
                },
                'functionIds': <String, Object?>{
                  'type': 'array',
                  'maxItems': 64,
                  'uniqueItems': true,
                  'items': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                  },
                  'description': 'Function restriction for functionCheckIn and functionLead duties; absent or empty means all program functions. Optional on documents written before function-scoped duties existed.',
                },
                'expiresAtMillis': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                  'maximum': 9007199254740991,
                  'description': 'Exclusive expiry of this exact duty and resource scope. Independent of other assignments.',
                },
              },
            },
          },
          'status': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'active',
              'expired',
              'revoked',
              'approvalRequired',
            ],
          },
          'expiresAtMillis': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'revision': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
          },
        },
      },
    },
    'nextCursor': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
  },
};
