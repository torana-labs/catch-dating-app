// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/submit_event_assistance_guest_choice_payload.schema.json.

const schemaSubmitEventAssistanceGuestChoiceCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/submit_event_assistance_guest_choice_payload.schema.json',
  'title': 'SubmitEventAssistanceGuestChoiceCallablePayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'linkId',
    'secret',
    'intentId',
    'intentRevision',
    'expectedGuestRevision',
    'choiceId',
    'requestId',
  ],
  'properties': <String, Object?>{
    'linkId': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{32}\$',
    },
    'secret': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{43}\$',
    },
    'intentId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'intentRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'expectedGuestRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'choiceId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
  },
};
