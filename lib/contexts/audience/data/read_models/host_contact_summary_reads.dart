import 'dart:convert';

import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_query.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_crm_summary.dart';
import 'package:catch_dating_app/platform/firebase/host_summary_reader.dart';

class HostContactSummaryReads {
  const HostContactSummaryReads(this.reader);
  final HostSummaryReader reader;
  Future<HostCrmSummary?> summary(String organizerId) async {
    final data = await reader.directory(organizerId);
    if (data?['contactSummaryVersion'] != 1) return null;
    return HostCrmSummary.fromCallableData(data!['summary']);
  }

  Future<int?> count(String organizerId, HostAudienceQuery query) async {
    if (!supports(query)) return null;
    final segments = {...query.segments, ?query.segment};
    final tags = {...query.manualTagIds, ?query.manualTagId};
    if (tags.isNotEmpty || segments.length > 1) return null;
    final data = await reader.directory(organizerId);
    if (data?['contactSummaryVersion'] != 1) return null;
    return segments.isEmpty
        ? (data!['summary'] as Map)['contactCount'] as int
        : ((data!['segmentCounts'] as Map)[segments.single.wireValue] as int? ??
              0);
  }

  static bool supports(HostAudienceQuery query) {
    final segments = {...query.segments, ?query.segment};
    final tags = {...query.manualTagIds, ?query.manualTagId};
    return segments.length <= 12 &&
        tags.length <= 20 &&
        (segments.isEmpty || tags.isEmpty) &&
        (query.search?.trim().isEmpty ?? true);
  }

  Future<HostAudiencePage?> list(
    String organizerId, {
    required HostAudienceQuery query,
    required int limit,
  }) async {
    if (!supports(query)) return null;
    final directory = await reader.directory(organizerId);
    if (directory?['contactSummaryVersion'] != 1) {
      if (query.cursor?.startsWith(HostSummaryCursor.prefix) ?? false) {
        throw StateError('The audience changed; refresh this list.');
      }
      return null;
    }
    final segments = {
      ...query.segments,
      ?query.segment,
    }.map((item) => item.wireValue).toList()..sort();
    final tags = {...query.manualTagIds, ?query.manualTagId}.toList()..sort();
    final orderField = switch (query.sort) {
      HostAudienceSort.lastSeen => 'lastSeenAtMillis',
      HostAudienceSort.mostAttended => 'row.attendedEventCount',
      HostAudienceSort.name => 'searchName',
    };
    final page = await reader.page(
      collection: 'hostContactSummaries',
      organizerId: organizerId,
      orderField: orderField,
      descending: query.sort != HostAudienceSort.name,
      queryKey: jsonEncode([query.sort.name, segments, tags]),
      limit: limit,
      arrayField: segments.isNotEmpty
          ? 'row.segmentIds'
          : tags.isNotEmpty
          ? 'manualTagIds'
          : null,
      arrayValues: segments.isNotEmpty ? segments : tags,
      cursor: query.cursor,
    );
    final counts = directory!['segmentCounts'] as Map;
    final int? count = segments.length == 1
        ? (counts[segments.single] as int? ?? 0)
        : segments.isEmpty && tags.isEmpty
        ? (directory['summary'] as Map)['contactCount'] as int
        : null;
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
