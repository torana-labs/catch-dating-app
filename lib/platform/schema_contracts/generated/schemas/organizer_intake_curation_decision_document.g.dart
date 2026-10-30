// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_intake_curation_decisions.schema.json.

const schemaOrganizerIntakeCurationDecisionDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_intake_curation_decisions.schema.json',
  'title': 'OrganizerIntakeCurationDecisionDocument',
  'description': 'One manual organizer-intake curation operation stored at organizerIntakeCurationDecisions/{operationId}. Candidate evidence remains in operationRuns and operationWorkItems.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'organizerIntakeCurationDecisions',
  'x-firestore-path': 'organizerIntakeCurationDecisions/{operationId}',
  'x-document-id-field': 'operationId',
  'x-owner': 'adminRecordOrganizerCuration, adminCreateOrganizerDraftFromCandidate and adminApproveOrganizerListing callables',
  'required': <Object?>[
    'schemaVersion',
    'operationId',
    'operationType',
    'operationStatus',
    'reason',
    'reviewedByUid',
    'reviewedAt',
    'updatedAt',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'type': 'integer',
      'const': 1,
    },
    'operationId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'operationType': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'attach_surface',
        'create_entity_draft',
        'merge_entity',
        'split_surface',
        'suppress_entity',
        'surface_decision',
      ],
    },
    'operationStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'active',
        'superseded',
      ],
    },
    'entityId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'sourceEntityId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'targetEntityId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'surfaceId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'newEntityId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'sourceCandidateId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
    },
    'sourceWorkItemId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'sourceNormalizedKey': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 500,
    },
    'publicSlug': <String, Object?>{
      'type': 'string',
      'minLength': 3,
      'maxLength': 64,
      'pattern': '^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])\$',
      'description': 'Public route slug reserved when a candidate becomes an organizer draft. It is intentionally separate from entityId.',
    },
    'fieldProvenance': <String, Object?>{
      'type': 'array',
      'maxItems': 200,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'field',
          'artifactId',
          'contentHash',
          'locator',
          'extractedBy',
          'extractorVersion',
          'confidence',
        ],
        'properties': <String, Object?>{
          'field': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
          },
          'artifactId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'contentHash': <String, Object?>{
            'type': 'string',
            'pattern': '^[a-f0-9]{64}\$',
          },
          'locator': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 1000,
          },
          'extractedBy': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'deterministic',
              'model',
              'human',
            ],
          },
          'extractorVersion': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
          },
          'confidence': <String, Object?>{
            'type': <Object?>[
              'number',
              'null',
            ],
            'minimum': 0,
            'maximum': 1,
          },
        },
      },
      'description': 'Source artifact lineage for each field projected into the organizer draft.',
    },
    'decision': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'accept_primary',
        'accept_secondary',
        'reject_wrong_entity',
        'mark_ambiguous',
        'mark_historical',
      ],
    },
    'surface': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'surfaceId',
        'platform',
        'surfaceKind',
        'url',
        'normalizedKey',
        'role',
        'status',
        'confidence',
        'crawl',
        'evidenceRefs',
        'notes',
      ],
      'properties': <String, Object?>{
        'surfaceId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'platform': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'bookMyShow',
            'district',
            'instagram',
            'linkedin',
            'luma',
            'news',
            'officialWebsite',
            'partiful',
            'sortMyScene',
            'userReport',
            'other',
          ],
        },
        'surfaceKind': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'eventListing',
            'eventCalendar',
            'organizerProfile',
            'personProfile',
            'press',
            'socialProfile',
            'website',
            'wrongEntity',
          ],
        },
        'url': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'format': 'uri',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'normalizedKey': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 240,
        },
        'role': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'primary',
            'secondary',
            'backup',
            'historical',
            'ambiguous',
            'rejected',
          ],
        },
        'status': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'active',
            'candidate',
            'ambiguous',
            'historical',
            'rejected',
          ],
        },
        'confidence': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'entityMatch',
            'ownership',
            'city',
          ],
          'properties': <String, Object?>{
            'entityMatch': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'low',
                'medium',
                'high',
              ],
            },
            'ownership': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'low',
                'medium',
                'high',
              ],
            },
            'city': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'low',
                'medium',
                'high',
              ],
            },
          },
        },
        'crawl': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'eventDiscoveryStatus',
            'policy',
            'supportsEventExtraction',
          ],
          'properties': <String, Object?>{
            'eventDiscoveryStatus': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'disabled',
                'candidate',
                'approved',
                'paused',
              ],
            },
            'policy': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'manualOnly',
                'blocked',
                'apiPreferred',
              ],
            },
            'supportsEventExtraction': <String, Object?>{
              'type': 'boolean',
            },
          },
        },
        'evidenceRefs': <String, Object?>{
          'type': 'array',
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'type',
              'ref',
              'description',
            ],
            'properties': <String, Object?>{
              'type': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'hostDiscoveryRun',
                  'seedClub',
                  'userReportedSearchResult',
                  'manualNote',
                ],
              },
              'ref': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 240,
              },
              'description': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 400,
              },
            },
          },
        },
        'notes': <String, Object?>{
          'type': 'string',
          'maxLength': 500,
        },
      },
    },
    'reason': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 500,
    },
    'reviewedByUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'reviewedAt': <String, Object?>{
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
  },
  'definitions': <String, Object?>{
    'urlOrNull': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'format': 'uri',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'surface': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'surfaceId',
        'platform',
        'surfaceKind',
        'url',
        'normalizedKey',
        'role',
        'status',
        'confidence',
        'crawl',
        'evidenceRefs',
        'notes',
      ],
      'properties': <String, Object?>{
        'surfaceId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'platform': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'bookMyShow',
            'district',
            'instagram',
            'linkedin',
            'luma',
            'news',
            'officialWebsite',
            'partiful',
            'sortMyScene',
            'userReport',
            'other',
          ],
        },
        'surfaceKind': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'eventListing',
            'eventCalendar',
            'organizerProfile',
            'personProfile',
            'press',
            'socialProfile',
            'website',
            'wrongEntity',
          ],
        },
        'url': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'format': 'uri',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'normalizedKey': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 240,
        },
        'role': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'primary',
            'secondary',
            'backup',
            'historical',
            'ambiguous',
            'rejected',
          ],
        },
        'status': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'active',
            'candidate',
            'ambiguous',
            'historical',
            'rejected',
          ],
        },
        'confidence': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'entityMatch',
            'ownership',
            'city',
          ],
          'properties': <String, Object?>{
            'entityMatch': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'low',
                'medium',
                'high',
              ],
            },
            'ownership': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'low',
                'medium',
                'high',
              ],
            },
            'city': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'low',
                'medium',
                'high',
              ],
            },
          },
        },
        'crawl': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'eventDiscoveryStatus',
            'policy',
            'supportsEventExtraction',
          ],
          'properties': <String, Object?>{
            'eventDiscoveryStatus': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'disabled',
                'candidate',
                'approved',
                'paused',
              ],
            },
            'policy': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'manualOnly',
                'blocked',
                'apiPreferred',
              ],
            },
            'supportsEventExtraction': <String, Object?>{
              'type': 'boolean',
            },
          },
        },
        'evidenceRefs': <String, Object?>{
          'type': 'array',
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'type',
              'ref',
              'description',
            ],
            'properties': <String, Object?>{
              'type': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'hostDiscoveryRun',
                  'seedClub',
                  'userReportedSearchResult',
                  'manualNote',
                ],
              },
              'ref': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 240,
              },
              'description': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 400,
              },
            },
          },
        },
        'notes': <String, Object?>{
          'type': 'string',
          'maxLength': 500,
        },
      },
    },
    'evidenceRef': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'type',
        'ref',
        'description',
      ],
      'properties': <String, Object?>{
        'type': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'hostDiscoveryRun',
            'seedClub',
            'userReportedSearchResult',
            'manualNote',
          ],
        },
        'ref': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 240,
        },
        'description': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 400,
        },
      },
    },
  },
};
