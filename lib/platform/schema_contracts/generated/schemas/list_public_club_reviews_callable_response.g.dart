// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/list_public_club_reviews_response.schema.json.

const schemaListPublicClubReviewsCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/list_public_club_reviews_response.schema.json',
  'title': 'ListPublicClubReviewsCallableResponse',
  'description': 'Callable response returned by listPublicClubReviews for public organizer listing review hydration.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'reviews',
  ],
  'properties': <String, Object?>{
    'reviews': <String, Object?>{
      'type': 'array',
      'maxItems': 50,
      'items': <String, Object?>{
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
  },
  'definitions': <String, Object?>{
    'publicClubReview': <String, Object?>{
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
