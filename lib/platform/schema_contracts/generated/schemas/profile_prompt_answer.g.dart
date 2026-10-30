// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from embedded/profile_prompt_answer.schema.json.

const schemaProfilePromptAnswerSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/embedded/profile_prompt_answer.schema.json',
  'title': 'ProfilePromptAnswer',
  'description': 'One structured written profile prompt answer stored on users and publicProfiles.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'promptId',
    'prompt',
    'answer',
  ],
  'properties': <String, Object?>{
    'promptId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 80,
    },
    'prompt': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 140,
    },
    'answer': <String, Object?>{
      'type': 'string',
      'maxLength': 300,
    },
  },
  'x-catch-catalog': '../catalogs/profile_prompts.json',
};
