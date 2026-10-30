// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/block_user_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by blockUser.
final class BlockUserCallableRequest {
  const BlockUserCallableRequest({
    required this.targetUserId,
    this.source,
    this.reasonCode,
  });

  final String targetUserId;
  final String? source;
  final String? reasonCode;

  Map<String, Object?> toJson() => {
    'targetUserId': targetUserId,
    'source': ?source,
    'reasonCode': ?reasonCode,
  };
}
