// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_update_club_details_payload.schema.json.

const schemaAdminUpdateClubDetailsCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_update_club_details_payload.schema.json',
  'title': 'AdminUpdateClubDetailsCallablePayload',
  'description': 'Callable payload accepted by adminUpdateClubDetails. This edits owner-safe organizer listing fields through an audited admin callable.',
  'x-callable-shape': 'patch',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'clubId',
    'fields',
  ],
  'properties': <String, Object?>{
    'clubId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'fields': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'minProperties': 1,
      'properties': <String, Object?>{
        'name': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
        },
        'description': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 2000,
        },
        'location': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
          'pattern': '^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*\$',
        },
        'area': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
        },
        'tags': <String, Object?>{
          'type': 'array',
          'maxItems': 20,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 80,
          },
        },
        'instagramHandle': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 320,
        },
        'phoneNumber': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 320,
        },
        'email': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 320,
        },
        'imageUrl': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'format': 'uri',
              'maxLength': 2048,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'profileImageUrl': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'format': 'uri',
              'maxLength': 2048,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'organizerType': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'club',
            'community',
            'individual',
            'eventProducer',
            'venue',
            'brand',
          ],
          'description': 'Canonical organizer classification. Club is one organizer subtype; missing legacy values normalize to club during migration.',
        },
        'publicCategoryLabel': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 120,
        },
        'entityKind': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'club',
            'venue',
            'eventOrganizer',
            'creatorCommunity',
            'brand',
          ],
        },
        'entitySubtypes': <String, Object?>{
          'type': 'array',
          'maxItems': 20,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 80,
          },
        },
        'displayCategory': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 120,
        },
        'cityName': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 120,
        },
        'regionName': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 120,
        },
        'countryCode': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'pattern': '^[A-Z]{2}\$',
        },
        'countryName': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 120,
        },
        'appVisibility': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'discoverable',
            'hidden',
          ],
        },
        'publicPage': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'minProperties': 1,
          'properties': <String, Object?>{
            'slug': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[a-z0-9-]+\$',
            },
            'citySlug': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'minLength': 1,
              'maxLength': 80,
              'pattern': '^[a-z0-9-]+\$',
            },
            'canonicalPath': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 240,
            },
            'publishStatus': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'draft',
                'qa',
                'published',
                'suppressed',
                'removed',
              ],
            },
            'seoTitle': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'maxLength': 120,
            },
            'seoDescription': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'maxLength': 320,
            },
          },
        },
        'provenance': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'minProperties': 1,
          'properties': <String, Object?>{
            'sourceConfidence': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'seedOnly',
                'low',
                'medium',
                'high',
                'ownerVerified',
              ],
            },
            'verificationStatus': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'unverified',
                'sourceBacked',
                'ownerVerified',
              ],
            },
          },
        },
        'ownerLinks': <String, Object?>{
          'type': 'array',
          'maxItems': 20,
          'description': 'Replaces the organizer page links, in display order. An empty array removes them.',
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'description': 'An owner link as an admin edit sends it. showUntil is an ISO date-time; the server checks the URL against the owner-link policy before saving.',
            'required': <Object?>[
              'id',
              'label',
              'subtitle',
              'url',
              'icon',
              'pinned',
              'showUntil',
            ],
            'properties': <String, Object?>{
              'id': <String, Object?>{
                'type': 'string',
                'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,179}\$',
              },
              'label': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 80,
              },
              'subtitle': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'minLength': 1,
                'maxLength': 80,
              },
              'url': <String, Object?>{
                'type': 'string',
                'format': 'uri',
                'maxLength': 4096,
                'pattern': '^https://',
              },
              'icon': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'enum': <Object?>[
                  'link',
                  'website',
                  'community',
                  'social',
                  'tickets',
                  'calendar',
                  'shop',
                  'partner',
                  'video',
                  'route',
                  null,
                ],
                'description': 'What an owner link is for, which picks its icon. Null lets the page infer one from the URL.',
              },
              'pinned': <String, Object?>{
                'type': 'boolean',
              },
              'showUntil': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'format': 'date-time',
              },
            },
          },
        },
        'publicProfile': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'minProperties': 1,
          'properties': <String, Object?>{
            'headline': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'maxLength': 160,
            },
            'summary': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'maxLength': 800,
            },
            'sourceSummary': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'maxLength': 800,
            },
            'formats': <String, Object?>{
              'type': 'array',
              'maxItems': 12,
              'items': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 80,
              },
            },
          },
        },
      },
    },
    'reviewNote': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 1000,
    },
  },
};
