// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/list_organizer_contact_merge_candidates_response.schema.json.

const schemaListOrganizerContactMergeCandidatesCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/list_organizer_contact_merge_candidates_response.schema.json',
  'title': 'ListOrganizerContactMergeCandidatesCallableResponse',
  'description': 'Manager-only, evidence-bearing duplicate candidates. No candidate is produced from a name match alone.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'candidates',
    'dismissedCandidates',
    'nextCursor',
    'truncated',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'candidates': <String, Object?>{
      'type': 'array',
      'maxItems': 50,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'candidateId',
          'contacts',
          'matchKinds',
          'confidence',
          'sourceKinds',
          'sharedEventIds',
          'sharedEventCount',
          'updatedAtMillis',
          'decisionState',
          'decisionRevision',
          'canReopen',
        ],
        'properties': <String, Object?>{
          'candidateId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'contacts': <String, Object?>{
            'type': 'array',
            'minItems': 2,
            'maxItems': 2,
            'items': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'contactId',
                'displayName',
                'phoneE164',
                'email',
                'linkedAccount',
                'primarySource',
                'revision',
              ],
              'properties': <String, Object?>{
                'contactId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                },
                'displayName': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 120,
                },
                'phoneE164': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                  'pattern': '^\\+[1-9][0-9]{7,14}\$',
                },
                'email': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                  'format': 'email',
                  'maxLength': 320,
                },
                'linkedAccount': <String, Object?>{
                  'type': 'boolean',
                },
                'primarySource': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'catchBooking',
                    'hostImport',
                    'hostManual',
                    'webOtp',
                    'providerSync',
                    'hostForm',
                  ],
                },
                'revision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                  'maximum': 9007199254740991,
                },
              },
            },
          },
          'matchKinds': <String, Object?>{
            'type': 'array',
            'minItems': 1,
            'maxItems': 4,
            'uniqueItems': true,
            'items': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'sameVerifiedUid',
                'sameVerifiedPhone',
                'sameImportedPhone',
                'sameEmail',
              ],
            },
          },
          'confidence': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'verified',
              'proposed',
            ],
          },
          'sourceKinds': <String, Object?>{
            'type': 'array',
            'minItems': 1,
            'maxItems': 6,
            'uniqueItems': true,
            'items': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'catchBooking',
                'hostImport',
                'hostManual',
                'webOtp',
                'providerSync',
                'hostForm',
              ],
            },
          },
          'sharedEventIds': <String, Object?>{
            'type': 'array',
            'maxItems': 20,
            'uniqueItems': true,
            'items': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
          },
          'sharedEventCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 1000000,
          },
          'updatedAtMillis': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'decisionState': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'none',
              'differentPeople',
              'reopened',
            ],
          },
          'decisionRevision': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 1,
            'maximum': 9007199254740991,
          },
          'canReopen': <String, Object?>{
            'type': 'boolean',
          },
        },
      },
    },
    'dismissedCandidates': <String, Object?>{
      'type': 'array',
      'maxItems': 50,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'candidateId',
          'contacts',
          'matchKinds',
          'confidence',
          'sourceKinds',
          'sharedEventIds',
          'sharedEventCount',
          'updatedAtMillis',
          'decisionState',
          'decisionRevision',
          'canReopen',
        ],
        'properties': <String, Object?>{
          'candidateId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'contacts': <String, Object?>{
            'type': 'array',
            'minItems': 2,
            'maxItems': 2,
            'items': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'contactId',
                'displayName',
                'phoneE164',
                'email',
                'linkedAccount',
                'primarySource',
                'revision',
              ],
              'properties': <String, Object?>{
                'contactId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                },
                'displayName': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 120,
                },
                'phoneE164': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                  'pattern': '^\\+[1-9][0-9]{7,14}\$',
                },
                'email': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                  'format': 'email',
                  'maxLength': 320,
                },
                'linkedAccount': <String, Object?>{
                  'type': 'boolean',
                },
                'primarySource': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'catchBooking',
                    'hostImport',
                    'hostManual',
                    'webOtp',
                    'providerSync',
                    'hostForm',
                  ],
                },
                'revision': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                  'maximum': 9007199254740991,
                },
              },
            },
          },
          'matchKinds': <String, Object?>{
            'type': 'array',
            'minItems': 1,
            'maxItems': 4,
            'uniqueItems': true,
            'items': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'sameVerifiedUid',
                'sameVerifiedPhone',
                'sameImportedPhone',
                'sameEmail',
              ],
            },
          },
          'confidence': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'verified',
              'proposed',
            ],
          },
          'sourceKinds': <String, Object?>{
            'type': 'array',
            'minItems': 1,
            'maxItems': 6,
            'uniqueItems': true,
            'items': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'catchBooking',
                'hostImport',
                'hostManual',
                'webOtp',
                'providerSync',
                'hostForm',
              ],
            },
          },
          'sharedEventIds': <String, Object?>{
            'type': 'array',
            'maxItems': 20,
            'uniqueItems': true,
            'items': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
          },
          'sharedEventCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 1000000,
          },
          'updatedAtMillis': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'decisionState': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'none',
              'differentPeople',
              'reopened',
            ],
          },
          'decisionRevision': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 1,
            'maximum': 9007199254740991,
          },
          'canReopen': <String, Object?>{
            'type': 'boolean',
          },
        },
      },
    },
    'nextCursor': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 512,
    },
    'truncated': <String, Object?>{
      'type': 'boolean',
    },
  },
  'definitions': <String, Object?>{
    'candidate': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'candidateId',
        'contacts',
        'matchKinds',
        'confidence',
        'sourceKinds',
        'sharedEventIds',
        'sharedEventCount',
        'updatedAtMillis',
        'decisionState',
        'decisionRevision',
        'canReopen',
      ],
      'properties': <String, Object?>{
        'candidateId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'contacts': <String, Object?>{
          'type': 'array',
          'minItems': 2,
          'maxItems': 2,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'contactId',
              'displayName',
              'phoneE164',
              'email',
              'linkedAccount',
              'primarySource',
              'revision',
            ],
            'properties': <String, Object?>{
              'contactId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'displayName': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 120,
              },
              'phoneE164': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'pattern': '^\\+[1-9][0-9]{7,14}\$',
              },
              'email': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'format': 'email',
                'maxLength': 320,
              },
              'linkedAccount': <String, Object?>{
                'type': 'boolean',
              },
              'primarySource': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'catchBooking',
                  'hostImport',
                  'hostManual',
                  'webOtp',
                  'providerSync',
                  'hostForm',
                ],
              },
              'revision': <String, Object?>{
                'type': 'integer',
                'minimum': 1,
                'maximum': 9007199254740991,
              },
            },
          },
        },
        'matchKinds': <String, Object?>{
          'type': 'array',
          'minItems': 1,
          'maxItems': 4,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'sameVerifiedUid',
              'sameVerifiedPhone',
              'sameImportedPhone',
              'sameEmail',
            ],
          },
        },
        'confidence': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'verified',
            'proposed',
          ],
        },
        'sourceKinds': <String, Object?>{
          'type': 'array',
          'minItems': 1,
          'maxItems': 6,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'catchBooking',
              'hostImport',
              'hostManual',
              'webOtp',
              'providerSync',
              'hostForm',
            ],
          },
        },
        'sharedEventIds': <String, Object?>{
          'type': 'array',
          'maxItems': 20,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
        },
        'sharedEventCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'updatedAtMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'decisionState': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'none',
            'differentPeople',
            'reopened',
          ],
        },
        'decisionRevision': <String, Object?>{
          'type': <Object?>[
            'integer',
            'null',
          ],
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'canReopen': <String, Object?>{
          'type': 'boolean',
        },
      },
    },
    'contact': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'contactId',
        'displayName',
        'phoneE164',
        'email',
        'linkedAccount',
        'primarySource',
        'revision',
      ],
      'properties': <String, Object?>{
        'contactId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'displayName': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
        },
        'phoneE164': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'pattern': '^\\+[1-9][0-9]{7,14}\$',
        },
        'email': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'format': 'email',
          'maxLength': 320,
        },
        'linkedAccount': <String, Object?>{
          'type': 'boolean',
        },
        'primarySource': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'catchBooking',
            'hostImport',
            'hostManual',
            'webOtp',
            'providerSync',
            'hostForm',
          ],
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
      },
    },
  },
};
