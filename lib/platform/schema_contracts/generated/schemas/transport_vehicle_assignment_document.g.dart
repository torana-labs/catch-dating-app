// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/transport_vehicle_assignments.schema.json.

const schemaTransportVehicleAssignmentDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/transport_vehicle_assignments.schema.json',
  'title': 'TransportVehicleAssignmentDocument',
  'description': 'Server-owned organizer-wide occupancy of a normalized vehicle plate. Dispatch reserves the vehicle atomically with its passenger assignments. Arrival or void releases only the matching trip; active reservations never expire by age.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'transportVehicleAssignments',
  'x-firestore-path': 'transportVehicleAssignments/{assignmentId}',
  'x-document-id-field': 'assignmentId',
  'x-owner': 'program dispatch transaction',
  'required': <Object?>[
    'organizerId',
    'plateNormalized',
    'programId',
    'tripId',
    'status',
    'assignedAt',
    'releasedAt',
    'revision',
  ],
  'properties': <String, Object?>{
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'tripId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'active',
        'released',
      ],
    },
    'assignedAt': <String, Object?>{
      'type': 'object',
      'description': 'Serialized Firestore Timestamp fixture shape.',
      'x-firestore-type': 'timestamp',
      'additionalProperties': false,
      'required': <Object?>[
        '_seconds',
        '_nanoseconds',
      ],
      'properties': <String, Object?>{
        '_seconds': <String, Object?>{
          'type': 'integer',
        },
        '_nanoseconds': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 999999999,
        },
      },
    },
    'releasedAt': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'description': 'Serialized Firestore Timestamp fixture shape.',
          'x-firestore-type': 'timestamp',
          'additionalProperties': false,
          'required': <Object?>[
            '_seconds',
            '_nanoseconds',
          ],
          'properties': <String, Object?>{
            '_seconds': <String, Object?>{
              'type': 'integer',
            },
            '_nanoseconds': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 999999999,
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'plateNormalized': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Z0-9]{4,16}\$',
    },
  },
};
