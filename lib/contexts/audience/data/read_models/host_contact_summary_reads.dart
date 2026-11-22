import 'dart:convert';

import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_query.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_crm_summary.dart';
import 'package:catch_platform/firebase/live_pages.dart';
import 'package:catch_platform/firebase/scoped_read_models.dart';

/// The organizer's contact directory document: everyone's summary and the
/// per-segment counts the triggers keep.
class HostContactDirectory {
  const HostContactDirectory(this.data);

  final Map<String, dynamic> data;

  HostCrmSummary get summary =>
      HostCrmSummary.fromCallableData(data['summary']);

  /// Whether the directory counts [query]: everyone or one segment, with no
  /// search or tags.
  static bool countable(HostAudienceQuery query) =>
      HostContactSummaryReads.supports(query) &&
      HostContactSummaryReads.searchPrefix(query) == null &&
      query.manualTagIds.isEmpty &&
      query.manualTagId == null &&
      {...query.segments, ?query.segment}.length <= 1;

  /// The exact count of [query], or null when the directory cannot count it.
  int? count(HostAudienceQuery query) {
    if (!countable(query)) return null;
    final segments = {...query.segments, ?query.segment};
    return segments.isEmpty
        ? (data['summary'] as Map)['contactCount'] as int
        : ((data['segmentCounts'] as Map)[segments.single.wireValue] as int? ??
              0);
  }
}

/// The contact directory from `hostContactSummaries` and the organizer's
/// directory document. Only an intersecting filter group (segments with
/// tags) still needs the server's evaluation. A name search is a prefix
/// match on `searchName` and lists its matches by name, whatever the sort.
class HostContactSummaryReads {
  const HostContactSummaryReads(this.reader);
  final ScopedReadModelReader reader;
  static const marker = 'contactSummaryVersion';

  /// The directory document while it is listened to.
  Stream<HostContactDirectory> watchDirectory(String organizerId) => reader
      .watchActivatedReadiness(organizerId, marker)
      .map(HostContactDirectory.new);

  /// The exact count, or null when the directory cannot count this query.
  Future<int?> count(String organizerId, HostAudienceQuery query) async {
    if (!HostContactDirectory.countable(query)) return null;
    final data = await reader.activatedReadiness(organizerId, marker);
    return HostContactDirectory(data).count(query);
  }

  /// The contacts of a query [supports] accepts, [pageSize] at a time,
  /// every row shown kept live: the same filters and order as [list].
  LivePager<HostAudienceContact> watchPages(
    String organizerId, {
    required HostAudienceQuery query,
    required int pageSize,
  }) {
    final spec = _ContactQuerySpec(query);
    return reader
        .watchPages(
          collection: 'hostContactSummaries',
          scopeId: organizerId,
          orderField: spec.orderField,
          descending: spec.descending,
          pageSize: pageSize,
          arrayField: spec.arrayField,
          arrayValues: spec.arrayValues,
          prefix: spec.search,
        )
        .map((doc) => HostAudienceContact.fromMap(doc['row'] as Map));
  }

  static bool supports(HostAudienceQuery query) {
    final segments = {...query.segments, ?query.segment};
    final tags = {...query.manualTagIds, ?query.manualTagId};
    return segments.length <= 12 &&
        tags.length <= 20 &&
        (segments.isEmpty || tags.isEmpty);
  }

  /// The search as `searchName` stores names (trimmed, lower case), or null.
  static String? searchPrefix(HostAudienceQuery query) {
    final search = query.search?.trim().toLowerCase() ?? '';
    return search.isEmpty ? null : search;
  }

  /// One page of a query [supports] accepts.
  Future<HostAudiencePage> list(
    String organizerId, {
    required HostAudienceQuery query,
    required int limit,
  }) async {
    final spec = _ContactQuerySpec(query);
    final directory = await reader.activatedReadiness(organizerId, marker);
    final page = await reader.page(
      collection: 'hostContactSummaries',
      scopeId: organizerId,
      orderField: spec.orderField,
      descending: spec.descending,
      queryKey: spec.queryKey,
      limit: limit,
      arrayField: spec.arrayField,
      arrayValues: spec.arrayValues,
      prefix: spec.search,
      cursor: query.cursor,
    );
    final directoryCount = HostContactDirectory(directory).count(query);
    // One page with nothing after it is the whole match.
    final count =
        directoryCount ??
        (query.cursor == null && page.nextCursor == null
            ? page.documents.length
            : null);
    return HostAudiencePage.fromCallableData({
      'organizerId': organizerId,
      'contacts': page.documents.map((doc) => doc['row']).toList(),
      'nextCursor': page.nextCursor,
      'matchCount': count ?? page.documents.length,
      'matchCountCoverage': count == null ? 'atLeast' : 'exact',
      'manualTagVocabulary': directory['manualTagVocabulary'],
      'sourceCoverage': directory['sourceCoverage'],
      'projectionVersion': directory['projectionVersion'],
    });
  }
}

/// How one supported contact query reads `hostContactSummaries`.
class _ContactQuerySpec {
  factory _ContactQuerySpec(HostAudienceQuery query) {
    if (!HostContactSummaryReads.supports(query)) {
      throw ArgumentError('The contact directory cannot serve this query.');
    }
    final segments = {
      ...query.segments,
      ?query.segment,
    }.map((item) => item.wireValue).toList()..sort();
    final tags = {...query.manualTagIds, ?query.manualTagId}.toList()..sort();
    final search = HostContactSummaryReads.searchPrefix(query);
    final sort = search == null ? query.sort : HostAudienceSort.name;
    return _ContactQuerySpec._(
      orderField: switch (sort) {
        HostAudienceSort.lastSeen => 'lastSeenAtMillis',
        HostAudienceSort.mostAttended => 'row.attendedEventCount',
        HostAudienceSort.name => 'searchName',
      },
      descending: sort != HostAudienceSort.name,
      queryKey: jsonEncode([sort.name, segments, tags, search]),
      arrayField: segments.isNotEmpty
          ? 'row.segmentIds'
          : tags.isNotEmpty
          ? 'manualTagIds'
          : null,
      arrayValues: segments.isNotEmpty ? segments : tags,
      search: search,
    );
  }

  const _ContactQuerySpec._({
    required this.orderField,
    required this.descending,
    required this.queryKey,
    required this.arrayField,
    required this.arrayValues,
    required this.search,
  });

  final String orderField;
  final bool descending;
  final String queryKey;
  final String? arrayField;
  final List<String> arrayValues;
  final String? search;
}
