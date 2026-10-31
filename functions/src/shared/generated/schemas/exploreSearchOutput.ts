/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export const exploreSearchCallableResponseSchema: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://catch.app/contracts/callable_responses/explore_search_response.schema.json",
  "title": "ExploreSearchCallableResponse",
  "description": "Callable response returned by exploreSearch.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "organizerIds",
    "eventIds"
  ],
  "properties": {
    "organizerIds": {
      "type": "array",
      "maxItems": 50,
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 256
      }
    },
    "eventIds": {
      "type": "array",
      "maxItems": 50,
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 256
      }
    }
  }
} as const;
