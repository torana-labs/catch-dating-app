// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/public_route_reservations.schema.json.

const schemaPublicRouteReservationDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/public_route_reservations.schema.json',
  'title': 'PublicRouteReservationDocument',
  'description': 'Server-owned reservation for a public website route. Stored at publicRouteReservations/{routeKey}; routeKey is derived from the normalized route path so route allocation is deterministic and transactionally claimable.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'publicRouteReservations',
  'x-firestore-path': 'publicRouteReservations/{routeKey}',
  'x-document-id-field': 'routeKey',
  'x-owner': 'admin organizer publishing callables',
  'required': <Object?>[
    'routeKey',
    'routePath',
    'routeKind',
    'routeSegments',
    'status',
    'ownerType',
    'ownerCollection',
    'ownerId',
    'targetPath',
    'slug',
    'citySlug',
    'createdAt',
    'updatedAt',
    'lastVerifiedAt',
    'lastVerifiedByUid',
    'lastVerifiedSource',
  ],
  'properties': <String, Object?>{
    'routeKey': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 220,
      'pattern': '^[a-z0-9-]+(?:__[a-z0-9-]+)*\$',
      'description': 'Deterministic document id derived from routePath by removing leading/trailing slash and replacing route separators with double underscores.',
      'x-catch-ownership': 'server-only',
    },
    'routePath': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
      'pattern': '^/organizers/([a-z0-9-]+/)?[a-z0-9-]+/\$',
      'x-catch-ownership': 'server-only',
    },
    'routeKind': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'organizerCanonical',
      ],
      'x-catch-ownership': 'server-only',
    },
    'routeSegments': <String, Object?>{
      'type': 'array',
      'minItems': 2,
      'maxItems': 3,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 80,
        'pattern': '^[a-z0-9-]+\$',
      },
      'x-catch-ownership': 'server-only',
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'active',
        'released',
      ],
      'x-catch-ownership': 'server-only',
    },
    'ownerType': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'club',
        'organizer',
      ],
      'x-catch-ownership': 'server-only',
    },
    'ownerCollection': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'clubs',
        'organizers',
      ],
      'x-catch-ownership': 'server-only',
    },
    'ownerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'targetPath': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 260,
      'pattern': '^(clubs|organizers)/[^/]+\$',
      'x-catch-ownership': 'server-only',
    },
    'slug': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
      'pattern': '^[a-z0-9-]+\$',
      'x-catch-ownership': 'server-only',
    },
    'citySlug': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 120,
      'pattern': '^[a-z0-9-]+\$',
      'x-catch-ownership': 'server-only',
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
      'x-catch-ownership': 'server-only',
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
      'x-catch-ownership': 'server-only',
    },
    'lastVerifiedAt': <String, Object?>{
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
      'x-catch-ownership': 'server-only',
    },
    'lastVerifiedByUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'lastVerifiedSource': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'adminUpdateClubDetails',
        'adminSetClubIndexStatus',
        'adminUpdateOrganizerDetails',
        'adminSetOrganizerIndexStatus',
        'adminCreateOrganizerDraftFromCandidate',
        'adminApproveOrganizerListing',
        'createOrganizer',
        'clubsToOrganizersMigration',
      ],
      'x-catch-ownership': 'server-only',
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
      'x-catch-ownership': 'server-only',
    },
    'releasedByUid': <String, Object?>{
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
      'x-catch-ownership': 'server-only',
    },
    'replacementRoutePath': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 240,
      'pattern': '^/organizers/([a-z0-9-]+/)?[a-z0-9-]+/\$',
      'x-catch-ownership': 'server-only',
    },
  },
};
