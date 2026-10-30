// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/config_cities.schema.json.

const schemaConfigCitiesDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/config_cities.schema.json',
  'title': 'ConfigCitiesDocument',
  'description': 'Public launch-market configuration stored at config/cities. The app picks from launched markets; canonical market ids disambiguate same-name cities globally.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'config_cities',
  'x-firestore-path': 'config/cities',
  'x-document-id-field': 'cities',
  'x-owner': 'admin city configuration tooling',
  'required': <Object?>[
    'version',
    'cityNames',
    'marketIds',
    'launchMarketIds',
    'cities',
    'markets',
  ],
  'definitions': <String, Object?>{
    'launchStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'launched',
        'planned',
        'paused',
        'retired',
      ],
    },
    'cityPickerMarket': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'name',
        'cityId',
        'marketId',
        'slug',
        'label',
        'latitude',
        'longitude',
        'countryIsoCode',
        'currencyCode',
        'dialCode',
        'timeZone',
        'launchStatus',
        'profileSelectable',
        'hostCreatable',
        'eventCreatable',
        'exploreVisible',
      ],
      'properties': <String, Object?>{
        'name': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
          'pattern': '^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*\$',
          'description': 'App-facing selection id. Kept as name for existing CityData JSON, but stores the canonical market id.',
        },
        'cityId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
          'pattern': '^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*\$',
        },
        'marketId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
          'pattern': '^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*\$',
        },
        'slug': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 80,
          'pattern': '^[a-z0-9-]+\$',
        },
        'label': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 80,
        },
        'latitude': <String, Object?>{
          'type': 'number',
          'minimum': -90,
          'maximum': 90,
        },
        'longitude': <String, Object?>{
          'type': 'number',
          'minimum': -180,
          'maximum': 180,
        },
        'countryIsoCode': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Z]{2}\$',
        },
        'currencyCode': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Z]{3}\$',
        },
        'dialCode': <String, Object?>{
          'type': 'string',
          'pattern': '^\\+\\d{1,4}\$',
        },
        'timeZone': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 80,
        },
        'launchStatus': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'launched',
            'planned',
            'paused',
            'retired',
          ],
        },
        'profileSelectable': <String, Object?>{
          'type': 'boolean',
        },
        'hostCreatable': <String, Object?>{
          'type': 'boolean',
        },
        'eventCreatable': <String, Object?>{
          'type': 'boolean',
        },
        'exploreVisible': <String, Object?>{
          'type': 'boolean',
        },
      },
    },
    'canonicalMarket': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'marketId',
        'cityId',
        'slug',
        'label',
        'cityLabel',
        'regionCode',
        'regionName',
        'countryIsoCode',
        'countryName',
        'currencyCode',
        'dialCode',
        'timeZone',
        'latitude',
        'longitude',
        'aliases',
        'launchStatus',
        'profileSelectable',
        'hostCreatable',
        'eventCreatable',
        'exploreVisible',
      ],
      'properties': <String, Object?>{
        'marketId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
          'pattern': '^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*\$',
        },
        'cityId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
          'pattern': '^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*\$',
        },
        'slug': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 80,
          'pattern': '^[a-z0-9-]+\$',
        },
        'label': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 80,
        },
        'cityLabel': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 80,
        },
        'regionCode': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 16,
          'pattern': '^[A-Z0-9-]+\$',
        },
        'regionName': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
        },
        'countryIsoCode': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Z]{2}\$',
        },
        'countryName': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
        },
        'currencyCode': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Z]{3}\$',
        },
        'dialCode': <String, Object?>{
          'type': 'string',
          'pattern': '^\\+\\d{1,4}\$',
        },
        'timeZone': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 80,
        },
        'latitude': <String, Object?>{
          'type': 'number',
          'minimum': -90,
          'maximum': 90,
        },
        'longitude': <String, Object?>{
          'type': 'number',
          'minimum': -180,
          'maximum': 180,
        },
        'aliases': <String, Object?>{
          'type': 'array',
          'maxItems': 40,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 80,
            'pattern': '^[a-z0-9-]+\$',
          },
        },
        'launchStatus': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'launched',
            'planned',
            'paused',
            'retired',
          ],
        },
        'profileSelectable': <String, Object?>{
          'type': 'boolean',
        },
        'hostCreatable': <String, Object?>{
          'type': 'boolean',
        },
        'eventCreatable': <String, Object?>{
          'type': 'boolean',
        },
        'exploreVisible': <String, Object?>{
          'type': 'boolean',
        },
      },
    },
  },
  'properties': <String, Object?>{
    'version': <String, Object?>{
      'type': 'integer',
      'minimum': 2,
    },
    'cityNames': <String, Object?>{
      'type': 'array',
      'description': 'Compatibility whitelist used by Firestore rules. Values are launched canonical market ids, not display city names.',
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 120,
        'pattern': '^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*\$',
      },
      'minItems': 1,
      'uniqueItems': true,
      'x-catch-ownership': 'server-only',
    },
    'marketIds': <String, Object?>{
      'type': 'array',
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 120,
        'pattern': '^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*\$',
      },
      'minItems': 1,
      'uniqueItems': true,
      'x-catch-ownership': 'server-only',
    },
    'launchMarketIds': <String, Object?>{
      'type': 'array',
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 120,
        'pattern': '^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*\$',
      },
      'minItems': 1,
      'uniqueItems': true,
      'x-catch-ownership': 'server-only',
    },
    'cities': <String, Object?>{
      'type': 'array',
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'name',
          'cityId',
          'marketId',
          'slug',
          'label',
          'latitude',
          'longitude',
          'countryIsoCode',
          'currencyCode',
          'dialCode',
          'timeZone',
          'launchStatus',
          'profileSelectable',
          'hostCreatable',
          'eventCreatable',
          'exploreVisible',
        ],
        'properties': <String, Object?>{
          'name': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
            'pattern': '^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*\$',
            'description': 'App-facing selection id. Kept as name for existing CityData JSON, but stores the canonical market id.',
          },
          'cityId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
            'pattern': '^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*\$',
          },
          'marketId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
            'pattern': '^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*\$',
          },
          'slug': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 80,
            'pattern': '^[a-z0-9-]+\$',
          },
          'label': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 80,
          },
          'latitude': <String, Object?>{
            'type': 'number',
            'minimum': -90,
            'maximum': 90,
          },
          'longitude': <String, Object?>{
            'type': 'number',
            'minimum': -180,
            'maximum': 180,
          },
          'countryIsoCode': <String, Object?>{
            'type': 'string',
            'pattern': '^[A-Z]{2}\$',
          },
          'currencyCode': <String, Object?>{
            'type': 'string',
            'pattern': '^[A-Z]{3}\$',
          },
          'dialCode': <String, Object?>{
            'type': 'string',
            'pattern': '^\\+\\d{1,4}\$',
          },
          'timeZone': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 80,
          },
          'launchStatus': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'launched',
              'planned',
              'paused',
              'retired',
            ],
          },
          'profileSelectable': <String, Object?>{
            'type': 'boolean',
          },
          'hostCreatable': <String, Object?>{
            'type': 'boolean',
          },
          'eventCreatable': <String, Object?>{
            'type': 'boolean',
          },
          'exploreVisible': <String, Object?>{
            'type': 'boolean',
          },
        },
      },
      'uniqueItems': true,
      'x-catch-ownership': 'server-only',
    },
    'markets': <String, Object?>{
      'type': 'array',
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'marketId',
          'cityId',
          'slug',
          'label',
          'cityLabel',
          'regionCode',
          'regionName',
          'countryIsoCode',
          'countryName',
          'currencyCode',
          'dialCode',
          'timeZone',
          'latitude',
          'longitude',
          'aliases',
          'launchStatus',
          'profileSelectable',
          'hostCreatable',
          'eventCreatable',
          'exploreVisible',
        ],
        'properties': <String, Object?>{
          'marketId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
            'pattern': '^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*\$',
          },
          'cityId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
            'pattern': '^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*\$',
          },
          'slug': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 80,
            'pattern': '^[a-z0-9-]+\$',
          },
          'label': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 80,
          },
          'cityLabel': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 80,
          },
          'regionCode': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 16,
            'pattern': '^[A-Z0-9-]+\$',
          },
          'regionName': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
          },
          'countryIsoCode': <String, Object?>{
            'type': 'string',
            'pattern': '^[A-Z]{2}\$',
          },
          'countryName': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
          },
          'currencyCode': <String, Object?>{
            'type': 'string',
            'pattern': '^[A-Z]{3}\$',
          },
          'dialCode': <String, Object?>{
            'type': 'string',
            'pattern': '^\\+\\d{1,4}\$',
          },
          'timeZone': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 80,
          },
          'latitude': <String, Object?>{
            'type': 'number',
            'minimum': -90,
            'maximum': 90,
          },
          'longitude': <String, Object?>{
            'type': 'number',
            'minimum': -180,
            'maximum': 180,
          },
          'aliases': <String, Object?>{
            'type': 'array',
            'maxItems': 40,
            'uniqueItems': true,
            'items': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 80,
              'pattern': '^[a-z0-9-]+\$',
            },
          },
          'launchStatus': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'launched',
              'planned',
              'paused',
              'retired',
            ],
          },
          'profileSelectable': <String, Object?>{
            'type': 'boolean',
          },
          'hostCreatable': <String, Object?>{
            'type': 'boolean',
          },
          'eventCreatable': <String, Object?>{
            'type': 'boolean',
          },
          'exploreVisible': <String, Object?>{
            'type': 'boolean',
          },
        },
      },
      'minItems': 1,
      'uniqueItems': true,
      'x-catch-ownership': 'server-only',
    },
  },
};
