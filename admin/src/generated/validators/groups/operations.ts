// GENERATED FILE. Run: npm --workspace catch-admin run generate:callable-validators
import {createAdminCallableValidators} from "../adminCallableValidatorRuntime";

const ids = {
  "requestSchemaIds": {
    "adminListActionExecutions": "https://catch.app/contracts/callables/admin_list_action_executions_payload.schema.json"
  },
  "responseSchemaIds": {
    "adminListActionExecutions": "https://catch.app/contracts/callable_responses/admin_list_action_executions_response.schema.json"
  }
};
const schemaPart0 = "http://json-schema.org/draft-07/schema#";
const schemas = [{"$schema":schemaPart0,"$id":"https://catch.app/contracts/callables/admin_list_action_executions_payload.schema.json","title":"AdminListActionExecutionsCallablePayload","type":"object","additionalProperties":false,"properties":{"limit":{"type":"integer","minimum":1,"maximum":100},"cursor":{"type":["string","null"],"maxLength":1000}}},
{"$schema":schemaPart0,"$id":"https://catch.app/contracts/callable_responses/admin_list_action_executions_response.schema.json","title":"AdminListActionExecutionsCallableResponse","type":"object","additionalProperties":false,"required":["schemaVersion","generatedAt","rows","nextCursor"],"properties":{"schemaVersion":{"const":1},"generatedAt":{"type":"string","format":"date-time"},"rows":{"type":"array","maxItems":100,"items":{"$ref":"#/definitions/execution"}},"nextCursor":{"type":["string","null"],"maxLength":1000}},"definitions":{"execution":{"type":"object","additionalProperties":false,"required":["schemaVersion","executionId","actionId","callable","actorUid","actorRoles","status","requestHash","responseHash","target","errorCode","errorMessage","cliVersion","startedAt","finishedAt","updatedAt"],"properties":{"schemaVersion":{"const":1},"executionId":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"},"actionId":{"type":"string","minLength":1,"maxLength":120},"callable":{"type":"string","pattern":"^admin[A-Z][A-Za-z0-9]+$"},"actorUid":{"type":"string","minLength":1,"maxLength":128},"actorRoles":{"type":"array","uniqueItems":true,"items":{"enum":["admin","adminOwner","safetyReviewer","support","salesStaff"]}},"status":{"enum":["started","succeeded","failed","indeterminate"]},"requestHash":{"type":"string","pattern":"^[0-9a-f]{64}$"},"responseHash":{"type":["string","null"],"pattern":"^[0-9a-f]{64}$"},"target":{"type":["string","null"],"maxLength":500},"errorCode":{"type":["string","null"],"maxLength":120},"errorMessage":{"type":["string","null"],"maxLength":500},"cliVersion":{"type":["string","null"],"maxLength":80},"startedAt":{"type":"string","format":"date-time"},"finishedAt":{"type":["string","null"],"format":"date-time"},"updatedAt":{"type":"string","format":"date-time"}}}}}];

export const {validateAdminCallableRequest, validateAdminCallableResponse} =
  createAdminCallableValidators(schemas, ids.requestSchemaIds, ids.responseSchemaIds);
