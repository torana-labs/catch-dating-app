// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/create_public_organizer_review_response.schema.json.

const schemaCreatePublicOrganizerReviewCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/create_public_organizer_review_response.schema.json',
  'title': 'CreatePublicOrganizerReviewCallableResponse',
  'description': 'Callable response returned by createPublicOrganizerReview after a public organizer review is accepted.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'reviewId',
    'review',
  ],
  'properties': <String, Object?>{
    'reviewId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
    },
    'review': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'id',
        'reviewerName',
        'rating',
        'comment',
        'createdAt',
        'verificationStatus',
        'source',
        'moderationStatus',
        'isAnonymous',
        'ownerResponse',
      ],
      'properties': <String, Object?>{
        'id': <String, Object?>{
          'type': 'string',
          'minLength': 1,
        },
        'reviewerName': <String, Object?>{
          'type': 'string',
          'minLength': 1,
        },
        'rating': <String, Object?>{
          'type': 'number',
          'minimum': 0,
          'maximum': 5,
        },
        'comment': <String, Object?>{
          'type': 'string',
        },
        'createdAt': <String, Object?>{
          'type': 'string',
          'minLength': 1,
        },
        'verificationStatus': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'verified',
            'unverified',
          ],
        },
        'source': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'catchEvent',
            'publicListing',
          ],
        },
        'moderationStatus': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'published',
            'pending',
          ],
        },
        'isAnonymous': <String, Object?>{
          'type': 'boolean',
        },
        'ownerResponse': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'hostName',
                'hostAvatarUrl',
                'message',
                'updatedAt',
              ],
              'properties': <String, Object?>{
                'hostName': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
                'hostAvatarUrl': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                  'format': 'uri',
                },
                'message': <String, Object?>{
                  'type': 'string',
                },
                'updatedAt': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
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
  'definitions': <String, Object?>{
    'publicOrganizerReview': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'id',
        'reviewerName',
        'rating',
        'comment',
        'createdAt',
        'verificationStatus',
        'source',
        'moderationStatus',
        'isAnonymous',
        'ownerResponse',
      ],
      'properties': <String, Object?>{
        'id': <String, Object?>{
          'type': 'string',
          'minLength': 1,
        },
        'reviewerName': <String, Object?>{
          'type': 'string',
          'minLength': 1,
        },
        'rating': <String, Object?>{
          'type': 'number',
          'minimum': 0,
          'maximum': 5,
        },
        'comment': <String, Object?>{
          'type': 'string',
        },
        'createdAt': <String, Object?>{
          'type': 'string',
          'minLength': 1,
        },
        'verificationStatus': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'verified',
            'unverified',
          ],
        },
        'source': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'catchEvent',
            'publicListing',
          ],
        },
        'moderationStatus': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'published',
            'pending',
          ],
        },
        'isAnonymous': <String, Object?>{
          'type': 'boolean',
        },
        'ownerResponse': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'hostName',
                'hostAvatarUrl',
                'message',
                'updatedAt',
              ],
              'properties': <String, Object?>{
                'hostName': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                },
                'hostAvatarUrl': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                  'format': 'uri',
                },
                'message': <String, Object?>{
                  'type': 'string',
                },
                'updatedAt': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
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
    'ownerResponse': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'hostName',
        'hostAvatarUrl',
        'message',
        'updatedAt',
      ],
      'properties': <String, Object?>{
        'hostName': <String, Object?>{
          'type': 'string',
          'minLength': 1,
        },
        'hostAvatarUrl': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'format': 'uri',
        },
        'message': <String, Object?>{
          'type': 'string',
        },
        'updatedAt': <String, Object?>{
          'type': 'string',
          'minLength': 1,
        },
      },
    },
  },
};
