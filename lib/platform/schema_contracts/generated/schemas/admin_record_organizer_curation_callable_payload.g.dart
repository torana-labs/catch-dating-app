// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_record_organizer_curation_payload.schema.json.

const schemaAdminRecordOrganizerCurationCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_record_organizer_curation_payload.schema.json',
  'title': 'AdminRecordOrganizerCurationCallablePayload',
  'description': 'Callable payload accepted by adminRecordOrganizerCuration. This records one durable low-volume manual organizer-intake curation operation in Firestore.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'operationType',
    'reason',
  ],
  'properties': <String, Object?>{
    'operationId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'operationType': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'attach_surface',
        'merge_entity',
        'split_surface',
        'suppress_entity',
        'surface_decision',
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
