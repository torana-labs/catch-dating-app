// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/host_membership_benefit_uses.schema.json.

const schemaHostMembershipBenefitUseDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/host_membership_benefit_uses.schema.json',
  'title': 'HostMembershipBenefitUseDocument',
  'description': 'One booking made at a member price, keyed {eventId}_{uid}. Source of the member\'s savings total and of the upcoming member-priced booking cap. Readable by the member only.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'hostMembershipBenefitUses',
  'x-firestore-path': 'hostMembershipBenefitUses/{benefitUseId}',
  'x-document-id-field': 'benefitUseId',
  'x-owner': 'member-priced booking paths (signUpForFreeEvent, public paid admission)',
  'required': <Object?>[
    'schemaVersion',
    'membershipId',
    'organizerId',
    'uid',
    'eventId',
    'planId',
    'listPriceInPaise',
    'paidPriceInPaise',
    'savingsInPaise',
    'eventStartMillis',
    'state',
    'createdAtMillis',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
      'x-catch-ownership': 'server-only',
    },
    'membershipId': <String, Object?>{
      'type': 'string',
      'pattern': '^hm_[a-f0-9]{64}\$',
      'x-catch-ownership': 'server-only',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'uid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'planId': <String, Object?>{
      'type': 'string',
      'pattern': '^hmp_[A-Za-z0-9]{20}\$',
      'x-catch-ownership': 'server-only',
    },
    'listPriceInPaise': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 100000000,
      'x-catch-ownership': 'server-only',
    },
    'paidPriceInPaise': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 100000000,
      'x-catch-ownership': 'server-only',
    },
    'savingsInPaise': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 100000000,
      'x-catch-ownership': 'server-only',
    },
    'eventStartMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
      'x-catch-ownership': 'server-only',
    },
    'state': <String, Object?>{
      'enum': <Object?>[
        'booked',
        'released',
      ],
      'x-catch-ownership': 'server-only',
    },
    'createdAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
      'x-catch-ownership': 'server-only',
    },
  },
};
