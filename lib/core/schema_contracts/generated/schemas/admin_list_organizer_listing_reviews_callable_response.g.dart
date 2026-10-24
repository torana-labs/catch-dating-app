// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_list_organizer_listing_reviews_response.schema.json.

const schemaAdminListOrganizerListingReviewsCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_list_organizer_listing_reviews_response.schema.json',
  'title': 'AdminListOrganizerListingReviewsCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'rows',
    'nextCursor',
    'unavailableCount',
    'canApprove',
  ],
  'properties': <String, Object?>{
    'rows': <String, Object?>{
      'type': 'array',
      'maxItems': 50,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'requestId',
          'listingWorkItemId',
          'kind',
          'submittedByRole',
          'submittedAt',
          'origin',
          'market',
          'suggestedSlug',
          'listing',
        ],
        'properties': <String, Object?>{
          'requestId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 240,
          },
          'listingWorkItemId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 240,
          },
          'kind': <String, Object?>{
            'enum': <Object?>[
              'nomination',
              'self_submission',
              'discovery',
            ],
          },
          'submittedByRole': <String, Object?>{
            'enum': <Object?>[
              'associate',
              'partner',
              'organizer',
              'system',
            ],
          },
          'submittedAt': <String, Object?>{
            'type': 'string',
            'format': 'date-time',
          },
          'origin': <String, Object?>{
            'enum': <Object?>[
              'admin_nomination',
              'sales_inbound_intent',
              'discovery_run',
              'none',
            ],
          },
          'market': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'slug',
              'marketId',
              'label',
              'open',
            ],
            'properties': <String, Object?>{
              'slug': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 80,
              },
              'marketId': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 96,
              },
              'label': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 160,
              },
              'open': <String, Object?>{
                'type': 'boolean',
                'description': 'Whether an organizer can be approved into this market as it stands.',
              },
            },
          },
          'suggestedSlug': <String, Object?>{
            'type': 'string',
            'minLength': 3,
            'maxLength': 64,
            'pattern': '^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])\$',
          },
          'listing': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'name',
              'description',
              'categories',
              'links',
              'gaps',
              'eventCount',
              'researchNeeded',
              'contentHash',
              'pageCount',
              'fetchedPageCount',
            ],
            'properties': <String, Object?>{
              'name': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 500,
              },
              'description': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 2000,
              },
              'categories': <String, Object?>{
                'type': 'array',
                'maxItems': 12,
                'items': <String, Object?>{
                  'type': 'string',
                  'maxLength': 80,
                },
              },
              'links': <String, Object?>{
                'type': 'array',
                'maxItems': 20,
                'items': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'platform',
                    'url',
                  ],
                  'properties': <String, Object?>{
                    'platform': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 80,
                    },
                    'url': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 2000,
                    },
                  },
                },
              },
              'gaps': <String, Object?>{
                'type': 'array',
                'maxItems': 40,
                'items': <String, Object?>{
                  'type': 'string',
                  'maxLength': 120,
                },
              },
              'eventCount': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
              },
              'researchNeeded': <String, Object?>{
                'type': 'boolean',
              },
              'contentHash': <String, Object?>{
                'type': 'string',
                'pattern': '^[a-f0-9]{64}\$',
              },
              'pageCount': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
              },
              'fetchedPageCount': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
              },
            },
          },
        },
      },
    },
    'nextCursor': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 400,
    },
    'unavailableCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'description': 'Completed requests on this page whose listing could not be read.',
    },
    'canApprove': <String, Object?>{
      'type': 'boolean',
      'description': 'Whether the caller\'s role may approve listings.',
    },
  },
};
