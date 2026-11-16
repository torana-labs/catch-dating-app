import 'dart:convert';

import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_query.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_crm_summary.dart';
import 'package:catch_platform/firebase/host_summary_reader.dart';

/// The contact directory from `hostContactSummaries` and the organizer's
/// directory document. Only an intersecting filter group (segments with
/// tags) still needs the server's evaluation. A name search is a prefix
/// match on `searchName` and lists its matches by name, whatever the sort.
class HostContactSummaryReads {
  const HostContactSummaryReads(this.reader);
  final HostSummaryReader reader;
  static const marker = 'contactSummaryVersion';

  Future<HostCrmSummary> summary(String organizerId) async {
    final data = await reader.activatedDirectory(organizerId, marker);
    return HostCrmSummary.fromCallableData(data['summary']);
  }

  /// The exact count, or null when the directory cannot count this query.
  Future<int?> count(String organizerId, HostAudienceQuery query) async {
    if (!supports(query) || searchPrefix(query) != null) return null;
    final segments = {...query.segments, ?query.segment};
    final tags = {...query.manualTagIds, ?query.manualTagId};
    if (tags.isNotEmpty || segments.length > 1) return null;
    final data = await reader.activatedDirectory(organizerId, marker);
    return segments.isEmpty
        ? (data['summary'] as Map)['contactCount'] as int
        : ((data['segmentCounts'] as Map)[segments.single.wireValue] as int? ??
              0);
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
    if (!supports(query)) {
      throw ArgumentError('The contact directory cannot serve this query.');
    }
    final directory = await reader.activatedDirectory(organizerId, marker);
    final segments = {
      ...query.segments,
      ?query.segment,
    }.map((item) => item.wireValue).toList()..sort();
    final tags = {...query.manualTagIds, ?query.manualTagId}.toList()..sort();
    final search = searchPrefix(query);
    final sort = search == null ? query.sort : HostAudienceSort.name;
    final orderField = switch (sort) {
      HostAudienceSort.lastSeen => 'lastSeenAtMillis',
      HostAudienceSort.mostAttended => 'row.attendedEventCount',
      HostAudienceSort.name => 'searchName',
    };
    final page = await reader.page(
      collection: 'hostContactSummaries',
      organizerId: organizerId,
      orderField: orderField,
      descending: sort != HostAudienceSort.name,
      queryKey: jsonEncode([sort.name, segments, tags, search]),
      limit: limit,
      arrayField: segments.isNotEmpty
          ? 'row.segmentIds'
          : tags.isNotEmpty
          ? 'manualTagIds'
          : null,
      arrayValues: segments.isNotEmpty ? segments : tags,
      prefix: search,
      cursor: query.cursor,
    );
    final counts = directory['segmentCounts'] as Map;
    final int? directoryCount = search != null
        ? null
        : segments.length == 1
        ? (counts[segments.single] as int? ?? 0)
        : segments.isEmpty && tags.isEmpty
        ? (directory['summary'] as Map)['contactCount'] as int
        : null;
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
