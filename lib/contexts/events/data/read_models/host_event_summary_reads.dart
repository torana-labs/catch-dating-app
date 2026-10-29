import 'dart:convert';

import 'package:catch_dating_app/contexts/events/domain/private_event_setup_inventory.dart';
import 'package:catch_dating_app/hosts/data/read_models/host_summary_reader.dart';

class HostEventSummaryReads {
  const HostEventSummaryReads(this.reader);
  final HostSummaryReader reader;
  static const cursorPrefix = 'hes1_';

  Future<PrivateEventSetupInventoryPage?> list({
    required String organizerId,
    required PrivateEventSetupScope scope,
    required int limit,
    String? cursor,
  }) async {
    final directory = await reader.directory(organizerId);
    if (directory?['eventSummaryVersion'] != 1) {
      if (cursor?.startsWith(cursorPrefix) ?? false) {
        throw StateError('The event directory changed; refresh this list.');
      }
      return null;
    }
    final now = DateTime.now().millisecondsSinceEpoch;
    var asOf = now;
    String? innerCursor;
    if (cursor != null) {
      if (!cursor.startsWith(cursorPrefix)) {
        throw const FormatException('The event directory changed; refresh it.');
      }
      final Object? data = jsonDecode(
        utf8.decode(base64Url.decode(cursor.substring(cursorPrefix.length))),
      );
      if (data is! List ||
          data.length != 2 ||
          data[0] is! int ||
          data[1] is! String ||
          (data[0] as int) > now ||
          (data[0] as int) < now - const Duration(days: 1).inMilliseconds) {
        throw const FormatException('Invalid event directory cursor.');
      }
      asOf = data[0] as int;
      innerCursor = data[1] as String;
    }
    final page = await reader.page(
      collection: 'hostEventSummaries',
      organizerId: organizerId,
      orderField: 'startTimeMillis',
      descending: scope != PrivateEventSetupScope.upcoming,
      queryKey: jsonEncode([scope.name, asOf]),
      limit: limit,
      equalities: {
        'status': scope == PrivateEventSetupScope.cancelled
            ? 'cancelled'
            : 'active',
      },
      lowerInclusive: scope == PrivateEventSetupScope.upcoming ? asOf : null,
      upperExclusive: scope == PrivateEventSetupScope.past ? asOf : null,
      cursor: innerCursor,
    );
    return PrivateEventSetupInventoryPage(
      events: page.documents
          .map((doc) => PrivateEventSetupInventoryItem.fromResponse(doc['row']))
          .toList(growable: false),
      nextCursor: page.nextCursor == null
          ? null
          : '$cursorPrefix${base64Url.encode(utf8.encode(jsonEncode([asOf, page.nextCursor]))).replaceAll('=', '')}',
    );
  }
}
