// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/organizer_campaign_action_payload.schema.json.

const schemaOrganizerCampaignActionCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/organizer_campaign_action_payload.schema.json',
  'title': 'OrganizerCampaignActionCallablePayload',
  'description': 'Revision-bound campaign preview, approval, dispatch, cancellation or report request.',
  'x-callable-aliases': <Object?>[
    'previewOrganizerCampaign',
    'approveOrganizerCampaign',
    'dispatchOrganizerCampaign',
    'cancelOrganizerCampaign',
    'getOrganizerCampaignReport',
  ],
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'campaignId',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'campaignId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'expectedRevision': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 1,
      'maximum': 9007199254740991,
    },
  },
};
