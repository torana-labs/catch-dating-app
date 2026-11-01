// GENERATED FILE. Run: npm --workspace catch-admin run generate:callable-validators
import {createAdminCallableValidators} from "../adminCallableValidatorRuntime";

const ids = {
  "requestSchemaIds": {
    "adminGetSafetySettings": "https://catch.app/contracts/callables/admin_get_safety_settings_payload.schema.json",
    "adminUpdateSafetySettings": "https://catch.app/contracts/callables/admin_update_safety_settings_payload.schema.json"
  },
  "responseSchemaIds": {
    "adminGetSafetySettings": "https://catch.app/contracts/callable_responses/admin_get_safety_settings_response.schema.json",
    "adminUpdateSafetySettings": "https://catch.app/contracts/admin_runtime/adminUpdateSafetySettings_response.schema.json"
  }
};
const schemaPart0 = "http://json-schema.org/draft-07/schema#";
const schemaPart1 = {"code":{"type":"string","pattern":"^[a-z][a-z0-9_]{1,63}$"},"label":{"type":"string","minLength":1,"maxLength":80},"severe":{"type":"boolean"},"takedown":{"type":"boolean"},"active":{"type":"boolean"}};
const schemaPart2 = {"type":"object","additionalProperties":false,"required":["code","label","severe","takedown","active"],"properties":schemaPart1};
const schemaPart3 = {"type":"array","minItems":1,"maxItems":40,"items":schemaPart2};
const schemas = [{"$schema":schemaPart0,"$id":"https://catch.app/contracts/callables/admin_get_safety_settings_payload.schema.json","title":"AdminGetSafetySettingsCallablePayload","description":"Reads Settings → Safety: the report reasons, the rules, the deadlines, who may take each step and how long case records are kept.","type":"object","additionalProperties":false,"required":[],"properties":{},"x-callable-aliases":["adminGetSafetySettings"]},
{"$schema":schemaPart0,"$id":"https://catch.app/contracts/callable_responses/admin_get_safety_settings_response.schema.json","title":"AdminGetSafetySettingsCallableResponse","type":"object","additionalProperties":false,"required":["settings","deadlines","stepRoles","retentionDaysAfterDeletion"],"properties":{"settings":{"type":"object","additionalProperties":false,"required":["reasons","restrictOnSevereReport","organizerBlockLists","organizerReports","updatedAtMillis","updatedByUid"],"properties":{"reasons":schemaPart3,"restrictOnSevereReport":{"type":"boolean"},"organizerBlockLists":{"type":"boolean"},"organizerReports":{"type":"boolean"},"updatedAtMillis":{"type":["integer","null"],"minimum":0},"updatedByUid":{"type":["string","null"],"maxLength":128}}},"deadlines":{"type":"object","additionalProperties":false,"required":["acknowledge","firstLookHours","resolveDays","takedownHours"],"properties":{"acknowledge":{"type":"string","enum":["immediately"]},"firstLookHours":{"type":"integer","minimum":1},"resolveDays":{"type":"integer","minimum":1},"takedownHours":{"type":"integer","minimum":1}}},"stepRoles":{"type":"object","additionalProperties":false,"required":["warn","restrict","suspend","ban"],"properties":{"warn":{"type":"string","enum":["ops","owner"]},"restrict":{"type":"string","enum":["ops","owner"]},"suspend":{"type":"string","enum":["ops","owner"]},"ban":{"type":"string","enum":["ops","owner"]}}},"retentionDaysAfterDeletion":{"type":"integer","minimum":1}}},
{"$schema":schemaPart0,"$id":"https://catch.app/contracts/callables/admin_update_safety_settings_payload.schema.json","title":"AdminUpdateSafetySettingsCallablePayload","description":"Owner-only. Replaces the report reasons and the safety rules. Reason codes already used on reports keep their meaning, so a reason is switched off (active false) rather than removed.","type":"object","additionalProperties":false,"required":["reasons","restrictOnSevereReport","organizerBlockLists","organizerReports"],"properties":{"reasons":schemaPart3,"restrictOnSevereReport":{"type":"boolean"},"organizerBlockLists":{"type":"boolean"},"organizerReports":{"type":"boolean"}},"x-callable-aliases":["adminUpdateSafetySettings"]},
{"$id":"https://catch.app/contracts/admin_runtime/adminUpdateSafetySettings_response.schema.json","type":"object","additionalProperties":true}];

export const {validateAdminCallableRequest, validateAdminCallableResponse} =
  createAdminCallableValidators(schemas, ids.requestSchemaIds, ids.responseSchemaIds);
