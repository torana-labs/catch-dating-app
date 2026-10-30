// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_list_cross_paths_showcase_candidates_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload for a bounded, role-gated Cross Paths showcase review queue.
final class AdminListCrossPathsShowcaseCandidatesCallableRequest {
  const AdminListCrossPathsShowcaseCandidatesCallableRequest({
    this.uid,
    this.status,
    this.marketId,
    this.cursor,
    this.limit,
  });

  final String? uid;
  final String? status;
  final String? marketId;
  final String? cursor;
  final int? limit;

  Map<String, Object?> toJson() => {
    'uid': ?uid,
    'status': ?status,
    'marketId': ?marketId,
    'cursor': ?cursor,
    'limit': ?limit,
  };
}
