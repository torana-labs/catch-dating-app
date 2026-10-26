// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_claim_verifications.schema.json.

const schemaOrganizerClaimVerificationDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_claim_verifications.schema.json',
  'title': 'OrganizerClaimVerificationDocument',
  'description': 'One signed-in user\'s attempt to prove they run an organizer listing, stored at organizerClaimVerifications/{attemptId}. The requester reads their own attempt to show its code and to follow its status; a verified attempt records the evidence and the claim request it approved.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'organizerClaimVerifications',
  'x-firestore-path': 'organizerClaimVerifications/{attemptId}',
  'x-document-id-field': 'attemptId',
  'x-owner': 'startOrganizerClaimVerification callable and instagramClaimWebhook',
  'required': <Object?>[
    'attemptId',
    'organizerId',
    'requesterUid',
    'method',
    'status',
    'code',
    'proofTarget',
    'createdAt',
    'updatedAt',
    'expiresAt',
    'verifiedAt',
    'claimRequestId',
    'evidence',
    'lastRejection',
  ],
  'properties': <String, Object?>{
    'attemptId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'requesterUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'method': <String, Object?>{
      'description': 'instagramMessage: the organiser sends the code to Catch\'s Instagram account from the listing\'s handle. lumaDescription: the organiser puts the code in the listing\'s Luma calendar description.',
      'type': 'string',
      'enum': <Object?>[
        'instagramMessage',
        'lumaDescription',
      ],
      'x-catch-ownership': 'callable-owned',
    },
    'status': <String, Object?>{
      'description': 'awaitingProof until the proof arrives. An attempt still awaitingProof after expiresAt has expired; readers treat it so.',
      'type': 'string',
      'enum': <Object?>[
        'awaitingProof',
        'verified',
        'expired',
        'superseded',
      ],
      'x-catch-ownership': 'callable-owned',
    },
    'code': <String, Object?>{
      'description': 'The one-time code the requester shows the proof surface. Only the requester and the server can read it.',
      'type': 'string',
      'pattern': '^[0-9]{6}\$',
      'x-catch-ownership': 'callable-owned',
    },
    'proofTarget': <String, Object?>{
      'description': 'Where the proof must come from: the listing\'s Instagram username without @, or its Luma calendar URL.',
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
      'x-catch-ownership': 'callable-owned',
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
      'x-catch-ownership': 'callable-owned',
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
      'x-catch-ownership': 'callable-owned',
    },
    'expiresAt': <String, Object?>{
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
      'x-catch-ownership': 'callable-owned',
    },
    'verifiedAt': <String, Object?>{
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
      'x-catch-ownership': 'callable-owned',
    },
    'claimRequestId': <String, Object?>{
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
      'x-catch-ownership': 'callable-owned',
    },
    'evidence': <String, Object?>{
      'description': 'What proved the claim. Null until verified.',
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'source',
            'observedIdentity',
            'messageKey',
            'observedAt',
          ],
          'properties': <String, Object?>{
            'source': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'instagramMessage',
                'lumaDescription',
              ],
            },
            'observedIdentity': <String, Object?>{
              'description': 'The Instagram username Graph API returned for the sender, or the Luma calendar URL that showed the code.',
              'type': 'string',
              'minLength': 1,
              'maxLength': 240,
            },
            'messageKey': <String, Object?>{
              'description': 'SHA-256 of the Instagram message id. Null for Luma.',
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'pattern': '^[a-f0-9]{64}\$',
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'observedAt': <String, Object?>{
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
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
      'x-catch-ownership': 'callable-owned',
    },
    'lastRejection': <String, Object?>{
      'description': 'The latest proof that arrived and did not verify, so the claim page can say what to fix.',
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'reason',
            'at',
          ],
          'properties': <String, Object?>{
            'reason': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'wrongSender',
                'codeNotFound',
              ],
            },
            'at': <String, Object?>{
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
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
      'x-catch-ownership': 'callable-owned',
    },
  },
};
