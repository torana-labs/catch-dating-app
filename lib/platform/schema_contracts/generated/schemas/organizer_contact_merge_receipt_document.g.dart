// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_contact_merge_receipts.schema.json.

const schemaOrganizerContactMergeReceiptDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_contact_merge_receipts.schema.json',
  'title': 'OrganizerContactMergeReceiptDocument',
  'description': 'Immutable evidence for a manager-confirmed organizer contact merge or its reversal.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'organizerContactMergeReceipts',
  'x-firestore-path': 'organizerContactMergeReceipts/{receiptId}',
  'x-document-id-field': 'receiptId',
  'x-owner': 'organizer contact merge and unmerge callables',
  'required': <Object?>[
    'organizerId',
    'operation',
    'survivorContactId',
    'sourceContactId',
    'evidence',
    'conflicts',
    'actorUid',
    'survivorRevision',
    'sourceRevision',
    'movedEdgeIds',
    'movedIdentityEvidenceIds',
    'movedClaimIds',
    'movedOriginIds',
    'movedEdgeCount',
    'movedIdentityEvidenceCount',
    'movedClaimCount',
    'movedOriginCount',
    'idempotencyKey',
    'reversalOfReceiptId',
    'createdAt',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'operation': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'merge',
        'unmerge',
      ],
    },
    'survivorContactId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'sourceContactId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'evidence': <String, Object?>{
      'type': 'array',
      'maxItems': 20,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'enum': <Object?>[
          'sameVerifiedUid',
          'sameVerifiedPhone',
          'sameImportedPhone',
          'sameEmail',
          'managerConfirmed',
        ],
      },
    },
    'conflicts': <String, Object?>{
      'type': 'array',
      'maxItems': 20,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'maxLength': 120,
      },
    },
    'actorUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'survivorRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'sourceRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'movedEdgeIds': <String, Object?>{
      'type': 'array',
      'maxItems': 400,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 180,
      },
    },
    'movedIdentityEvidenceIds': <String, Object?>{
      'type': 'array',
      'maxItems': 400,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 180,
      },
    },
    'movedClaimIds': <String, Object?>{
      'type': 'array',
      'maxItems': 400,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 180,
      },
    },
    'movedOriginIds': <String, Object?>{
      'type': 'array',
      'maxItems': 400,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 180,
      },
    },
    'movedEdgeCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 400,
    },
    'movedIdentityEvidenceCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 400,
    },
    'movedClaimCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 400,
    },
    'movedOriginCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 400,
    },
    'idempotencyKey': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 120,
    },
    'reversalOfReceiptId': <String, Object?>{
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
    'seatMoves': <String, Object?>{
      'type': 'array',
      'maxItems': 200,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'eventId',
          'aliasId',
          'kind',
          'valueHash',
          'before',
          'after',
        ],
        'properties': <String, Object?>{
          'eventId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'aliasId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'kind': <String, Object?>{
            'enum': <Object?>[
              'contact',
              'contactOrigin',
            ],
          },
          'valueHash': <String, Object?>{
            'type': 'string',
            'pattern': '^[0-9a-f]{64}\$',
          },
          'before': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'canonicalKey',
                  'identityRevision',
                  'migrationRevision',
                  'state',
                ],
                'properties': <String, Object?>{
                  'canonicalKey': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                  },
                  'identityRevision': <String, Object?>{
                    'type': 'integer',
                    'minimum': 1,
                    'maximum': 9007199254740991,
                  },
                  'migrationRevision': <String, Object?>{
                    'type': 'integer',
                    'minimum': 1,
                    'maximum': 9007199254740991,
                  },
                  'state': <String, Object?>{
                    'const': 'ready',
                  },
                },
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
          'after': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'canonicalKey',
              'identityRevision',
              'migrationRevision',
              'state',
            ],
            'properties': <String, Object?>{
              'canonicalKey': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'identityRevision': <String, Object?>{
                'type': 'integer',
                'minimum': 1,
                'maximum': 9007199254740991,
              },
              'migrationRevision': <String, Object?>{
                'type': 'integer',
                'minimum': 1,
                'maximum': 9007199254740991,
              },
              'state': <String, Object?>{
                'const': 'ready',
              },
            },
          },
        },
      },
    },
    'seatEventGuards': <String, Object?>{
      'type': 'array',
      'maxItems': 100,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'eventId',
          'ledgerRevision',
          'migrationRevision',
          'sourceReservation',
          'survivorReservation',
          'aliasIdsBefore',
          'sourceAlias',
          'survivorAlias',
        ],
        'properties': <String, Object?>{
          'eventId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'ledgerRevision': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 9007199254740991,
          },
          'migrationRevision': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 9007199254740991,
          },
          'sourceReservation': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'canonicalKey',
                  'identityRevision',
                  'revision',
                  'active',
                ],
                'properties': <String, Object?>{
                  'canonicalKey': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                  },
                  'identityRevision': <String, Object?>{
                    'type': 'integer',
                    'minimum': 1,
                    'maximum': 9007199254740991,
                  },
                  'revision': <String, Object?>{
                    'type': 'integer',
                    'minimum': 1,
                    'maximum': 9007199254740991,
                  },
                  'active': <String, Object?>{
                    'type': 'boolean',
                  },
                },
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
          'survivorReservation': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'canonicalKey',
                  'identityRevision',
                  'revision',
                  'active',
                ],
                'properties': <String, Object?>{
                  'canonicalKey': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                  },
                  'identityRevision': <String, Object?>{
                    'type': 'integer',
                    'minimum': 1,
                    'maximum': 9007199254740991,
                  },
                  'revision': <String, Object?>{
                    'type': 'integer',
                    'minimum': 1,
                    'maximum': 9007199254740991,
                  },
                  'active': <String, Object?>{
                    'type': 'boolean',
                  },
                },
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
          'aliasIdsBefore': <String, Object?>{
            'type': 'array',
            'maxItems': 200,
            'uniqueItems': true,
            'items': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
          },
          'sourceAlias': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'canonicalKey',
                  'identityRevision',
                  'migrationRevision',
                  'state',
                ],
                'properties': <String, Object?>{
                  'canonicalKey': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                  },
                  'identityRevision': <String, Object?>{
                    'type': 'integer',
                    'minimum': 1,
                    'maximum': 9007199254740991,
                  },
                  'migrationRevision': <String, Object?>{
                    'type': 'integer',
                    'minimum': 1,
                    'maximum': 9007199254740991,
                  },
                  'state': <String, Object?>{
                    'const': 'ready',
                  },
                },
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
          'survivorAlias': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'canonicalKey',
                  'identityRevision',
                  'migrationRevision',
                  'state',
                ],
                'properties': <String, Object?>{
                  'canonicalKey': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                  },
                  'identityRevision': <String, Object?>{
                    'type': 'integer',
                    'minimum': 1,
                    'maximum': 9007199254740991,
                  },
                  'migrationRevision': <String, Object?>{
                    'type': 'integer',
                    'minimum': 1,
                    'maximum': 9007199254740991,
                  },
                  'state': <String, Object?>{
                    'const': 'ready',
                  },
                },
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
        },
      },
    },
    'seatAdmissionGuards': <String, Object?>{
      'type': 'array',
      'maxItems': 200,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'eventId',
          'responseId',
          'ownershipId',
          'receiptId',
        ],
        'properties': <String, Object?>{
          'eventId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'responseId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'ownershipId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
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
    'survivorOriginIdsBefore': <String, Object?>{
      'type': 'array',
      'maxItems': 400,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 180,
      },
    },
    'sourceOriginAliasIdsBefore': <String, Object?>{
      'type': 'array',
      'maxItems': 200,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 180,
      },
    },
  },
};
