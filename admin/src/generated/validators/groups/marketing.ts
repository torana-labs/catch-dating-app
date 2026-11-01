// GENERATED FILE. Run: npm --workspace catch-admin run generate:callable-validators
import {createAdminCallableValidators} from "../adminCallableValidatorRuntime";

const ids = {
  "requestSchemaIds": {
    "adminCreateMarketingContentDraft": "https://catch.app/contracts/callables/admin_create_marketing_content_draft_payload.schema.json",
    "adminGetMarketingOpsDashboard": "https://catch.app/contracts/callables/admin_get_marketing_ops_dashboard_payload.schema.json",
    "adminRecordMarketingReviewDecision": "https://catch.app/contracts/callables/admin_record_marketing_review_decision_payload.schema.json"
  },
  "responseSchemaIds": {
    "adminCreateMarketingContentDraft": "https://catch.app/contracts/callable_responses/admin_create_marketing_content_draft_response.schema.json",
    "adminGetMarketingOpsDashboard": "https://catch.app/contracts/admin_runtime/adminGetMarketingOpsDashboard_response.schema.json",
    "adminRecordMarketingReviewDecision": "https://catch.app/contracts/callable_responses/admin_record_marketing_review_decision_response.schema.json"
  }
};
const schemaPart0 = "http://json-schema.org/draft-07/schema#";
const schemaPart1 = ["source_profile","query_template","run_plan","source_result","event_candidate","recommendation_item","recommendation_set","content_draft"];
const schemaPart2 = {"type":"string","enum":schemaPart1};
const schemaPart3 = {"type":"string","enum":["approve","needs_changes","hold","reject","export_ready"]};
const schemas = [{"$schema":schemaPart0,"$id":"https://catch.app/contracts/callables/admin_create_marketing_content_draft_payload.schema.json","type":"object","additionalProperties":false,"required":["draftType"],"properties":{"draftType":{"type":"string","enum":["event_highlights","feature_explainer"]},"cityId":{"anyOf":[{"type":"string","pattern":"^[a-z0-9-]{2,60}$"},{"type":"null"}]},"weekStart":{"anyOf":[{"type":"string","format":"date"},{"type":"null"}]},"sourceRecommendationSetId":{"anyOf":[{"type":"string","minLength":1,"maxLength":180},{"type":"null"}]},"title":{"anyOf":[{"type":"string","minLength":1,"maxLength":140},{"type":"null"}]}}},
{"$schema":schemaPart0,"$id":"https://catch.app/contracts/callable_responses/admin_create_marketing_content_draft_response.schema.json","type":"object","additionalProperties":false,"required":["draft","bridge","dashboardPath"],"properties":{"draft":{"type":"object","minProperties":1,"additionalProperties":true},"bridge":{"type":"object","minProperties":1,"additionalProperties":true},"dashboardPath":{"type":"string","minLength":1,"maxLength":260}}},
{"$schema":schemaPart0,"$id":"https://catch.app/contracts/callables/admin_get_marketing_ops_dashboard_payload.schema.json","type":"object","additionalProperties":false},
{"$schema":schemaPart0,"$id":"https://catch.app/contracts/callables/admin_record_marketing_review_decision_payload.schema.json","type":"object","additionalProperties":false,"required":["targetType","targetId","decision","note"],"properties":{"targetType":schemaPart2,"targetId":{"type":"string","minLength":1,"maxLength":500},"decision":schemaPart3,"runId":{"anyOf":[{"type":"string","minLength":1,"maxLength":180},{"type":"null"}]},"note":{"type":"string","minLength":1,"maxLength":2000},"edits":{"type":"object","additionalProperties":true},"checklist":{"$ref":"#/definitions/checklist"}},"definitions":{"checklist":{"type":"object","additionalProperties":false,"properties":{"sourceReviewed":{"type":"boolean"},"dateReviewed":{"type":"boolean"},"venueReviewed":{"type":"boolean"},"copyReviewed":{"type":"boolean"},"rightsReviewed":{"type":"boolean"},"noCatchHostingImplied":{"type":"boolean"}}}}},
{"$schema":schemaPart0,"$id":"https://catch.app/contracts/callable_responses/admin_record_marketing_review_decision_response.schema.json","type":"object","additionalProperties":false,"required":["decisionId","targetType","targetId","decision","decisionStatus","decisionPath"],"properties":{"decisionId":{"type":"string","minLength":1,"maxLength":150},"targetType":schemaPart2,"targetId":{"type":"string","minLength":1,"maxLength":500},"decision":schemaPart3,"decisionStatus":{"type":"string","enum":["approved","needs_changes","held","rejected","export_ready"]},"decisionPath":{"type":"string","pattern":"^marketingReviewDecisions/[^/]+$","maxLength":260}}},
{"$id":"https://catch.app/contracts/admin_runtime/adminGetMarketingOpsDashboard_response.schema.json","type":"object","additionalProperties":true}];

export const {validateAdminCallableRequest, validateAdminCallableResponse} =
  createAdminCallableValidators(schemas, ids.requestSchemaIds, ids.responseSchemaIds);
