// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_list_organizer_directory_payload.schema.json.
// Re-exported by lib/platform/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by adminListOrganizerDirectory, the Admin Organizers directory. view picks one of the directory's views; the other fields narrow it. mine keeps organizers whose Sales account the caller owns. cursor is the opaque nextCursor of the previous page.
final class AdminListOrganizerDirectoryCallableRequest {
  const AdminListOrganizerDirectoryCallableRequest({
    this.view,
    this.query,
    this.citySlug,
    this.kind,
    this.claimState,
    this.mine,
    this.cursor,
    this.limit,
  });

  final String? view;
  final String? query;
  final String? citySlug;
  final String? kind;
  final String? claimState;
  final bool? mine;
  final String? cursor;
  final int? limit;

  Map<String, Object?> toJson() => {
    'view': ?view,
    'query': ?query,
    'citySlug': ?citySlug,
    'kind': ?kind,
    'claimState': ?claimState,
    'mine': ?mine,
    'cursor': ?cursor,
    'limit': ?limit,
  };
}
