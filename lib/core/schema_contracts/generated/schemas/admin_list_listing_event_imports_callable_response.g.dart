// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_list_listing_event_imports_response.schema.json.

const schemaAdminListListingEventImportsCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_list_listing_event_imports_response.schema.json',
  'title': 'AdminListListingEventImportsCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'policy',
    'rows',
    'nextCursor',
    'unavailableCount',
  ],
  'properties': <String, Object?>{
    'policy': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'mode',
        'policyVersion',
      ],
      'properties': <String, Object?>{
        'mode': <String, Object?>{
          'enum': <Object?>[
            'staff_review',
            'auto_publish_approved_organizers',
          ],
        },
        'policyVersion': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
        },
      },
    },
    'rows': <String, Object?>{
      'type': 'array',
      'maxItems': 10,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'intakeRequestId',
          'listingId',
          'approvedAt',
          'organizer',
          'events',
        ],
        'properties': <String, Object?>{
          'intakeRequestId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 240,
          },
          'listingId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 240,
          },
          'approvedAt': <String, Object?>{
            'type': 'string',
            'minLength': 10,
            'maxLength': 40,
          },
          'organizer': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'organizerId',
              'name',
              'canonicalPath',
              'appVisibility',
              'pagePublished',
            ],
            'properties': <String, Object?>{
              'organizerId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'name': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 240,
              },
              'canonicalPath': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 240,
              },
              'appVisibility': <String, Object?>{
                'enum': <Object?>[
                  'hidden',
                  'discoverable',
                ],
              },
              'pagePublished': <String, Object?>{
                'type': 'boolean',
              },
            },
          },
          'events': <String, Object?>{
            'type': 'array',
            'maxItems': 60,
            'items': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'eventWorkItemId',
                'eventId',
                'title',
                'startAt',
                'endAt',
                'venue',
                'address',
                'platform',
                'sourceUrl',
                'priceLabel',
                'state',
                'publishedBy',
                'blockers',
                'resolvableBlockers',
                'automatedFindings',
              ],
              'properties': <String, Object?>{
                'eventWorkItemId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                },
                'eventId': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                  'maxLength': 180,
                },
                'title': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                  'maxLength': 500,
                },
                'startAt': <String, Object?>{
                  'type': 'string',
                  'minLength': 10,
                  'maxLength': 40,
                },
                'endAt': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                  'maxLength': 40,
                },
                'venue': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                  'maxLength': 500,
                },
                'address': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                  'maxLength': 500,
                },
                'platform': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 80,
                },
                'sourceUrl': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 2000,
                },
                'priceLabel': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                  'maxLength': 120,
                },
                'state': <String, Object?>{
                  'enum': <Object?>[
                    'published',
                    'withdrawn',
                    'ready',
                    'needs_resolution',
                    'blocked',
                  ],
                  'description': 'published: live on the website. withdrawn: staff took it down. ready: a staff member can publish it with the checklist. needs_resolution: a staff member must resolve or waive resolvableBlockers first. blocked: it cannot publish (ended, cancelled, platform not supported, organizer page unpublished).',
                },
                'publishedBy': <String, Object?>{
                  'enum': <Object?>[
                    'policy',
                    'staff',
                    null,
                  ],
                },
                'blockers': <String, Object?>{
                  'type': 'array',
                  'maxItems': 20,
                  'items': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 120,
                  },
                },
                'resolvableBlockers': <String, Object?>{
                  'type': 'array',
                  'maxItems': 6,
                  'items': <String, Object?>{
                    'enum': <Object?>[
                      'missing_exact_coordinates',
                      'missing_end_time',
                      'missing_location_detail',
                      'requires_event_defaults_policy',
                      'requires_owner_safe_copy_review',
                      'duplicate_normalized_event_key',
                    ],
                  },
                },
                'automatedFindings': <String, Object?>{
                  'type': 'array',
                  'maxItems': 20,
                  'description': 'Why the publication policy left this event for staff, if it did.',
                  'items': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'check',
                      'field',
                      'match',
                    ],
                    'properties': <String, Object?>{
                      'check': <String, Object?>{
                        'enum': <Object?>[
                          'dating_framing',
                          'organizer_attribution',
                          'price_missing',
                        ],
                      },
                      'field': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 80,
                      },
                      'match': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 500,
                      },
                    },
                  },
                },
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
    },
  },
};
