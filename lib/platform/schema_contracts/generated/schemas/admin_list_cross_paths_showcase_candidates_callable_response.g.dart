// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_list_cross_paths_showcase_candidates_response.schema.json.

const schemaAdminListCrossPathsShowcaseCandidatesCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_list_cross_paths_showcase_candidates_response.schema.json',
  'title': 'AdminListCrossPathsShowcaseCandidatesCallableResponse',
  'description': 'Bounded admin-safe projection of public profiles and their server-only Cross Paths showcase review state.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'generatedAt',
    'candidates',
    'nextCursor',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'type': 'integer',
      'const': 1,
    },
    'generatedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'candidates': <String, Object?>{
      'type': 'array',
      'maxItems': 50,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'uid',
          'name',
          'age',
          'gender',
          'city',
          'photoUrls',
          'promptAnswers',
          'relationshipGoal',
          'automaticStatus',
          'automaticReasonCodes',
          'storedStatus',
          'effectiveStatus',
          'effectiveReasonCodes',
          'profileFingerprint',
          'reviewedByUid',
          'reviewedAt',
          'reviewNote',
        ],
        'properties': <String, Object?>{
          'uid': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'name': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'minLength': 1,
            'maxLength': 80,
          },
          'age': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 18,
            'maximum': 99,
          },
          'gender': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'minLength': 1,
            'maxLength': 40,
          },
          'city': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 80,
          },
          'photoUrls': <String, Object?>{
            'type': 'array',
            'maxItems': 6,
            'items': <String, Object?>{
              'type': 'string',
              'format': 'uri',
              'maxLength': 2048,
            },
          },
          'promptAnswers': <String, Object?>{
            'type': 'array',
            'maxItems': 3,
            'items': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'prompt',
                'answer',
              ],
              'properties': <String, Object?>{
                'prompt': <String, Object?>{
                  'type': 'string',
                  'maxLength': 140,
                },
                'answer': <String, Object?>{
                  'type': 'string',
                  'maxLength': 300,
                },
              },
            },
          },
          'relationshipGoal': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 80,
          },
          'automaticStatus': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'ready',
              'blocked',
            ],
          },
          'automaticReasonCodes': <String, Object?>{
            'type': 'array',
            'maxItems': 7,
            'uniqueItems': true,
            'items': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'insufficient_photos',
                'incomplete_prompts',
                'missing_relationship_goal',
                'broken_media',
                'photo_moderation_pending',
                'photo_moderation_rejected',
                'public_profile_missing',
                'profile_changed',
                'reviewer_hold',
                'manual_pause',
              ],
            },
          },
          'storedStatus': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'enum': <Object?>[
              'eligible',
              'needsReview',
              'paused',
              null,
            ],
          },
          'effectiveStatus': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'eligible',
              'needsReview',
              'paused',
            ],
          },
          'effectiveReasonCodes': <String, Object?>{
            'type': 'array',
            'maxItems': 12,
            'uniqueItems': true,
            'items': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'insufficient_photos',
                'incomplete_prompts',
                'missing_relationship_goal',
                'broken_media',
                'photo_moderation_pending',
                'photo_moderation_rejected',
                'public_profile_missing',
                'profile_changed',
                'reviewer_hold',
                'manual_pause',
              ],
            },
          },
          'profileFingerprint': <String, Object?>{
            'type': 'string',
            'pattern': '^[a-f0-9]{64}\$',
          },
          'reviewedByUid': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 128,
          },
          'reviewedAt': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'format': 'date-time',
          },
          'reviewNote': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 1000,
          },
        },
      },
    },
    'nextCursor': <String, Object?>{
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
  'definitions': <String, Object?>{
    'reasonCode': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'insufficient_photos',
        'incomplete_prompts',
        'missing_relationship_goal',
        'broken_media',
        'photo_moderation_pending',
        'photo_moderation_rejected',
        'public_profile_missing',
        'profile_changed',
        'reviewer_hold',
        'manual_pause',
      ],
    },
    'candidate': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'uid',
        'name',
        'age',
        'gender',
        'city',
        'photoUrls',
        'promptAnswers',
        'relationshipGoal',
        'automaticStatus',
        'automaticReasonCodes',
        'storedStatus',
        'effectiveStatus',
        'effectiveReasonCodes',
        'profileFingerprint',
        'reviewedByUid',
        'reviewedAt',
        'reviewNote',
      ],
      'properties': <String, Object?>{
        'uid': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'name': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'minLength': 1,
          'maxLength': 80,
        },
        'age': <String, Object?>{
          'type': <Object?>[
            'integer',
            'null',
          ],
          'minimum': 18,
          'maximum': 99,
        },
        'gender': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'minLength': 1,
          'maxLength': 40,
        },
        'city': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 80,
        },
        'photoUrls': <String, Object?>{
          'type': 'array',
          'maxItems': 6,
          'items': <String, Object?>{
            'type': 'string',
            'format': 'uri',
            'maxLength': 2048,
          },
        },
        'promptAnswers': <String, Object?>{
          'type': 'array',
          'maxItems': 3,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'prompt',
              'answer',
            ],
            'properties': <String, Object?>{
              'prompt': <String, Object?>{
                'type': 'string',
                'maxLength': 140,
              },
              'answer': <String, Object?>{
                'type': 'string',
                'maxLength': 300,
              },
            },
          },
        },
        'relationshipGoal': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 80,
        },
        'automaticStatus': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'ready',
            'blocked',
          ],
        },
        'automaticReasonCodes': <String, Object?>{
          'type': 'array',
          'maxItems': 7,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'insufficient_photos',
              'incomplete_prompts',
              'missing_relationship_goal',
              'broken_media',
              'photo_moderation_pending',
              'photo_moderation_rejected',
              'public_profile_missing',
              'profile_changed',
              'reviewer_hold',
              'manual_pause',
            ],
          },
        },
        'storedStatus': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'enum': <Object?>[
            'eligible',
            'needsReview',
            'paused',
            null,
          ],
        },
        'effectiveStatus': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'eligible',
            'needsReview',
            'paused',
          ],
        },
        'effectiveReasonCodes': <String, Object?>{
          'type': 'array',
          'maxItems': 12,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'insufficient_photos',
              'incomplete_prompts',
              'missing_relationship_goal',
              'broken_media',
              'photo_moderation_pending',
              'photo_moderation_rejected',
              'public_profile_missing',
              'profile_changed',
              'reviewer_hold',
              'manual_pause',
            ],
          },
        },
        'profileFingerprint': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'reviewedByUid': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 128,
        },
        'reviewedAt': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'format': 'date-time',
        },
        'reviewNote': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 1000,
        },
      },
    },
  },
};
