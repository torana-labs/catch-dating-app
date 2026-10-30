// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_create_marketing_content_draft_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class AdminCreateMarketingContentDraftCallableRequest {
  const AdminCreateMarketingContentDraftCallableRequest({
    required this.draftType,
    this.cityId,
    this.weekStart,
    this.sourceRecommendationSetId,
    this.title,
  });

  final String draftType;
  final String? cityId;
  final String? weekStart;
  final String? sourceRecommendationSetId;
  final String? title;

  Map<String, Object?> toJson() => {
    'draftType': draftType,
    'cityId': ?cityId,
    'weekStart': ?weekStart,
    'sourceRecommendationSetId': ?sourceRecommendationSetId,
    'title': ?title,
  };
}
