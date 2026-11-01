// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_list_event_directory_payload.schema.json.
// Re-exported by lib/platform/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by adminListEventDirectory, the Admin Events directory. Events made in Catch and events imported from other platforms are one table; source narrows it to one of them. needsCheck keeps imported events not yet public; thisWeek keeps events starting in the next seven days. cursor is the opaque nextCursor of the previous page.
final class AdminListEventDirectoryCallableRequest {
  const AdminListEventDirectoryCallableRequest({
    this.view,
    this.query,
    this.citySlug,
    this.source,
    this.organizerId,
    this.needsCheck,
    this.thisWeek,
    this.cursor,
    this.limit,
  });

  final String? view;
  final String? query;
  final String? citySlug;
  final String? source;
  final String? organizerId;
  final bool? needsCheck;
  final bool? thisWeek;
  final String? cursor;
  final int? limit;

  Map<String, Object?> toJson() => {
    'view': ?view,
    'query': ?query,
    'citySlug': ?citySlug,
    'source': ?source,
    'organizerId': ?organizerId,
    'needsCheck': ?needsCheck,
    'thisWeek': ?thisWeek,
    'cursor': ?cursor,
    'limit': ?limit,
  };
}
