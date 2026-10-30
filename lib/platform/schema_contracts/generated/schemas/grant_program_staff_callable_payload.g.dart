// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/grant_program_staff_payload.schema.json.

const schemaGrantProgramStaffCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/grant_program_staff_payload.schema.json',
  'title': 'GrantProgramStaffCallablePayload',
  'description': 'Grant named, station-scoped program duties to a signed-in account. Manager-only.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'programId',
    'phoneNumber',
    'duties',
    'expiresAtMillis',
  ],
  'properties': <String, Object?>{
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'phoneNumber': <String, Object?>{
      'type': 'string',
      'minLength': 4,
      'maxLength': 32,
    },
    'duties': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 8,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'duty',
          'pickupPointIds',
          'hotelIds',
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
        },
      },
    },
    'expiresAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
  },
};
