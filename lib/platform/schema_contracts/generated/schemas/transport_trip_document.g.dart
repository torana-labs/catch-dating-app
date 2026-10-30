// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/transport_trips.schema.json.

const schemaTransportTripDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/transport_trips.schema.json',
  'title': 'TransportTripDocument',
  'description': 'Server-owned dispatched vehicle record. The dispatch act is the reconciliation atom: plate, vendor, class and manifest are snapshotted at departure. Airport, hotel and finance surfaces read field-redacted projections.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'transportTrips',
  'x-firestore-path': 'transportTrips/{tripId}',
  'x-document-id-field': 'tripId',
  'x-owner': 'program dispatch and arrival callables',
  'required': <Object?>[
    'programId',
    'organizerId',
    'kind',
    'pickupPointId',
    'destinationHotelId',
    'destinationLabel',
    'vehicleClassId',
    'vendorId',
    'vendorNameSnapshot',
    'plateNormalized',
    'plateDisplay',
    'partyIds',
    'legIds',
    'passengerCount',
    'status',
    'departedAt',
    'departedByUid',
    'voidedByUid',
    'voidReason',
    'arrivedAt',
    'arrivedByUid',
    'rateSnapshot',
    'clientOperationId',
    'notes',
    'createdAt',
    'updatedAt',
    'revision',
  ],
  'properties': <String, Object?>{
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'kind': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'guestTransfer',
        'repositioning',
      ],
    },
    'pickupPointId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'destinationHotelId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'destinationLabel': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 140,
    },
    'vehicleClassId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 60,
      'description': 'Program vehicle-class catalog id snapshotted at dispatch.',
    },
    'vendorId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'vendorNameSnapshot': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 140,
    },
    'plateNormalized': <String, Object?>{
      'type': 'string',
      'minLength': 4,
      'maxLength': 16,
      'description': 'Uppercased plate with separators stripped; the reconciliation join key.',
    },
    'plateDisplay': <String, Object?>{
      'type': 'string',
      'minLength': 4,
      'maxLength': 16,
    },
    'partyIds': <String, Object?>{
      'type': 'array',
      'maxItems': 50,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 180,
      },
    },
    'legIds': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 50,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 180,
      },
    },
    'passengerCount': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 200,
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'enRoute',
        'arrived',
        'cancelled',
        'voided',
      ],
    },
    'departedAt': <String, Object?>{
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
    'departedByUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'arrivedAt': <String, Object?>{
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
    'voidedByUid': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
      'description': 'Dispatcher/manager who voided the trip.',
    },
    'voidReason': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 280,
      'description': 'Required reason recorded when a dispatch is voided; reviewed in reconciliation.',
    },
    'arrivedByUid': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'rateSnapshot': <String, Object?>{
      'type': <Object?>[
        'object',
        'null',
      ],
      'additionalProperties': false,
      'required': <Object?>[
        'currency',
        'amountMinor',
        'pricingKind',
      ],
      'properties': <String, Object?>{
        'currency': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Z]{3}\$',
        },
        'amountMinor': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'pricingKind': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'perTrip',
            'perVehicleDay',
            'custom',
          ],
        },
      },
      'description': 'Optional agreed rate frozen at dispatch; commercial terms ship with the reconciliation slice.',
    },
    'clientOperationId': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 120,
      'description': 'Idempotent dispatch key; a replay returns the original trip.',
    },
    'notes': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 280,
    },
    'createdAt': <String, Object?>{
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
    'updatedAt': <String, Object?>{
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
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'dispatchSnapshot': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'description': 'Facts captured atomically when dispatch is recorded, including offline departures recorded later. Absent only on legacy trips; never reconstructed as historical evidence from current records.',
      'required': <Object?>[
        'recordedAt',
        'vehicleClass',
        'manifest',
      ],
      'properties': <String, Object?>{
        'recordedAt': <String, Object?>{
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
        'vehicleClass': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'id',
            'label',
            'passengerCapacity',
            'luggageCapacity',
            'capabilities',
            'sortOrder',
          ],
          'properties': <String, Object?>{
            'id': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 60,
              'pattern': '^[a-z0-9][a-z0-9_-]{0,59}\$',
            },
            'label': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 60,
            },
            'passengerCapacity': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 200,
            },
            'luggageCapacity': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 500,
            },
            'capabilities': <String, Object?>{
              'type': 'array',
              'maxItems': 12,
              'uniqueItems': true,
              'items': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'wheelchairAccessible',
                  'extraLuggage',
                  'childSeat',
                ],
              },
            },
            'sortOrder': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 1000,
            },
          },
        },
        'manifest': <String, Object?>{
          'type': 'array',
          'minItems': 1,
          'maxItems': 50,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'legId',
              'guestId',
              'guestDisplayName',
              'partyId',
              'passengers',
              'luggageUnits',
            ],
            'properties': <String, Object?>{
              'legId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'guestId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'guestDisplayName': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 140,
              },
              'partyId': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'minLength': 1,
                'maxLength': 180,
              },
              'passengers': <String, Object?>{
                'type': 'integer',
                'minimum': 1,
                'maximum': 200,
              },
              'luggageUnits': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 500,
              },
            },
          },
        },
      },
    },
    'anonymizedAt': <String, Object?>{
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
      'description': 'Identity/free-text scrub marker set by the archive retention sweep; null until anonymized.',
    },
  },
};
