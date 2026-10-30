// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/event_offer_handoff_response.schema.json.

const schemaEventOfferHandoffCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/event_offer_handoff_response.schema.json',
  'title': 'EventOfferHandoffCallableResponse',
  'oneOf': <Object?>[
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'kind',
        'offerId',
        'blockers',
      ],
      'properties': <String, Object?>{
        'kind': <String, Object?>{
          'type': 'string',
          'const': 'blocked',
        },
        'offerId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'blockers': <String, Object?>{
          'type': 'array',
          'minItems': 1,
          'maxItems': 28,
          'items': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'offerUnavailable',
              'offerWithdrawn',
              'offerExpired',
              'eventMismatch',
              'eventCanceled',
              'eventArchived',
              'eventUnavailable',
              'contactMismatch',
              'sourceRevoked',
              'contactUnavailable',
              'contactOptedOut',
              'permissionUnavailable',
              'termsChanged',
              'nameMissing',
              'eventMissing',
              'eventStarted',
              'timeMissing',
              'timeZoneInvalid',
              'paymentPolicyMissing',
              'paymentModeUnsupported',
              'currencyMissing',
              'paymentLinkMissing',
              'paymentLinkInvalid',
              'paymentLinkMismatch',
              'paymentInstructionsMissing',
              'phoneMissing',
              'phoneInvalid',
              'templateInvalid',
            ],
          },
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'kind',
        'offerId',
        'contactId',
        'editableText',
        'copyText',
        'whatsappUrl',
      ],
      'properties': <String, Object?>{
        'kind': <String, Object?>{
          'type': 'string',
          'const': 'prepared',
        },
        'offerId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'contactId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'editableText': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 2000,
        },
        'copyText': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 2000,
        },
        'whatsappUrl': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 25000,
          'pattern': '^https://wa\\.me/[1-9][0-9]{7,14}\\?text=',
        },
      },
    },
  ],
};
