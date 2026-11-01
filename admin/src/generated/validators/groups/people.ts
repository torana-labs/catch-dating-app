// GENERATED FILE. Run: npm --workspace catch-admin run generate:callable-validators
import {createAdminCallableValidators} from "../adminCallableValidatorRuntime";

const ids = {
  "requestSchemaIds": {
    "adminSearchPeople": "https://catch.app/contracts/callables/admin_search_people_payload.schema.json"
  },
  "responseSchemaIds": {
    "adminSearchPeople": "https://catch.app/contracts/callable_responses/admin_search_people_response.schema.json"
  }
};
const schemaPart0 = "http://json-schema.org/draft-07/schema#";
const schemas = [{"$schema":schemaPart0,"$id":"https://catch.app/contracts/callables/admin_search_people_payload.schema.json","title":"AdminSearchPeopleCallablePayload","description":"Search people by name, phone or user id; every search is written to the admin audit log.","type":"object","additionalProperties":false,"required":["query","limit"],"properties":{"query":{"type":"string","minLength":1,"maxLength":120},"limit":{"type":"integer","minimum":1,"maximum":25}},"x-callable-aliases":["adminSearchPeople"]},
{"$schema":schemaPart0,"$id":"https://catch.app/contracts/callable_responses/admin_search_people_response.schema.json","title":"AdminSearchPeopleCallableResponse","type":"object","additionalProperties":false,"required":["kind","rows"],"properties":{"kind":{"type":"string","enum":["uid","phone","name"]},"rows":{"type":"array","maxItems":25,"items":{"type":"object","additionalProperties":false,"required":["uid","name","phone","city","deleted"],"properties":{"uid":{"type":"string","minLength":1,"maxLength":128},"name":{"anyOf":[{"type":"string","maxLength":300},{"type":"null"}]},"phone":{"anyOf":[{"type":"string","maxLength":40},{"type":"null"}]},"city":{"anyOf":[{"type":"string","maxLength":120},{"type":"null"}]},"deleted":{"type":"boolean"}}}}}}];

export const {validateAdminCallableRequest, validateAdminCallableResponse} =
  createAdminCallableValidators(schemas, ids.requestSchemaIds, ids.responseSchemaIds);
