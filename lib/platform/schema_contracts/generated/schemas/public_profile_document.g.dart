// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/public_profiles.schema.json.

const schemaPublicProfileDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/public_profiles.schema.json',
  'title': 'PublicProfileDocument',
  'description': 'Backend-owned public profile projection stored at publicProfiles/{uid}. The uid is the document id and is not stored in document data.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'publicProfiles',
  'x-firestore-path': 'publicProfiles/{uid}',
  'x-document-id-field': 'uid',
  'x-owner': 'syncPublicProfile trigger',
  'x-source': 'users/{uid}',
  'required': <Object?>[
    'name',
    'age',
    'gender',
    'profilePrompts',
    'profilePhotos',
    'activityPreferences',
  ],
  'properties': <String, Object?>{
    'name': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 80,
      'x-catch-ownership': 'trigger-owned',
    },
    'age': <String, Object?>{
      'type': 'integer',
      'minimum': 18,
      'maximum': 120,
      'x-catch-ownership': 'trigger-owned',
    },
    'gender': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'man',
        'woman',
        'nonBinary',
        'other',
      ],
      'x-catch-ownership': 'trigger-owned',
    },
    'synthetic': <String, Object?>{
      'type': 'boolean',
      'description': 'Internal demo seed marker used for cleanup and diagnostics.',
    },
    'seedPrefix': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
      'description': 'Internal demo seed prefix used for cleanup and diagnostics.',
    },
    'scenario': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
      'description': 'Internal demo seed scenario name used for cleanup and diagnostics.',
    },
    'demoOps': <String, Object?>{
      'type': 'boolean',
      'description': 'Internal demo-operations marker used for cleanup and diagnostics.',
    },
    'demoOpsId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'description': 'Internal demo-operations id used for cleanup and diagnostics.',
    },
    'demoOpsCommand': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 80,
      'description': 'Internal demo-operations command name used for cleanup and diagnostics.',
    },
    'profilePrompts': <String, Object?>{
      'type': 'array',
      'maxItems': 3,
      'items': <String, Object?>{
        'title': 'ProfilePromptAnswer',
        'description': 'One structured written profile prompt answer stored on users and publicProfiles.',
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'promptId',
          'prompt',
          'answer',
        ],
        'properties': <String, Object?>{
          'promptId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 80,
          },
          'prompt': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 140,
          },
          'answer': <String, Object?>{
            'type': 'string',
            'maxLength': 300,
          },
        },
        'x-catch-catalog': '../catalogs/profile_prompts.json',
      },
      'x-catch-ownership': 'trigger-owned',
    },
    'profilePhotos': <String, Object?>{
      'type': 'array',
      'maxItems': 6,
      'items': <String, Object?>{
        'title': 'ProfilePhoto',
        'description': 'Future canonical profile-photo object that groups display URLs, Firebase Storage object paths, prompt metadata, moderation state, order, and lifecycle timestamps.',
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'id',
          'url',
          'thumbnailUrl',
          'storagePath',
          'thumbnailStoragePath',
          'position',
          'createdAt',
          'updatedAt',
        ],
        'properties': <String, Object?>{
          'id': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 80,
            'pattern': '^[A-Za-z0-9_-]+\$',
          },
          'url': <String, Object?>{
            'type': 'string',
            'format': 'uri',
            'maxLength': 2048,
          },
          'thumbnailUrl': <String, Object?>{
            'type': 'string',
            'format': 'uri',
            'maxLength': 2048,
          },
          'storagePath': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 512,
            'pattern': '^[^/\\u0000][^\\u0000]*\$',
          },
          'thumbnailStoragePath': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 512,
            'pattern': '^[^/\\u0000][^\\u0000]*\$',
          },
          'prompt': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'title': 'PhotoPromptAnswer',
                'description': 'One optional display prompt selected for a profile photo slot. The caption field is legacy-only and should no longer be written by clients.',
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'photoIndex',
                  'promptId',
                  'prompt',
                ],
                'properties': <String, Object?>{
                  'photoIndex': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 5,
                  },
                  'promptId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 80,
                  },
                  'prompt': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 140,
                  },
                  'caption': <String, Object?>{
                    'type': 'string',
                    'maxLength': 140,
                    'deprecated': true,
                    'description': 'Legacy user-entered caption retained for compatibility with older documents.',
                  },
                },
                'x-catch-catalog': '../catalogs/photo_prompts.json',
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
          'moderation': <String, Object?>{
            'type': <Object?>[
              'object',
              'null',
            ],
            'additionalProperties': false,
            'required': <Object?>[
              'status',
            ],
            'properties': <String, Object?>{
              'status': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'pending',
                  'approved',
                  'rejected',
                ],
              },
              'reason': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 240,
              },
              'reviewedAt': <String, Object?>{
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
            },
          },
          'position': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 11,
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
        },
        'definitions': <String, Object?>{
          'storageObjectPath': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 512,
            'pattern': '^[^/\\u0000][^\\u0000]*\$',
          },
        },
        'x-storage-metadata': true,
        'x-future-field': 'profilePhotos',
        'x-migration-contract': '../migrations/profile_photos_storage.json',
      },
      'x-catch-ownership': 'trigger-owned',
    },
    'city': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
          'pattern': '^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
      'x-catch-ownership': 'trigger-owned',
    },
    'height': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 120,
      'maximum': 220,
      'x-catch-ownership': 'trigger-owned',
    },
    'occupation': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 120,
      'x-catch-ownership': 'trigger-owned',
    },
    'company': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 120,
      'x-catch-ownership': 'trigger-owned',
    },
    'education': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'enum': <Object?>[
        'highSchool',
        'someCollege',
        'bachelors',
        'masters',
        'phd',
        'tradeSchool',
        'other',
        null,
      ],
      'x-catch-ownership': 'trigger-owned',
    },
    'religion': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'enum': <Object?>[
        'hindu',
        'muslim',
        'christian',
        'sikh',
        'jain',
        'buddhist',
        'other',
        'nonReligious',
        null,
      ],
      'x-catch-ownership': 'trigger-owned',
    },
    'languages': <String, Object?>{
      'type': 'array',
      'maxItems': 20,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'enum': <Object?>[
          'english',
          'hindi',
          'marathi',
          'tamil',
          'telugu',
          'kannada',
          'bengali',
          'gujarati',
          'punjabi',
          'malayalam',
          'odia',
          'other',
        ],
      },
      'x-catch-ownership': 'trigger-owned',
    },
    'relationshipGoal': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'enum': <Object?>[
        'relationship',
        'casual',
        'marriage',
        'friendship',
        'unsure',
        null,
      ],
      'x-catch-ownership': 'trigger-owned',
    },
    'drinking': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'enum': <Object?>[
        'never',
        'socially',
        'often',
        null,
      ],
      'x-catch-ownership': 'trigger-owned',
    },
    'smoking': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'enum': <Object?>[
        'never',
        'occasionally',
        'often',
        null,
      ],
      'x-catch-ownership': 'trigger-owned',
    },
    'workout': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'enum': <Object?>[
        'never',
        'sometimes',
        'often',
        'everyday',
        null,
      ],
      'x-catch-ownership': 'trigger-owned',
    },
    'diet': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'enum': <Object?>[
        'omnivore',
        'vegetarian',
        'vegan',
        'jain',
        'other',
        null,
      ],
      'x-catch-ownership': 'trigger-owned',
    },
    'children': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'enum': <Object?>[
        'dontHave',
        'haveWantMore',
        'haveNoMore',
        'wantSomeday',
        'dontWant',
        null,
      ],
      'x-catch-ownership': 'trigger-owned',
    },
    'activityPreferences': <String, Object?>{
      'title': 'ActivityPreferences',
      'description': 'Per-activity user preferences. Running is the first migrated activity-specific preference object; other activity kinds can be added without new root profile fields.',
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'running',
      ],
      'properties': <String, Object?>{
        'running': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'paceMinSecsPerKm',
            'paceMaxSecsPerKm',
            'preferredDistances',
            'runningReasons',
            'preferredRunTimes',
            'version',
          ],
          'properties': <String, Object?>{
            'paceMinSecsPerKm': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
            },
            'paceMaxSecsPerKm': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
            },
            'preferredDistances': <String, Object?>{
              'type': 'array',
              'maxItems': 12,
              'uniqueItems': true,
              'items': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'fiveK',
                  'tenK',
                  'halfMarathon',
                  'marathon',
                ],
              },
            },
            'runningReasons': <String, Object?>{
              'type': 'array',
              'maxItems': 12,
              'uniqueItems': true,
              'items': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'fitness',
                  'community',
                  'mindfulness',
                  'challenge',
                  'weightLoss',
                  'raceTraining',
                  'social',
                ],
              },
            },
            'preferredRunTimes': <String, Object?>{
              'type': 'array',
              'maxItems': 8,
              'uniqueItems': true,
              'items': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'earlyMorning',
                  'morning',
                  'afternoon',
                  'evening',
                  'night',
                ],
              },
            },
            'version': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
            },
          },
        },
      },
      'x-catch-ownership': 'trigger-owned',
    },
  },
  'x-internal-demo-fields': <Object?>[
    'synthetic',
    'seedPrefix',
    'scenario',
    'demoOps',
    'demoOpsId',
    'demoOpsCommand',
  ],
  'x-legacy-tolerated-fields': <Object?>[
    'bio',
  ],
  'x-hidden-fields': <Object?>[
    'phoneNumber',
    'email',
    'instagramHandle',
    'latitude',
    'longitude',
    'interestedInGenders',
    'preferences',
  ],
};
